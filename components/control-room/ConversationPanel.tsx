import type { Deal } from "@/lib/types";

import { PanelShell } from "./PanelShell";

interface ConversationPanelProps {
  deal: Deal;
}

export function ConversationPanel({ deal }: ConversationPanelProps) {
  return (
    <PanelShell
      title="Brand thread"
      subtitle={deal.product}
      className="border-border bg-white"
      badge={
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-base font-semibold text-emerald-700 ring-2 ring-emerald-200">
          {deal.brandLogo ?? deal.brandName.charAt(0)}
        </div>
      }
      bodyClassName="p-4 space-y-3 chat-bg"
    >
      {deal.messages.length === 0 ? (
        <p className="py-12 text-center text-xs text-muted">
          No messages yet — start the autonomous deal flow
        </p>
      ) : (
        deal.messages.map((msg) => {
          const isBrand = msg.sender === "brand";
          const isAgent = msg.sender === "agent";

          return (
            <div
              key={msg.id}
              className={`flex ${isBrand ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-3.5 py-2.5 shadow-sm ring-1 ${
                  isBrand
                    ? "rounded-tl-sm bg-white text-slate-800 ring-slate-200"
                    : "rounded-tr-sm bg-emerald-600 text-white ring-emerald-600"
                }`}
              >
                {isAgent && (
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-100">
                    BrandPilot
                  </p>
                )}
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                  {msg.text}
                </p>
                <p className={`mt-1.5 text-[10px] ${isBrand ? "text-muted" : "text-emerald-100/80"}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          );
        })
      )}
    </PanelShell>
  );
}
