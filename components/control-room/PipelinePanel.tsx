import {
  DEAL_STATUSES,
  getStatusLabel,
  isBlockedStatus,
  type DealStatus,
} from "@/lib/state-machine";
import type { Deal } from "@/lib/types";
import { ArrowRight, CheckCircle2, Circle, Lock } from "lucide-react";

import { PanelShell } from "./PanelShell";

interface PipelinePanelProps {
  deal: Deal;
}

const PHASES = [
  { label: "Intake", statuses: ["inbound", "brand_fit_check"] as DealStatus[] },
  { label: "Quote", statuses: ["rate_quote", "negotiating"] as DealStatus[] },
  {
    label: "Advance",
    statuses: ["awaiting_advance_payment", "advance_paid"] as DealStatus[],
  },
  {
    label: "Produce",
    statuses: ["researching", "drafting", "calendar_fit"] as DealStatus[],
  },
  { label: "Review", statuses: ["brand_review"] as DealStatus[] },
  {
    label: "Final",
    statuses: ["awaiting_final_payment", "final_paid"] as DealStatus[],
  },
  { label: "Publish", statuses: ["ready_to_post", "completed"] as DealStatus[] },
];

export function PipelinePanel({ deal }: PipelinePanelProps) {
  const currentIndex = DEAL_STATUSES.indexOf(deal.status);
  const progress = Math.round(((currentIndex + 1) / DEAL_STATUSES.length) * 100);
  const currentLabel = getStatusLabel(deal.status);

  return (
    <PanelShell
      title="Deal pipeline"
      subtitle={`${deal.brandName} · ${deal.product}`}
      badge={
        <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">
          {progress}% complete
        </span>
      }
      bodyClassName="p-0"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-7">
        {PHASES.map((phase) => (
          <PhaseGroup
            key={phase.label}
            label={phase.label}
            statuses={phase.statuses}
            currentStatus={deal.status}
            currentIndex={currentIndex}
          />
        ))}
      </div>
      <div className="border-t border-border bg-slate-200/30 px-4 py-3">
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-foreground">
            Current checkpoint: {currentLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <ArrowRight className="h-3 w-3 text-indigo-700" />
            The worker stops only at payment or approval gates.
          </span>
        </div>
      </div>
    </PanelShell>
  );
}

function PhaseGroup({
  label,
  statuses,
  currentStatus,
  currentIndex,
}: {
  label: string;
  statuses: DealStatus[];
  currentStatus: DealStatus;
  currentIndex: number;
}) {
  const phaseActive = statuses.includes(currentStatus);
  const phaseComplete = statuses.every(
    (s) => DEAL_STATUSES.indexOf(s) < currentIndex,
  );
  const firstStatus = statuses[0];
  const visibleStatus = phaseActive ? currentStatus : statuses[statuses.length - 1];
  const phaseReady = phaseActive && (currentStatus === "ready_to_post" || currentStatus === "completed");
  const blocked =
    !phaseReady &&
    (phaseActive
      ? isBlockedStatus(currentStatus)
      : statuses.some((status) => isBlockedStatus(status)) && !phaseComplete);

  return (
    <article
      className={`rounded-lg border p-3 transition-colors ${
        phaseReady || phaseComplete
          ? "border-emerald-200 bg-emerald-50"
          : phaseActive
            ? "border-indigo-200 bg-indigo-50"
            : "border-border bg-slate-200/55"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-md ${
            phaseReady || phaseComplete
              ? "bg-emerald-100 text-emerald-700"
              : phaseActive
                ? "bg-indigo-100 text-indigo-700"
                : "bg-surface-2 text-muted"
          }`}
        >
          {phaseReady || phaseComplete ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : blocked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
            phaseReady || phaseComplete
              ? "text-emerald-700"
              : phaseActive
                ? "text-indigo-700"
                : "text-muted"
          }`}
        >
          {phaseReady ? "Ready" : phaseActive ? "Active" : phaseComplete ? "Done" : "Queued"}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
        {phaseActive
          ? getStatusLabel(visibleStatus)
          : phaseComplete
            ? getStatusLabel(statuses[statuses.length - 1])
            : getStatusLabel(firstStatus)}
      </p>
    </article>
  );
}
