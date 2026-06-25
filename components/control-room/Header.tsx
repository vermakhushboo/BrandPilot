import type { CreatorProfile, DataSource } from "@/lib/types";
import { Database, WalletCards } from "lucide-react";

interface HeaderProps {
  creator: CreatorProfile;
  source: DataSource;
  paypalEnabled?: boolean;
}

export function Header({ creator, source, paypalEnabled }: HeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-white/95 px-4 py-3 shadow-sm shadow-slate-200/60 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-black text-white shadow-lg shadow-indigo-200">
          BP
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-semibold text-foreground">
              BrandPilot
            </h1>
            <span className="hidden rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:inline">
              Autonomous deal desk
            </span>
          </div>
          <p className="truncate text-xs text-muted">
            Qualifies, prices, negotiates, collects, drafts, and schedules creator campaigns.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 md:flex">
          {paypalEnabled && (
            <StatusBadge icon={<WalletCards className="h-3 w-3" />} label="PayPal sandbox" tone="blue" />
          )}
          <StatusBadge
            icon={<Database className="h-3 w-3" />}
            label={source === "supabase" ? "Supabase live" : "Demo data"}
            tone={source === "supabase" ? "green" : "amber"}
          />
        </div>
        <div className="hidden rounded-lg border border-border bg-white px-3 py-2 text-right shadow-sm sm:block">
          <p className="text-xs font-semibold text-foreground">{creator.name}</p>
          <p className="text-[10px] text-muted">{creator.handle} · {creator.followers}</p>
        </div>
      </div>
    </header>
  );
}

function StatusBadge({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "blue" | "green" | "amber";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-sky-50 text-sky-700 ring-sky-200"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${toneClass}`}
    >
      {icon}
      {label}
    </span>
  );
}
