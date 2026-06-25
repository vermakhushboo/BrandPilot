import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  mapAgentRun,
  mapCalendarPost,
  mapCreatorProfile,
  mapDeal,
  mapMessage,
} from "@/lib/data/mappers";
import {
  CREATOR,
  DEMO_CALENDAR_POSTS,
  INBOUND_DEAL,
  SEED_DEAL,
  SPONSORED_CALENDAR_SLOT,
} from "@/lib/seed";
import { normalizeDealStatus, statusToDbStage } from "@/lib/status-map";
import type { DealStatus } from "@/lib/state-machine";
import { getSupabaseConfig, isStoreSupabaseEnabled } from "@/lib/supabase/config";
import type {
  DbAgentRun,
  DbApproval,
  DbCalendarPost,
  DbCreatorProfile,
  DbDeal,
  DbDraft,
  DbMessage,
  DbPayment,
} from "@/lib/supabase/types";
import type {
  AgentLogEntry,
  CalendarPost,
  CreatorProfile,
  Deal,
  Draft,
  Message,
} from "@/lib/types";

export type MessageDirection = "inbound" | "outbound";
export type MessageChannel = "whatsapp" | "email" | "dm";
export type PaymentStage = "advance" | "final";
export type PaymentRecordStatus = "pending" | "paid" | "failed" | "refunded";
export type CalendarPostType = "organic" | "sponsored";

export type StoreMode = "supabase" | "memory";

export function getStoreMode(): StoreMode {
  return isStoreSupabaseEnabled() ? "supabase" : "memory";
}

// ---------------------------------------------------------------------------
// In-memory store (persists across requests in dev via global)
// ---------------------------------------------------------------------------

interface MemoryState {
  creator: CreatorProfile;
  deal: Deal;
  calendarPosts: CalendarPost[];
  payments: DbPayment[];
  approvals: DbApproval[];
  agentRunOutputs: DbAgentRun[];
}

const memoryGlobal = globalThis as typeof globalThis & {
  __brandpilotMemory?: MemoryState;
};

function cloneDemoState(): MemoryState {
  return {
    creator: {
      id: "demo-creator",
      name: CREATOR.name,
      handle: CREATOR.handle,
      niche: CREATOR.niche,
      followers: CREATOR.followers,
    },
    deal: structuredClone(SEED_DEAL),
    calendarPosts: [...DEMO_CALENDAR_POSTS, SPONSORED_CALENDAR_SLOT],
    payments: [
      {
        id: "pay-advance",
        deal_id: SEED_DEAL.id,
        type: "advance",
        amount: 4250,
        status: "paid",
        metadata: {},
        created_at: new Date().toISOString(),
      },
      {
        id: "pay-final",
        deal_id: SEED_DEAL.id,
        type: "final",
        amount: 4250,
        status: "pending",
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ],
    approvals: [],
    agentRunOutputs: [],
  };
}

function getMemoryState(): MemoryState {
  if (!memoryGlobal.__brandpilotMemory) {
    memoryGlobal.__brandpilotMemory = cloneDemoState();
  }
  return memoryGlobal.__brandpilotMemory;
}

function resetMemoryState(): void {
  memoryGlobal.__brandpilotMemory = cloneDemoState();
}

let memoryId = 0;
function nextMemoryId(prefix: string): string {
  memoryId += 1;
  return `${prefix}-${Date.now()}-${memoryId}`;
}

function syncMemoryDealPayment(state: MemoryState): Deal {
  const deal = structuredClone(state.deal);
  const advance = state.payments.find(
    (p) => p.deal_id === deal.id && p.type === "advance",
  );
  const final = state.payments.find(
    (p) => p.deal_id === deal.id && p.type === "final",
  );

  if (advance || final) {
    const dealValue =
      deal.quotedRate ??
      (advance && final ? Number(advance.amount) + Number(final.amount) : deal.payment.dealValue);
    deal.payment = {
      dealValue,
      advanceAmount: advance ? Number(advance.amount) : deal.payment.advanceAmount,
      advanceStatus: advance?.status === "paid" ? "paid" : deal.payment.advanceStatus,
      finalAmount: final ? Number(final.amount) : deal.payment.finalAmount,
      finalStatus: final?.status === "paid" ? "paid" : deal.payment.finalStatus,
    };
  }

  return deal;
}

function directionToSender(direction: MessageDirection): Message["sender"] {
  return direction === "inbound" ? "brand" : "agent";
}

function agentOutputAction(output: Record<string, unknown>): string {
  if (typeof output.action === "string") return output.action;
  if (typeof output.summary === "string") return output.summary;
  return "Agent step completed";
}

function supabaseClient(): SupabaseClient {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase store is not configured");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loadDealFromSupabase(
  supabase: SupabaseClient,
  dealRow: DbDeal,
): Promise<Deal> {
  const [messagesRes, agentRunsRes, draftsRes, paymentsRes] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("deal_id", dealRow.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_runs")
      .select("*")
      .eq("deal_id", dealRow.id)
      .order("created_at", { ascending: true }),
    supabase.from("drafts").select("*").eq("deal_id", dealRow.id),
    supabase.from("payments").select("*").eq("deal_id", dealRow.id),
  ]);

  const statusFromMeta =
    typeof dealRow.metadata?.status === "string"
      ? (dealRow.metadata.status as DealStatus)
      : null;

  const deal = mapDeal(
    dealRow,
    (messagesRes.data ?? []) as DbMessage[],
    (agentRunsRes.data ?? []) as DbAgentRun[],
    (draftsRes.data ?? []) as DbDraft[],
    (paymentsRes.data ?? []) as DbPayment[],
  );

  if (statusFromMeta) {
    deal.status = statusFromMeta;
  }

  return deal;
}

