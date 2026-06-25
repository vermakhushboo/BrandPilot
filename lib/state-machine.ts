export const DEAL_STATUSES = [
  "inbound",
  "brand_fit_check",
  "rate_quote",
  "negotiating",
  "awaiting_advance_payment",
  "advance_paid",
  "researching",
  "drafting",
  "calendar_fit",
  "brand_review",
  "awaiting_final_payment",
  "final_paid",
  "ready_to_post",
  "completed",
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

const BLOCKED_STATUSES = new Set<DealStatus>([
  "awaiting_advance_payment",
  "brand_review",
  "awaiting_final_payment",
  "ready_to_post",
]);

const STATUS_LABELS: Record<DealStatus, string> = {
  inbound: "Inbound",
  brand_fit_check: "Brand Fit Check",
  rate_quote: "Rate Quote",
  negotiating: "Negotiating",
  awaiting_advance_payment: "Awaiting Advance Payment",
  advance_paid: "Advance Paid",
  researching: "Researching",
  drafting: "Drafting",
  calendar_fit: "Calendar Fit",
  brand_review: "Brand Review",
  awaiting_final_payment: "Awaiting Final Payment",
  final_paid: "Final Paid",
  ready_to_post: "Ready to Post",
  completed: "Completed",
};

export function getNextStatus(status: DealStatus): DealStatus | null {
  const index = DEAL_STATUSES.indexOf(status);
  if (index === -1 || index >= DEAL_STATUSES.length - 1) {
    return null;
  }
  return DEAL_STATUSES[index + 1];
}

export function isBlockedStatus(status: DealStatus): boolean {
  return BLOCKED_STATUSES.has(status);
}

export function getStatusLabel(status: DealStatus): string {
  return STATUS_LABELS[status];
}
