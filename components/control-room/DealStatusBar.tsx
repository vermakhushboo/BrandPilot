import {
  getStatusLabel,
  isBlockedStatus,
  type DealStatus,
} from "@/lib/state-machine";
import type { Deal } from "@/lib/types";
import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";

function getGateHint(status: DealStatus, paypalEnabled: boolean): string {
  switch (status) {
    case "awaiting_advance_payment":
      return paypalEnabled
        ? "Pay with PayPal below, or use Skip advance for demo fallback"
        : 'Click "Advance paid" to unlock drafting';
    case "brand_review":
      return 'Click "Approve draft" when content looks good';
    case "awaiting_final_payment":
      return paypalEnabled
        ? "Pay with PayPal below, or use Skip final for demo fallback"
        : 'Click "Final paid" to clear for posting';
    case "ready_to_post":
      return "All gates passed — content cleared to publish";
    case "inbound":
      return 'Click "Run company" to advance the autonomous pipeline';
    case "completed":
      return "Deal complete";
    default:
      return 'Use "Step once" to advance one stage';
  }
}

interface DealStatusBarProps {
  deal: Deal;
  isRunning?: boolean;
  paypalEnabled?: boolean;
  error?: string | null;
}

export function DealStatusBar({
  deal,
  isRunning,
  paypalEnabled = false,
  error,
}: DealStatusBarProps) {
  const status = deal.status;
  const blocked = isBlockedStatus(status);
  const hint = getGateHint(status, paypalEnabled);
  const ready = status === "ready_to_post" || status === "completed";
  const collected =
    (deal.payment.advanceStatus === "paid" ? deal.payment.advanceAmount : 0) +
    (deal.payment.finalStatus === "paid" ? deal.payment.finalAmount : 0);

  return (
    <div className="shrink-0 border-b border-border bg-white/70 px-4 py-3 sm:px-5">
      {error && (
        <p className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
      <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_auto_minmax(240px,0.85fr)] xl:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold ${
              ready
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : blocked
                  ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                  : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
            }`}
          >
            {ready ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : blocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {getStatusLabel(status)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              {isRunning ? "Agents are advancing the deal" : "Current operating state"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs xl:justify-center">
          <MetricChip label="Brand" value={deal.brandName} />
          <MetricChip
            label="Fit"
            value={deal.fitScore != null ? `${deal.fitScore}%` : "—"}
            highlight={deal.fitScore != null}
          />
          <MetricChip
            label="Rate"
            value={
              deal.quotedRate != null
                ? `£${deal.quotedRate.toLocaleString()}`
                : "—"
            }
          />
          <MetricChip
            label="Collected"
            value={`£${collected.toLocaleString()}`}
            highlight={collected > 0}
          />
        </div>

        <p className="hidden items-center justify-end gap-1.5 text-xs text-muted xl:flex">
          <ArrowRight className="h-3 w-3 shrink-0 text-accent" />
          {ready
            ? "Campaign cleared for creator approval and posting."
            : "Every movement is logged with evidence and gates."}
        </p>
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-white px-2.5">
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <span
        className={`font-semibold ${highlight ? "text-emerald-600" : "text-foreground"}`}
      >
        {value}
      </span>
    </span>
  );
}
