"use client";

import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Play,
  ShieldCheck,
  StepForward,
} from "lucide-react";

import { getStatusLabel, type DealStatus } from "@/lib/state-machine";
import { cn } from "@/lib/utils";

interface ActionBarProps {
  status: string;
  disabled?: boolean;
  paypalEnabled?: boolean;
  onStartAutonomous: () => void;
  onNextStep: () => void;
  onSimulateAdvance: () => void;
  onApproveDraft: () => void;
  onSimulateFinal: () => void;
}

export function ActionBar({
  status,
  disabled,
  paypalEnabled = false,
  onStartAutonomous,
  onNextStep,
  onSimulateAdvance,
  onApproveDraft,
  onSimulateFinal,
}: ActionBarProps) {
  return (
    <div className="shrink-0 border-b border-border bg-white/90 px-3 py-3 sm:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            icon={disabled ? Loader2 : Play}
            label="Run company"
            onClick={onStartAutonomous}
            variant="primary"
            disabled={disabled}
            iconSpin={disabled}
          />
          <ActionButton
            icon={disabled ? Loader2 : StepForward}
            label="Step once"
            onClick={onNextStep}
            disabled={disabled}
            iconSpin={disabled}
          />
          <span className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] text-muted md:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Runs until a payment or approval gate
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-muted xl:inline">
            Manual demo gates
          </span>
          <ActionButton
            icon={CreditCard}
            label={paypalEnabled ? "Skip advance" : "Advance paid"}
            onClick={onSimulateAdvance}
            disabled={disabled || status !== "awaiting_advance_payment"}
            active={status === "awaiting_advance_payment"}
          />
          <ActionButton
            icon={CheckCircle2}
            label="Approve draft"
            onClick={onApproveDraft}
            disabled={disabled || status !== "brand_review"}
            active={status === "brand_review"}
          />
          <ActionButton
            icon={Banknote}
            label={paypalEnabled ? "Skip final" : "Final paid"}
            onClick={onSimulateFinal}
            disabled={disabled || status !== "awaiting_final_payment"}
            active={status === "awaiting_final_payment"}
          />
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted xl:hidden">
        {paypalEnabled
          ? "PayPal is enabled; skip buttons are fallback controls."
          : `Demo mode paused at ${getStatusLabel(status as DealStatus)}.`}
      </p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  disabled,
  active,
  iconSpin,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary";
  disabled?: boolean;
  active?: boolean;
  iconSpin?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-all",
        disabled && "cursor-not-allowed opacity-45",
        !disabled &&
          variant === "primary" &&
          "bg-accent text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600",
        !disabled &&
          variant !== "primary" &&
          active &&
          "border border-amber-300 bg-amber-50 text-amber-900 shadow-sm shadow-amber-100",
        !disabled &&
          variant !== "primary" &&
          !active &&
          "border border-border bg-white text-foreground shadow-sm hover:border-accent/45 hover:bg-surface-2",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", iconSpin && "animate-spin")} />
      {label}
    </button>
  );
}
