import type { AgentLogEntry } from "@/lib/types";

import { PanelShell } from "./PanelShell";

interface AgentLogPanelProps {
  logs: AgentLogEntry[];
}

const AGENT_COLORS: Record<string, string> = {
  BrandFitAgent: "text-violet-700 bg-violet-50",
  ResearchAgent: "text-cyan-700 bg-cyan-50",
  RateAgent: "text-amber-700 bg-amber-50",
  NegotiatorAgent: "text-sky-700 bg-sky-50",
  PaymentAgent: "text-emerald-700 bg-emerald-50",
  CreativeAgent: "text-pink-700 bg-pink-50",
  CalendarFitAgent: "text-indigo-700 bg-indigo-50",
  SafetyAgent: "text-orange-700 bg-orange-50",
  Orchestrator: "text-fuchsia-700 bg-fuchsia-50",
};

export function AgentLogPanel({ logs }: AgentLogPanelProps) {
  const reversed = [...logs].reverse();

  return (
    <PanelShell
      title="Agent activity"
      subtitle={`${logs.length} actions logged`}
      bodyClassName="p-3"
    >
      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No agent runs yet</p>
          <p className="mt-1 text-xs text-muted">Run the company to see decisions, gates, and evidence.</p>
        </div>
      ) : (
        <ul className="relative space-y-3 before:absolute before:left-3 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
          {reversed.map((log) => {
            const colorClass =
              AGENT_COLORS[log.agent] ?? "text-muted bg-surface-2";

            return (
              <li
                key={log.id}
                className="relative grid grid-cols-[1.5rem_1fr] gap-3"
              >
                <div className="relative z-10 mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                </div>
                <div className="rounded-lg border border-border bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}
                    >
                      {log.agent}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground">
                    {log.action}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PanelShell>
  );
}
