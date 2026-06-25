import { DEAL_STATUSES, type DealStatus } from "@/lib/state-machine";

/** Map legacy DB stage values to the current state machine. */
const LEGACY_STAGE_MAP: Record<string, DealStatus> = {
  inbound: "inbound",
  qualified: "brand_fit_check",
  negotiating: "negotiating",
  advance_requested: "awaiting_advance_payment",
  advance_paid: "advance_paid",
  drafting: "drafting",
  brand_review: "brand_review",
  final_payment_requested: "awaiting_final_payment",
  final_paid: "final_paid",
  ready_to_post: "ready_to_post",
};

/** Map state machine status to DB stage column (legacy constraint). */
export function statusToDbStage(status: DealStatus): string {
  const map: Record<DealStatus, string> = {
    inbound: "inbound",
    brand_fit_check: "qualified",
    rate_quote: "qualified",
    negotiating: "negotiating",
    awaiting_advance_payment: "advance_requested",
    advance_paid: "advance_paid",
    researching: "advance_paid",
    drafting: "drafting",
    calendar_fit: "drafting",
    brand_review: "brand_review",
    awaiting_final_payment: "final_payment_requested",
    final_paid: "final_paid",
    ready_to_post: "ready_to_post",
    completed: "ready_to_post",
  };
  return map[status] ?? "inbound";
}

export function normalizeDealStatus(stage: string): DealStatus {
  if (stage in LEGACY_STAGE_MAP) {
    return LEGACY_STAGE_MAP[stage];
  }
  if ((DEAL_STATUSES as readonly string[]).includes(stage)) {
    return stage as DealStatus;
  }
  return "inbound";
}
