import type { Deal, ControlRoomData } from "@/lib/types";
import { CheckCircle2, FileText, ShieldCheck, UserCheck, Wallet } from "lucide-react";

import { PayPalPaymentButton } from "@/components/paypal-payment-button";

interface DraftsPanelProps {
  deal: Deal;
  dealId: string;
  paypalEnabled: boolean;
  showPayPalButtons?: boolean;
  disabled?: boolean;
  onPaymentComplete?: (data: ControlRoomData) => void;
  onPaymentError?: (message: string) => void;
}

export function DraftsPanel({
  deal,
  dealId,
  paypalEnabled,
  showPayPalButtons = true,
  disabled,
  onPaymentComplete,
  onPaymentError,
}: DraftsPanelProps) {
  const { payment, drafts, status } = deal;
  const readyForCreatorReview = status === "ready_to_post" || status === "completed";
  const showAdvancePayPal =
    paypalEnabled && status === "awaiting_advance_payment";
  const showFinalPayPal =
    paypalEnabled && status === "awaiting_final_payment";

  return (
    <section className="shrink-0 border-t border-border bg-background">
      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-lg border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted" />
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Campaign output
              </h2>
            </div>
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              Disclosure enforced
            </span>
          </div>

          {drafts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-2/70 px-4 py-10 text-center">
              <p className="text-sm text-muted">No drafts yet</p>
              <p className="mt-1 text-xs text-muted/80">
                Advance payment unlocks CreativeAgent
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-950">
                      Creator final copy review
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                      {readyForCreatorReview
                        ? "Final payment is confirmed. The creator can review the copy below and post manually."
                        : "Drafts are ready for review, but BrandPilot will not mark them ready to post until final payment clears."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {drafts.map((draft) => (
                  <article
                    key={draft.platform}
                    className="rounded-lg border border-border bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {draft.platform === "linkedin" ? "LinkedIn final copy" : "X thread final copy"}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          draft.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        }`}
                      >
                        {draft.status === "approved" ? "Brand approved" : "Brand review"}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap rounded-md bg-surface-2/80 p-3 text-xs leading-relaxed text-foreground">
                      {draft.content}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted" />
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Revenue gates
              </h2>
            </div>
            <div className="space-y-2">
              <PaymentRow label="Deal value" amount={payment.dealValue} />
              <PaymentRow
                label="Advance (50%)"
                amount={payment.advanceAmount}
                status={payment.advanceStatus}
              />
              <PaymentRow
                label="Final (50%)"
                amount={payment.finalAmount}
                status={payment.finalStatus}
              />
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800 ring-1 ring-amber-200">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Drafting requires advance paid. Ready-to-post requires final paid.
                </p>
              </div>
              <div className="flex gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[10px] leading-relaxed text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Creator keeps final posting control. BrandPilot prepares final copy, not auto-publish.
                </p>
              </div>
            </div>
          </div>

          {showPayPalButtons && showAdvancePayPal && onPaymentComplete && (
            <PayPalPaymentButton
              dealId={dealId}
              stage="advance"
              disabled={disabled}
              onComplete={onPaymentComplete}
              onError={onPaymentError}
            />
          )}

          {showPayPalButtons && showFinalPayPal && onPaymentComplete && (
            <PayPalPaymentButton
              dealId={dealId}
              stage="final"
              disabled={disabled}
              onComplete={onPaymentComplete}
              onError={onPaymentError}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function PaymentRow({
  label,
  amount,
  status,
}: {
  label: string;
  amount: number;
  status?: "paid" | "pending";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/80 px-3 py-2.5">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          £{amount.toLocaleString()}
        </span>
        {status && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              status === "paid"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-background text-muted ring-1 ring-border"
            }`}
          >
            {status === "paid" ? "Paid" : "Pending"}
          </span>
        )}
      </div>
    </div>
  );
}