async function getDealRow(
  supabase: SupabaseClient,
  dealId: string,
): Promise<DbDeal | null> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .maybeSingle();

  if (error || !data) return null;
  return data as DbDeal;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getCreatorProfile(): Promise<CreatorProfile | null> {
  if (getStoreMode() === "memory") {
    return getMemoryState().creator;
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapCreatorProfile(data as DbCreatorProfile);
}

export async function getCreatorProfileWithMeta(): Promise<{
  profile: CreatorProfile | null;
  meta: { rates: Record<string, unknown>; audience: Record<string, unknown> };
}> {
  if (getStoreMode() === "memory") {
    return {
      profile: getMemoryState().creator,
      meta: {
        rates: { linkedin: 1000, x: 800, bundle: 1800, currency: "GBP" },
        audience: { senior_engineers_pct: 78, devtools_interest_pct: 82 },
      },
    };
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { profile: null, meta: { rates: {}, audience: {} } };
  }

  const row = data as DbCreatorProfile;
  return {
    profile: mapCreatorProfile(row),
    meta: {
      rates: row.rates ?? {},
      audience: row.audience ?? {},
    },
  };
}

export async function getAgentRunOutputs(
  dealId: string,
): Promise<Record<string, Record<string, unknown>>> {
  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    const map: Record<string, Record<string, unknown>> = {};
    for (const run of state.agentRunOutputs) {
      if (run.deal_id === dealId && run.status === "completed") {
        map[run.agent_name] = run.output;
      }
    }
    return map;
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("agent_runs")
    .select("agent_name, output, status, created_at")
    .eq("deal_id", dealId)
    .eq("status", "completed")
    .order("created_at", { ascending: true });

  if (error || !data) return {};

  const map: Record<string, Record<string, unknown>> = {};
  for (const row of data as Pick<DbAgentRun, "agent_name" | "output" | "status">[]) {
    map[row.agent_name] = row.output;
  }
  return map;
}

export async function getActiveDeal(): Promise<Deal | null> {
  if (getStoreMode() === "memory") {
    return syncMemoryDealPayment(getMemoryState());
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return loadDealFromSupabase(supabase, data as DbDeal);
}

export async function getCalendarPosts(
  creatorProfileId: string,
): Promise<CalendarPost[]> {
  if (getStoreMode() === "memory") {
    return structuredClone(getMemoryState().calendarPosts);
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("calendar_posts")
    .select("*")
    .eq("creator_profile_id", creatorProfileId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return (data as DbCalendarPost[]).map(mapCalendarPost);
}

export async function seedDemoData(): Promise<void> {
  if (getStoreMode() === "memory") {
    resetMemoryState();
    return;
  }

  const supabase = supabaseClient();
  const creator = await getCreatorProfile();
  if (creator) return;

  const { data: profile, error: profileError } = await supabase
    .from("creator_profiles")
    .insert({
      name: CREATOR.name,
      handle: CREATOR.handle,
      niche: "Technical AI & DevTools",
      followers: CREATOR.followers,
      bio: "Staff engineer turned creator.",
      rates: { base_rate: 7000, linkedin: 5500, x_thread: 2500, currency: "USD" },
      audience: { senior_engineers_pct: 78, devtools_interest_pct: 82 },
      platforms: [
        { platform: "linkedin", followers: 98000 },
        { platform: "x", followers: 44000 },
      ],
    })
    .select("*")
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Failed to seed creator profile");
  }

  const creatorId = (profile as DbCreatorProfile).id;

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      creator_profile_id: creatorId,
      brand_name: INBOUND_DEAL.brandName,
      brand_logo: INBOUND_DEAL.brandLogo,
      product: INBOUND_DEAL.product,
      stage: statusToDbStage(INBOUND_DEAL.status),
      metadata: { status: INBOUND_DEAL.status },
    })
    .select("*")
    .single();

  if (dealError || !deal) {
    throw new Error(dealError?.message ?? "Failed to seed deal");
  }

  const dealId = (deal as DbDeal).id;
  const firstMessage = INBOUND_DEAL.messages[0];

  if (firstMessage) {
    await supabase.from("messages").insert({
      deal_id: dealId,
      sender: firstMessage.sender,
      body: firstMessage.text,
      metadata: { channel: "whatsapp", direction: "inbound" },
    });
  }

  for (const post of DEMO_CALENDAR_POSTS) {
    await supabase.from("calendar_posts").insert({
      creator_profile_id: creatorId,
      platform: post.platform,
      title: post.title,
      content: post.content,
      scheduled_at: post.scheduledAt,
      status: post.status,
      is_sponsored: false,
    });
  }
}

export async function updateDealStatus(
  dealId: string,
  status: DealStatus,
  patch?: { fitScore?: number | null; quotedRate?: number | null },
): Promise<Deal | null> {
  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    if (state.deal.id !== dealId) return null;
    state.deal.status = status;
    if (patch?.fitScore !== undefined) state.deal.fitScore = patch.fitScore;
    if (patch?.quotedRate !== undefined) state.deal.quotedRate = patch.quotedRate;
    return syncMemoryDealPayment(state);
  }

  const supabase = supabaseClient();
  const existing = await getDealRow(supabase, dealId);
  if (!existing) return null;

  const metadata = {
    ...existing.metadata,
    status,
  };

  const update: Record<string, unknown> = {
    stage: statusToDbStage(status),
    metadata,
  };
  if (patch?.fitScore !== undefined) update.fit_score = patch.fitScore;
  if (patch?.quotedRate !== undefined) update.quoted_rate = patch.quotedRate;

  const { error } = await supabase.from("deals").update(update).eq("id", dealId);
  if (error) throw new Error(error.message);

  return getActiveDeal();
}

