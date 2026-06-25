"use client";

import { useCallback, useState, useTransition } from "react";

import { PayPalProvider } from "@/components/paypal-payment-button";
import {
  apiApproveBrandDraft,
  apiRunNext,
  apiSimulateAdvancePaid,
  apiSimulateFinalPaid,
  apiStartAutonomousDeal,
} from "@/lib/api/control-room-client";
import { getCalendarPostsForDeal } from "@/lib/calendar-utils";
import type { ControlRoomData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionBar } from "./ActionBar";
import { AgentLogPanel } from "./AgentLogPanel";
import { BrandInboxPanel } from "./BrandInboxPanel";
import { CalendarPanel } from "./CalendarPanel";
import { ConversationPanel } from "./ConversationPanel";
import { DealStatusBar } from "./DealStatusBar";
import { DraftsPanel } from "./DraftsPanel";
import { Header } from "./Header";
import { PaymentGateBanner } from "./PaymentGateBanner";
import { PipelinePanel } from "./PipelinePanel";

interface ControlRoomClientProps {
  initialData: ControlRoomData;
  paypalEnabled: boolean;
  paypalClientId: string | null;
  paypalCurrency: string;
}

type WorkspaceTab = "overview" | "chat" | "agents" | "output";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "chat", label: "Brand chat" },
  { id: "agents", label: "Agent log" },
  { id: "output", label: "Drafts & pay" },
];

function isPaymentGateStatus(status: string) {
  return status === "awaiting_advance_payment" || status === "awaiting_final_payment";
}

export function ControlRoomClient({
  initialData,
  paypalEnabled,
  paypalClientId,
  paypalCurrency,
}: ControlRoomClientProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>(() =>
    isPaymentGateStatus(initialData.deal.status) ? "output" : "overview",
  );
  const [isPending, startTransition] = useTransition();

  const calendarPosts = getCalendarPostsForDeal(data.calendarPosts, data.deal);
  const showPayPal = paypalEnabled && Boolean(paypalClientId);
  const atPaymentGate =
    data.deal.status === "awaiting_advance_payment" ||
    data.deal.status === "awaiting_final_payment";

  const runAction = useCallback(
    (action: (dealId: string) => Promise<ControlRoomData>) => {
      startTransition(async () => {
        try {
          setError(null);
          const next = await action(data.deal.id);
          setData(next);
          if (isPaymentGateStatus(next.deal.status)) {
            setTab("output");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Action failed");
        }
      });
    },
    [data.deal.id],
  );

  const handlePaymentComplete = useCallback((next: ControlRoomData) => {
    setError(null);
    setData(next);
  }, []);

  const handlePaymentError = useCallback((message: string) => {
    setError(message);
  }, []);

  const paymentBanner = (
    <PaymentGateBanner
      status={data.deal.status}
      dealId={data.deal.id}
      advanceAmount={data.deal.payment.advanceAmount}
      finalAmount={data.deal.payment.finalAmount}
      paypalEnabled={showPayPal}
      disabled={isPending}
      onPaymentComplete={handlePaymentComplete}
      onPaymentError={handlePaymentError}
      onSimulate={
        data.deal.status === "awaiting_advance_payment"
          ? () => runAction(apiSimulateAdvancePaid)
          : data.deal.status === "awaiting_final_payment"
            ? () => runAction(apiSimulateFinalPaid)
            : undefined
      }
    />
  );

  const draftsPanel = (
    <DraftsPanel
      deal={data.deal}
      dealId={data.deal.id}
      paypalEnabled={showPayPal}
      showPayPalButtons={!atPaymentGate}
      disabled={isPending}
      onPaymentComplete={handlePaymentComplete}
      onPaymentError={handlePaymentError}
    />
  );

  const inner = (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <Header
          creator={data.creator}
          source={data.source}
          paypalEnabled={showPayPal}
        />
        <DealStatusBar
          deal={data.deal}
          isRunning={isPending}
          paypalEnabled={showPayPal}
          error={error}
        />
        <ActionBar
          status={data.deal.status}
          disabled={isPending}
          paypalEnabled={showPayPal}
          onStartAutonomous={() => runAction(apiStartAutonomousDeal)}
          onNextStep={() => runAction(apiRunNext)}
          onSimulateAdvance={() => runAction(apiSimulateAdvancePaid)}
          onApproveDraft={() => runAction(apiApproveBrandDraft)}
          onSimulateFinal={() => runAction(apiSimulateFinalPaid)}
        />
        {paymentBanner}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border bg-white/95 px-3 py-2 lg:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
              atPaymentGate && t.id === "output" && tab !== "output" && "ring-1 ring-amber-500/40",
            )}
          >
            {t.label}
            {atPaymentGate && t.id === "output" && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            )}
          </button>
        ))}
      </div>

      <main
        className={cn(
          "mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6",
          isPending && "pointer-events-none opacity-70",
        )}
      >
        <BrandInboxPanel activeDeal={data.deal} />

        <div className="hidden grid-cols-12 gap-4 lg:grid">
          <div className="col-span-4 xl:col-span-3">
            <ConversationPanel deal={data.deal} />
          </div>
          <div className="col-span-8 xl:col-span-6 flex flex-col gap-4">
            <PipelinePanel deal={data.deal} />
            <CalendarPanel posts={calendarPosts} />
          </div>
          <div className="col-span-12 xl:col-span-3">
            <AgentLogPanel logs={data.deal.agentLogs} />
          </div>
        </div>

        <div className="lg:hidden">
          {tab === "overview" && (
            <div className="flex flex-col gap-4">
              <PipelinePanel deal={data.deal} />
              <CalendarPanel posts={calendarPosts} />
            </div>
          )}
          {tab === "chat" && <ConversationPanel deal={data.deal} />}
          {tab === "agents" && <AgentLogPanel logs={data.deal.agentLogs} />}
          {tab === "output" && draftsPanel}
        </div>

        <div className="hidden lg:block">{draftsPanel}</div>
      </main>
    </div>
  );

  if (showPayPal && paypalClientId) {
    return (
      <PayPalProvider clientId={paypalClientId} currency={paypalCurrency}>
        {inner}
      </PayPalProvider>
    );
  }

  return inner;
}
