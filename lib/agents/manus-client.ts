export type ManusMode = "live" | "demo";

const MANUS_API_BASE = (process.env.MANUS_API_BASE ?? "https://api.manus.ai").replace(/\/$/, "");
const MANUS_TIMEOUT_MS = Number(process.env.MANUS_TIMEOUT_MS ?? "90000");
const MANUS_POLL_MS = Number(process.env.MANUS_POLL_MS ?? "3000");
const LIVE_MANUS_ENABLED = process.env.BRANDPILOT_LIVE_MANUS === "true";

const KNOWN_BRAND_URLS: Record<string, string> = {
  atoms: "https://atoms.dev",
  vercel: "https://vercel.com",
};

export function isManusConfigured(): boolean {
  return LIVE_MANUS_ENABLED && Boolean(process.env.MANUS_API_KEY?.trim());
}

export function isManusDemoMode(): boolean {
  return !isManusConfigured();
}

export function inferBrandUrl(brandName: string): string {
  const slug = brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return KNOWN_BRAND_URLS[slug] ?? `https://${slug || "brand"}.com`;
}

function getApiKey(): string {
  const key = process.env.MANUS_API_KEY?.trim();
  if (!key) throw new Error("MANUS_API_KEY is not configured");
  return key;
}

async function manusFetch(
  path: string,
  init: RequestInit = {},
  options?: { retryNotFound?: boolean },
): Promise<Record<string, unknown>> {
  const res = await fetch(`${MANUS_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-manus-api-key": getApiKey(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const json = (await res.json()) as {
    ok?: boolean;
    error?: { message?: string; code?: string };
    [key: string]: unknown;
  };

  if (res.status === 404 && options?.retryNotFound) {
    return { ok: false, retry: true };
  }

  if (!res.ok || json.ok === false) {
    throw new Error(json.error?.message ?? `Manus API error (${res.status}) on ${path}`);
  }

  return json;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runManusStructuredTask<T extends Record<string, unknown>>(
  prompt: string,
  schema: Record<string, unknown>,
  title: string,
): Promise<T> {
  const created = await manusFetch("/v2/task.create", {
    method: "POST",
    body: JSON.stringify({
      title,
      agent_profile: "manus-1.6-lite",
      interactive_mode: false,
      hide_in_task_list: true,
      message: { content: prompt },
      structured_output_schema: schema,
    }),
  });

  const taskId = created.task_id as string | undefined;
  if (!taskId) throw new Error("Manus task.create did not return task_id");

  // Manus can return 404 on the first listMessages poll right after create.
  await sleep(MANUS_POLL_MS);

  const deadline = Date.now() + MANUS_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const messagesRes = await manusFetch(
      `/v2/task.listMessages?task_id=${encodeURIComponent(taskId)}&order=desc&limit=20`,
      {},
      { retryNotFound: true },
    );

    if (messagesRes.retry) {
      await sleep(MANUS_POLL_MS);
      continue;
    }

    const messages = (messagesRes.messages ?? messagesRes.data ?? []) as Array<
      Record<string, unknown>
    >;

    for (const message of messages) {
      if (message.type === "structured_output_result") {
        const result = message.structured_output_result as
          | { success?: boolean; value?: T; error?: string }
          | undefined;
        if (result?.success && result.value) return result.value;
        throw new Error(result?.error ?? "Manus structured output extraction failed");
      }

      if (message.type === "status_update") {
        const status = (message.status_update as { agent_status?: string } | undefined)
          ?.agent_status;
        if (status === "error") throw new Error("Manus task failed");
      }

      if (message.type === "error_message") {
        const err = (message.error_message as { message?: string } | undefined)?.message;
        throw new Error(err ?? "Manus task error");
      }
    }

    await sleep(MANUS_POLL_MS);
  }

  throw new Error(`Manus task timed out after ${MANUS_TIMEOUT_MS}ms`);
}

export async function callManusOrDemo<T>(
  demoFn: () => T,
  liveFn: () => Promise<T>,
): Promise<{ mode: ManusMode; value: T }> {
  if (isManusDemoMode()) {
    return { mode: "demo", value: demoFn() };
  }

  try {
    return { mode: "live", value: await liveFn() };
  } catch (error) {
    console.warn("BrandPilot Manus live call failed; using fast demo output", error);
    return { mode: "demo", value: demoFn() };
  }
}
