import { cn } from "@/lib/utils";

interface PanelShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function PanelShell({
  title,
  subtitle,
  icon,
  badge,
  className,
  bodyClassName,
  children,
}: PanelShellProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm shadow-slate-200/70",
        className,
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="mt-1 truncate text-sm font-medium text-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {badge}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