export async function appendMessage(
  dealId: string,
  direction: MessageDirection,
  channel: MessageChannel,
  body: string,
): Promise<Message | null> {
  const sender = directionToSender(direction);

  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    if (state.deal.id !== dealId) return null;

    const message: Message = {
      id: nextMemoryId("msg"),
      sender,
      text: body,
      timestamp: new Date().toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
    state.deal.messages.push(message);
    return message;
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      deal_id: dealId,
      sender,
      body,
      metadata: { direction, channel },
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapMessage(data as DbMessage);
}

export async function appendAgentRun(
  dealId: string,
  agent: string,
  status: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
): Promise<AgentLogEntry | null> {
  const action = agentOutputAction(output);

  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    if (state.deal.id !== dealId) return null;

    const entry: AgentLogEntry = {
      id: nextMemoryId("log"),
      agent,
      action,
      timestamp: new Date().toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
    state.deal.agentLogs.push(entry);
    state.agentRunOutputs.push({
      id: entry.id,
      deal_id: dealId,
      agent_name: agent,
      action,
      status,
      input,
      output,
      created_at: new Date().toISOString(),
    });
    return entry;
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      deal_id: dealId,
      agent_name: agent,
      action,
      status,
      input,
      output,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapAgentRun(data as DbAgentRun);
}

export async function createPayment(
  dealId: string,
  stage: PaymentStage,
  amount: number,
  metadata: Record<string, unknown> = {},
): Promise<DbPayment | null> {
  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    if (state.deal.id !== dealId) return null;

    const payment: DbPayment = {
      id: nextMemoryId("pay"),
      deal_id: dealId,
      type: stage,
      amount,
      status: "pending",
      metadata,
      created_at: new Date().toISOString(),
    };

    state.payments = state.payments.filter((p) => p.type !== stage);
    state.payments.push(payment);

    const dealValue = amount * 2;
    state.deal.payment = {
      dealValue,
      advanceAmount: stage === "advance" ? amount : Math.round(dealValue / 2),
      advanceStatus:
        stage === "advance" ? "pending" : state.deal.payment.advanceStatus,
      finalAmount: stage === "final" ? amount : Math.round(dealValue / 2),
      finalStatus: stage === "final" ? "pending" : state.deal.payment.finalStatus,
    };

    return payment;
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .upsert(
      {
        deal_id: dealId,
        type: stage,
        amount,
        status: "pending",
        metadata,
      },
      { onConflict: "deal_id,type" },
    )
    .select("*")
    .single();

  if (error || !data) return null;
  return data as DbPayment;
}

export async function updatePaymentMetadata(
  dealId: string,
  stage: PaymentStage,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    const payment = state.payments.find(
      (p) => p.deal_id === dealId && p.type === stage,
    );
    if (payment) {
      payment.metadata = { ...payment.metadata, ...metadata };
    }
    return;
  }

  const supabase = supabaseClient();
  const { data: existing } = await supabase
    .from("payments")
    .select("metadata")
    .eq("deal_id", dealId)
    .eq("type", stage)
    .maybeSingle();

  const merged = {
    ...((existing?.metadata as Record<string, unknown>) ?? {}),
    ...metadata,
  };

  const { error } = await supabase
    .from("payments")
    .update({ metadata: merged })
    .eq("deal_id", dealId)
    .eq("type", stage);

  if (error) throw new Error(error.message);
}

export async function updatePaymentStatus(
  dealId: string,
  stage: PaymentStage,
  status: PaymentRecordStatus,
): Promise<Deal | null> {
  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    if (state.deal.id !== dealId) return null;

    const payment = state.payments.find((p) => p.type === stage);
    if (payment) payment.status = status;

    if (stage === "advance") {
      state.deal.payment.advanceStatus = status === "paid" ? "paid" : "pending";
    } else {
      state.deal.payment.finalStatus = status === "paid" ? "paid" : "pending";
    }

    return syncMemoryDealPayment(state);
  }

  const supabase = supabaseClient();
  const { error } = await supabase
    .from("payments")
    .update({ status })
    .eq("deal_id", dealId)
    .eq("type", stage);

  if (error) throw new Error(error.message);

  const dealRow = await getDealRow(supabase, dealId);
  if (!dealRow) return null;
  return loadDealFromSupabase(supabase, dealRow);
}

