import { splitPaymentAmounts } from "@/lib/agents/business-rules";
import { getNextStatus } from "@/lib/state-machine";

import { negotiatorPrompt } from "./prompts";
import { callManusOrDemo, runManusStructuredTask } from "./manus-client";
import {
  loadAgentContext,
  MANUS_NEGOTIATOR_SCHEMA,
  negotiatorOutputSchema,
  persistAgentRun,
  priorOutput,
  sendBrandMessage,
  type AgentRunResult,
  type NegotiatorOutput,
  type RateOutput,
} from "./types";

const AGENT = "NegotiatorAgent";

export async function runNegotiatorAgent(dealId: string): Promise<AgentRunResult> {
  const ctx = await loadAgentContext(dealId);
  const fromStatus = ctx.deal.status;

  if (fromStatus !== "rate_quote") {
    throw new Error(`${AGENT} cannot run at status ${fromStatus}`);
  }

  const rates = priorOutput<RateOutput>(ctx, "RateAgent");
  const { advance } = splitPaymentAmounts(rates?.bundle ?? ctx.deal.quotedRate ?? 1800);

  const { mode, value } = await callManusOrDemo(
    () => demoNegotiator(ctx, advance),
    () =>
      runManusStructuredTask<NegotiatorOutput>(
        negotiatorPrompt(ctx, rates, advance),
        MANUS_NEGOTIATOR_SCHEMA,
        `BrandPilot negotiate — ${ctx.deal.brandName}`,
      ),
  );

  const parsed = negotiatorOutputSchema.parse(value);
  const toStatus = getNextStatus(fromStatus)!;
  const output = { ...parsed, mode, summary: parsed.summary };

  await persistAgentRun(dealId, AGENT, fromStatus, toStatus, {}, output);
  await sendBrandMessage(dealId, parsed.message);

  return { agent: AGENT, fromStatus, toStatus, summary: output.summary };
}

function demoNegotiator(
  ctx: Awaited<ReturnType<typeof loadAgentContext>>,
  advance: number,
): NegotiatorOutput {
  return {
    quotedBundle: 1800,
    advanceRequested: advance,
    terms: "1 revision round · 48h draft turnaround · 50% advance to start",
    summary: `Presented bundle at £1800 with £${advance} advance.`,
    message: `Thanks for confirming! Our all-in rate is £1800 for 1 LinkedIn post + 5-tweet X thread (one revision, 48h turnaround). Please send £${advance} advance to kick off — we'll start research and drafts once it clears.`,
  };
}
