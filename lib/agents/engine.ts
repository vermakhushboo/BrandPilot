import * as store from "@/lib/data/brandpilot-store";
import { brandCampaignConfirmedMessage, brandPaymentInvoiceMessage } from "@/lib/agents/brand-messages";
import { DEMO_RATES } from "@/lib/agents/prompts";
import { createPayPalOrder, type PayPalPaymentStage } from "@/lib/paypal";
import { getNextStatus, isBlockedStatus, type DealStatus } from "@/lib/state-machine";
import type { Deal } from "@/lib/types";

import { runBrandFitAgent } from "./brand-fit-agent";
import { runCalendarFitAgent } from "./calendar-fit-agent";
import { runCreativeAgent } from "./creative-agent";
import { runNegotiatorAgent } from "./negotiator-agent";
import { runRateAgent } from "./rate-agent";
import { runResearchAgent } from "./research-agent";
import { runSafetyAgent } from "./safety-agent";
import {
  loadAgentContext,
  priorOutput,
  sendBrandMessage,
  type AgentRunResult,
  type CalendarOutput,
} from "./types";

const LOOP_BLOCKED: DealStatus[] = [
  "awaiting_advance_payment",
  "brand_review",
  "awaiting_final_payment",
  "ready_to_post",
];

const MAX_LOOP_ITERATIONS = 24;

export type { AgentRunResult };

async function logOrchestrator(
  dealId: string,
  status: DealStatus,
  output: Record<string, unknown>,
): Promise<void> {
  await store.appendAgentRun(dealId, "Orchestrator", "completed", { status }, output);
}

async function dispatchAgent(dealId: string, deal: Deal): Promise<AgentRunResult | null> {
  switch (deal.status) {
    case "inbound":
      return runBrandFitAgent(dealId);
    case "brand_fit_check":
      return runRateAgent(dealId);
    case "rate_quote":
      return runNegotiatorAgent(dealId);
    case "negotiating":
      return runPaymentAgent(dealId);
    case "advance_paid":
    case "researching":
      return runResearchAgent(dealId);
    case "drafting": {
      await runCreativeAgent(dealId);
      return runSafetyAgent(dealId);
    }
    case "calendar_fit":
      return runCalendarFitAgent(dealId);
    case "final_paid":
      return runFinalPaidAgent(dealId);
    default:
      return null;
  }
}

/** Deterministic payment agent — issues PayPal invoice, not AI-generated. */
export async function runPaymentAgent(dealId: string): Promise<AgentRunResult> {
  const ctx = await loadAgentContext(dealId);
  const fromStatus = ctx.deal.status;

  if (fromStatus !== "negotiating") {
    throw new Error(`PaymentAgent cannot run at status ${fromStatus}`);
  }

  const toStatus = getNextStatus(fromStatus)!;
  const issued = await paymentAgentIssueOrder(dealId, "advance");

  await store.updateDealStatus(dealId, toStatus);
  await store.appendAgentRun(
    dealId,
    "PaymentAgent",
    "completed",
    { bundle: ctx.deal.quotedRate ?? DEMO_RATES.bundle },
    {
      action: issued.summary,
      summary: issued.summary,
      paypalOrderId: issued.orderId,
      fromStatus,
      toStatus,
    },
  );

  return { agent: "PaymentAgent", fromStatus, toStatus, summary: issued.summary };
}

export async function paymentAgentIssueOrder(
  dealId: string,
  stage: PayPalPaymentStage,
): Promise<{ orderId: string; mode: string; summary: string }> {
  const deal = await store.getActiveDeal();
  if (!deal || deal.id !== dealId) throw new Error("Deal not found");

  const paypalOrder = await createPayPalOrder({ dealId, stage });

  await store.createPayment(dealId, stage, paypalOrder.amount, {
    paypal_order_id: paypalOrder.orderId,
    paypalOrderId: paypalOrder.orderId,
    paypalMode: paypalOrder.mode,
    paypalStatus: paypalOrder.status,
    currency: paypalOrder.currency,
  });

  const summary = `${stage} invoice issued — £${paypalOrder.amount} (${paypalOrder.mode})`;
  await sendBrandMessage(dealId, brandPaymentInvoiceMessage(stage, paypalOrder.amount));

  return { orderId: paypalOrder.orderId, mode: paypalOrder.mode, summary };
}

async function runFinalPaidAgent(dealId: string): Promise<AgentRunResult> {
  const ctx = await loadAgentContext(dealId);
  const fromStatus = ctx.deal.status;

  if (fromStatus !== "final_paid") {
    throw new Error(`PaymentAgent cannot run at status ${fromStatus}`);
  }

  const calendar = priorOutput<CalendarOutput>(ctx, "CalendarFitAgent");
  const linkedinLabel = calendar?.slots[0]?.label ?? "Thu 10:00";
  const xLabel = calendar?.slots[1]?.label ?? "Thu 15:30";

  const toStatus = getNextStatus(fromStatus)!;
  await store.updateDealStatus(dealId, toStatus);
  await store.appendAgentRun(
    dealId,
    "PaymentAgent",
    "completed",
    {},
    { summary: "Final payment confirmed — ready to post", fromStatus, toStatus },
  );
  await sendBrandMessage(dealId, brandCampaignConfirmedMessage(linkedinLabel, xLabel));

  return {
    agent: "PaymentAgent",
    fromStatus,
    toStatus,
    summary: "Final payment confirmed — ready to post",
  };
}

export async function runNextAgentStep(dealId: string): Promise<AgentRunResult | null> {
  const deal = await store.getActiveDeal();
  if (!deal || deal.id !== dealId) return null;

  if (isBlockedStatus(deal.status)) {
    await logOrchestrator(dealId, deal.status, {
      action: `Blocked at ${deal.status} — waiting for external action`,
      summary: `Pipeline paused at ${deal.status}`,
      fromStatus: deal.status,
      toStatus: deal.status,
    });
    return null;
  }

  if (deal.status === "completed") return null;

  return dispatchAgent(dealId, deal);
}

export async function runAgentLoopUntilBlocked(
  dealId: string,
): Promise<AgentRunResult[]> {
  const results: AgentRunResult[] = [];
  let guard = 0;

  while (guard < MAX_LOOP_ITERATIONS) {
    const deal = await store.getActiveDeal();
    if (!deal || deal.id !== dealId) break;

    if (LOOP_BLOCKED.includes(deal.status) || deal.status === "completed") {
      await logOrchestrator(dealId, deal.status, {
        action: `Agent loop paused at ${deal.status}`,
        summary: `Autonomous run stopped at gate: ${deal.status}`,
        fromStatus: deal.status,
        toStatus: deal.status,
      });
      break;
    }

    const result = await runNextAgentStep(dealId);
    if (!result) break;

    results.push(result);

    const updated = await store.getActiveDeal();
    if (updated && LOOP_BLOCKED.includes(updated.status)) break;

    guard += 1;
  }

  return results;
}

export {
  runBrandFitAgent,
  runRateAgent,
  runNegotiatorAgent,
  runResearchAgent,
  runCreativeAgent,
  runCalendarFitAgent,
  runSafetyAgent,
};