export async function saveDraft(
  dealId: string,
  platform: Draft["platform"],
  body: string,
  mediaPrompt?: string,
): Promise<Draft | null> {
  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    if (state.deal.id !== dealId) return null;

    const draft: Draft = {
      platform,
      content: body,
      status: "pending",
    };

    const idx = state.deal.drafts.findIndex((d) => d.platform === platform);
    if (idx >= 0) state.deal.drafts[idx] = draft;
    else state.deal.drafts.push(draft);

    return draft;
  }

  const supabase = supabaseClient();
  const { data: existing } = await supabase
    .from("drafts")
    .select("id")
    .eq("deal_id", dealId)
    .eq("platform", platform)
    .maybeSingle();

  const row = {
    deal_id: dealId,
    platform,
    content: body,
    status: "pending",
    metadata: mediaPrompt ? { mediaPrompt } : {},
  };

  const { data, error } = existing?.id
    ? await supabase
        .from("drafts")
        .update(row)
        .eq("id", existing.id)
        .select("*")
        .single()
    : await supabase.from("drafts").insert(row).select("*").single();

  if (error || !data) return null;

  return {
    platform: (data as DbDraft).platform as Draft["platform"],
    content: (data as DbDraft).content,
    status: "pending",
  };
}

export async function saveCalendarSlot(
  dealId: string,
  platform: string,
  postType: CalendarPostType,
  title: string,
  scheduledAt: string,
  status: string,
  content = "",
): Promise<CalendarPost | null> {
  const isSponsored = postType === "sponsored";

  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    const creatorId = state.creator.id;

    const post: CalendarPost = {
      id: nextMemoryId("cal"),
      platform,
      title,
      content: content || title,
      scheduledAt,
      status,
      isSponsored,
    };

    if (isSponsored) {
      state.calendarPosts = state.calendarPosts.filter((p) => !p.isSponsored);
    }
    state.calendarPosts.push(post);
    void creatorId;
    void dealId;
    return post;
  }

  const supabase = supabaseClient();
  const dealRow = await getDealRow(supabase, dealId);
  if (!dealRow) return null;

  const { data, error } = await supabase
    .from("calendar_posts")
    .insert({
      creator_profile_id: dealRow.creator_profile_id,
      deal_id: isSponsored ? dealId : null,
      platform,
      title,
      content: content || title,
      scheduled_at: scheduledAt,
      status,
      is_sponsored: isSponsored,
      metadata: { postType },
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapCalendarPost(data as DbCalendarPost);
}

export async function saveApproval(
  dealId: string,
  type: string,
  status: string,
  summary: string,
): Promise<{ id: string } | null> {
  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    if (state.deal.id !== dealId) return null;

    const id = nextMemoryId("approval");
    state.approvals.push({
      id,
      deal_id: dealId,
      draft_id: null,
      status,
      feedback: { summary },
      metadata: { type },
      created_at: new Date().toISOString(),
    });

    if (status === "approved" && type === "draft") {
      state.deal.drafts = state.deal.drafts.map((d) => ({
        ...d,
        status: "approved" as const,
      }));
    }

    return { id };
  }

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("approvals")
    .insert({
      deal_id: dealId,
      status,
      feedback: { summary },
      metadata: { type },
    })
    .select("id")
    .single();

  if (error || !data) return null;

  if (status === "approved" && type === "draft") {
    await supabase
      .from("drafts")
      .update({ status: "approved" })
      .eq("deal_id", dealId);
  }

  return { id: (data as { id: string }).id };
}

