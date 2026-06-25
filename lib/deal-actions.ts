import * as store from "@/lib/data/brandpilot-store";
import {
  paymentAgentIssueOrder,
  runAgentLoopUntilBlocked,
  runNextAgentStep as engineRunNextAgentStep,
} from "@/lib/agents/engine";
import {
  DEMO_CALENDAR_POSTS,
  INBOUND_DEAL,
  SPONSORED_CALENDAR_SLOT,
} from "@/lib/seed";
import { DEMO_RATES } from "@/lib/agents/prompts";

export async function runNextAgentStep(dealId: string): Promise<void> {
  await engineRunNextAgentStep(dealId);
}

export async function startAutonomousDeal(dealId: string): Promise<void> {
  await store.resetActiveDealForAutonomousStart(dealId);
  await runAgentLoopUntilBlocked(dealId);
}

export async function simulateAdvancePaid(dealId: string): Promise<void> {
  const deal = await store.getActiveDeal();
  if (!deal || deal.id !== dealId) return;

  if (deal.status !== "awaiting_advance_payment") {
    await store.appendAgentRun(
      dealId,
      "PaymentAgent",
      "failed",
      {},
      { action: "Advance simulation only available at Awaiting Advance Payment" },
    );
    return;
  }

  const amount = deal.payment.advanceAmount || DEMO_RATES.advance;

  await store.updatePaymentStatus(dealId, "advance", "paid");
  await store.updateDealStatus(dealId, "advance_paid");
  await store.appendAgentRun(
    dealId,
    "PaymentAgent",
    "completed",
    { amount, currency: DEMO_RATES.currency },
    {
      action: "Verified advance payment — gate cleared for drafting",
      summary: `Advance £${amount} verified. ResearchAgent cleared to run.`,
    },
  );
  await store.appendMessage(dealId, "inbound", "whatsapp", "Advance paid ✓");
}

export async function approveBrandDraft(dealId: string): Promise<void> {
  const deal = await store.getActiveDeal();
  if (!deal || deal.id !== dealId) return;

  if (deal.status !== "brand_review") {
    await store.appendAgentRun(
      dealId,
      "SafetyAgent",
      "failed",
      {},
      { action: "Draft approval only available at Brand Review" },
    );
    return;
  }

  await store.saveApproval(dealId, "draft", "approved", "Brand approved all drafts");
  await store.updateDealStatus(dealId, "awaiting_final_payment");
  const issued = await paymentAgentIssueOrder(dealId, "final");

  await store.appendAgentRun(
    dealId,
    "SafetyAgent",
    "completed",
    {},
    {
      action: "Brand approved drafts — PaymentAgent issued final PayPal invoice",
      summary: issued.summary,
      paypalOrderId: issued.orderId,
    },
  );
  await store.appendMessage(
    dealId,
    "inbound",
    "whatsapp",
    "Drafts approved! Please send the final invoice for the remaining 50%.",
  );
}

export async function simulateFinalPaid(dealId: string): Promise<void> {
  const deal = await store.getActiveDeal();
  if (!deal || deal.id !== dealId) return;

  if (deal.status !== "awaiting_final_payment") {
    await store.appendAgentRun(
      dealId,
      "PaymentAgent",
      "failed",
      {},
      { action: "Final payment simulation only available at Awaiting Final Payment" },
    );
    return;
  }

  await store.updatePaymentStatus(dealId, "final", "paid");
  await store.updateDealStatus(dealId, "final_paid");
  await store.appendAgentRun(
    dealId,
    "PaymentAgent",
    "completed",
    { amount: DEMO_RATES.final, currency: DEMO_RATES.currency },
    {
      action: "Final payment captured",
      summary: `Final £${DEMO_RATES.final} verified. Agent loop will advance to ready to post.`,
    },
  );
  await store.appendMessage(dealId, "inbound", "whatsapp", "Final payment sent ✓");
}

export { DEMO_CALENDAR_POSTS, SPONSORED_CALENDAR_SLOT, INBOUND_DEAL };
export { runAgentLoopUntilBlocked } from "@/lib/agents/engine";
