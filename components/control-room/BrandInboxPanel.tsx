import type { Deal } from "@/lib/types";
import { CheckCircle2, Clock3, Inbox, Sparkles, XCircle } from "lucide-react";

interface BrandInboxPanelProps {
  activeDeal: Deal;
}

const REQUESTS = [
  {
    brand: "Atoms",
    product: "AI IDE launch",
    value: "£1.8k",
    status: "Active demo",
    tone: "green",
    detail: "Strong devtools fit · LinkedIn + X thread",
  },
  {
    brand: "sent.dm",
    product: "Outbound agent launch",
    value: "£1.2k est.",
    status: "Queued",
    tone: "blue",
    detail: "Needs fit check after Atoms clears",
  },
  {
    brand: "CryptoYield Pro",
    product: "Trading campaign",
    value: "Rejected",
    status: "Policy block",
    tone: "red",
    detail: "Fails creator safety rules",
  },
];

export function BrandInboxPanel({ activeDeal }: BrandInboxPanelProps) {
  const completed = activeDeal.payment.finalStatus === "paid";
  const collected =
    (activeDeal.payment.advanceStatus === "paid" ? activeDeal.payment.advanceAmount : 0) +
    (activeDeal.payment.finalStatus === "paid" ? activeDeal.payment.finalAmount : 0);

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-lg border border-border bg-white p-4 shadow-sm shadow-slate-200/70">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Brand request inbox
              </h2>
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              Creator has 3 inbound sponsorship requests
            </p>
          </div>
          <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">
            Demo: Atoms
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {REQUESTS.map((request) => (
            <article
              key={request.brand}
              className={`rounded-lg border p-3 ${
                request.tone === "green"
                  ? "border-emerald-200 bg-emerald-50"
                  : request.tone === "red"
                    ? "border-red-200 bg-red-50"
                    : "border-border bg-surface-2/70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{request.brand}</p>
                  <p className="text-xs text-muted">{request.product}</p>
                </div>
                {request.tone === "red" ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : request.tone === "green" ? (
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                ) : (
                  <Clock3 className="h-4 w-4 text-sky-700" />
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">{request.value}</span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-border">
                  {request.status}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{request.detail}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white p-4 shadow-sm shadow-slate-200/70">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Business snapshot
          </h2>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Pipeline" value="£3.0k+" />
          <Metric label="Collected" value={`£${collected.toLocaleString()}`} />
          <Metric label="Ready" value={completed ? "Yes" : "No"} />
        </div>
        <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted">
          BrandPilot runs the active request autonomously, while unsafe or lower-priority requests stay queued for later review.
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/70 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
