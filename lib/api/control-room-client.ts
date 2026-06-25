import type { ControlRoomData } from "@/lib/types";

interface ApiSuccess {
  ok: true;
  data: ControlRoomData;
}

interface ApiFailure {
  ok: false;
  error: string;
}

type ApiResponse = ApiSuccess | ApiFailure;

async function postApi(
  path: string,
  body: Record<string, unknown>,
): Promise<ControlRoomData> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as ApiResponse;

  if (!res.ok || !json.ok) {
    const message = !json.ok ? json.error : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json.data;
}

export function apiRunNext(dealId: string) {
  return postApi("/api/agents/run-next", { dealId });
}

export function apiRunLoop(dealId: string, reset = false) {
  return postApi("/api/agents/run-loop", { dealId, reset });
}

export function apiSimulateAdvancePaid(dealId: string) {
  return postApi("/api/demo/simulate-advance-paid", { dealId });
}

export function apiApproveBrandDraft(dealId: string) {
  return postApi("/api/demo/approve-brand-draft", { dealId });
}

export function apiSimulateFinalPaid(dealId: string) {
  return postApi("/api/demo/simulate-final-paid", { dealId });
}

export function apiStartAutonomousDeal(dealId: string) {
  return apiRunLoop(dealId, true);
}
