"use client";

import { Lock, Wallet } from "lucide-react";

import { PayPalPaymentButton } from "@/components/paypal-payment-button";
import type { ControlRoomData } from "@/lib/types";
import type { DealStatus } from "@/lib/state-machine";

interface PaymentGateBannerProps {
  status: DealStatus;
  dealId: string;
  advanceAmount: number;
  finalAmount: number;
  paypalEnabled: boolean;
  disabled?: boolean;
  onPaymentComplete?: (data: ControlRoomData) => void;
  onPaymentError?: (message: string) => void;
  onSimulate?: () => void;
}

export function PaymentGateBanner({
  status,
  dealId,
  advanceAmount,
  finalAmount,
  paypalEnabled,
  disabled,
  onPaymentComplete,
  onPaymentError,
  onSimulate,
}: PaymentGateBannerProps) {
  const isAdvance = status === "awaiting_advance_payment";
  const isFinal = status === "awaiting_final_payment";

  if (!isAdvance && !isFinal) return null;

  const stage = isAdvance ? "advance" : "final";
  const amount = isAdvance ? advanceAmount : finalAmount;
  const title = isAdvance ? "Advance payment required" : "Final payment required";
  const description = isAdvance
    ? "Pay 50% upfront to unlock research, drafting, and calendar scheduling."
    : "Pay the remaining 50% after brand approval to mark content ready to post.";

  return (
    <div className="shrink-0 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-white to-white px-4 py-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 ring-1 ring-amber-200">
            <Lock className="h-5 w-5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-800 ring-1 ring-amber-200">
                <Wallet className="h-3 w-3" />
                £{amount.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
              {description}
            </p>
          </div>
        </div>

        {paypalEnabled && onPaymentComplete ? (
          <div className="w-full shrink-0 space-y-2 lg:max-w-xs">
            <PayPalPaymentButton
              dealId={dealId}
              stage={stage}
              disabled={disabled}
              onComplete={onPaymentComplete}
              onError={onPaymentError}
              compact
            />
            {onSimulate && (
              <button
                type="button"
                onClick={onSimulate}
                disabled={disabled}
                className="w-full rounded-lg border border-dashed border-border bg-white px-3 py-2 text-[11px] font-medium text-muted transition-colors hover:border-amber-500/40 hover:bg-amber-50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
              >
                Skip PayPal — simulate £{amount.toLocaleString()} paid
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-amber-700/90">
            Use the demo gate button above to simulate payment.
          </p>
        )}
      </div>
    </div>
  );
}