/** Resolve deal status from DB row (prefers metadata.status). */
export function readDealStatus(row: DbDeal): DealStatus {
  if (typeof row.metadata?.status === "string") {
    return normalizeDealStatus(row.metadata.status);
  }
  return normalizeDealStatus(row.stage);
}

export async function resetActiveDealForAutonomousStart(
  dealId: string,
): Promise<Deal | null> {
  if (getStoreMode() === "memory") {
    const state = getMemoryState();
    state.deal = {
      ...structuredClone(INBOUND_DEAL),
      id: dealId,
    };
    state.payments = [];
    state.approvals = [];
    state.agentRunOutputs = [];
    return structuredClone(state.deal);
  }

  const supabase = supabaseClient();
  const existing = await getDealRow(supabase, dealId);
  if (!existing) return null;

  await supabase.from("messages").delete().eq("deal_id", dealId);
  await supabase.from("agent_runs").delete().eq("deal_id", dealId);
  await supabase.from("drafts").delete().eq("deal_id", dealId);
  await supabase.from("payments").delete().eq("deal_id", dealId);
  await supabase.from("approvals").delete().eq("deal_id", dealId);

  await supabase
    .from("deals")
    .update({
      brand_name: INBOUND_DEAL.brandName,
      brand_logo: INBOUND_DEAL.brandLogo,
      product: INBOUND_DEAL.product,
      stage: statusToDbStage("inbound"),
      fit_score: null,
      quoted_rate: null,
      metadata: { status: "inbound" },
    })
    .eq("id", dealId);

  const firstMessage = INBOUND_DEAL.messages[0];
  if (firstMessage) {
    await supabase.from("messages").insert({
      deal_id: dealId,
      sender: firstMessage.sender,
      body: firstMessage.text,
      metadata: { channel: "whatsapp", direction: "inbound" },
    });
  }

  return getActiveDeal();
}
