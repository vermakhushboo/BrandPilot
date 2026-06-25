import { normalizeDealStatus } from "@/lib/status-map";
import type { DealStatus } from "@/lib/state-machine";
import { formatTimestamp } from "./format";
import type {
  DbAgentRun,
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
  MessageSender,
  PaymentState,
} from "@/lib/types";

const MESSAGE_SENDERS = new Set<string>(["brand", "creator", "agent"]);

function asDealStatus(stage: string): DealStatus {
  return normalizeDealStatus(stage);
}

function asMessageSender(sender: string): MessageSender {
  return MESSAGE_SENDERS.has(sender) ? (sender as MessageSender) : "agent";
}

function asDraftStatus(status: string): Draft["status"] {
  return status === "approved" ? "approved" : "pending";
}

function asPaymentStatus(status: string): "pending" | "paid" {
  return status === "paid" ? "paid" : "pending";
}

export function mapCreatorProfile(row: DbCreatorProfile): CreatorProfile {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    niche: row.niche,
    followers: row.followers,
  };
}

export function mapMessage(row: DbMessage): Message {
  return {
    id: row.id,
    sender: asMessageSender(row.sender),
    text: row.body,
    timestamp: formatTimestamp(row.created_at),
  };
}

export function mapAgentRun(row: DbAgentRun): AgentLogEntry {
  return {
    id: row.id,
    agent: row.agent_name,
    action: row.action,
    timestamp: formatTimestamp(row.created_at),
  };
}

export function mapDraft(row: DbDraft): Draft | null {
  if (row.platform !== "linkedin" && row.platform !== "x") return null;

  return {
    platform: row.platform,
    content: row.content,
    status: asDraftStatus(row.status),
  };
}

export function mapPaymentState(
  payments: DbPayment[],
  quotedRate: number | null,
): PaymentState {
  const advance = payments.find((p) => p.type === "advance");
  const final = payments.find((p) => p.type === "final");
  const dealValue =
    quotedRate ??
    (advance && final ? Number(advance.amount) + Number(final.amount) : 0);

  return {
    dealValue,
    advanceAmount: advance ? Number(advance.amount) : Math.round(dealValue / 2),
    advanceStatus: advance ? asPaymentStatus(advance.status) : "pending",
    finalAmount: final ? Number(final.amount) : Math.round(dealValue / 2),
    finalStatus: final ? asPaymentStatus(final.status) : "pending",
  };
}

export function mapCalendarPost(row: DbCalendarPost): CalendarPost {
  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    content: row.content,
    scheduledAt: row.scheduled_at,
    status: row.status,
    isSponsored: row.is_sponsored,
  };
}

export function mapDeal(
  row: DbDeal,
  messages: DbMessage[],
  agentRuns: DbAgentRun[],
  drafts: DbDraft[],
  payments: DbPayment[],
): Deal {
  return {
    id: row.id,
    brandName: row.brand_name,
    brandLogo: row.brand_logo,
    product: row.product,
    status: asDealStatus(row.stage),
    fitScore: row.fit_score,
    quotedRate: row.quoted_rate ? Number(row.quoted_rate) : null,
    messages: messages.map(mapMessage),
    agentLogs: agentRuns.map(mapAgentRun),
    drafts: drafts.map(mapDraft).filter((d): d is Draft => d !== null),
    payment: mapPaymentState(payments, row.quoted_rate ? Number(row.quoted_rate) : null),
  };
}
