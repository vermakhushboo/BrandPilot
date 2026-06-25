import { enforceMinimumBundle, splitPaymentAmounts } from "@/lib/agents/business-rules";
import { getNextStatus } from "@/lib/state-machine";

import { ratePrompt } from "./prompts";
import { callManusOrDemo, runManusStructuredTask } from "./manus-client";
import {
  loadAgentContext,
  MANUS_RATE_SCHEMA,
  persistAgentRun,
  priorOutput,
  rateOutputSchema,
  type AgentRunResult,
  type BrandFitOutput,
  type RateOutput,
} from "./types";

const AGENT = "RateAgent";

export async function runRateAgent(dealId: string): Promise<AgentRunResult> {
  const ctx = await loadAgentContext(dealId);
  const fromStatus = ctx.deal.status;

  if (fromStatus !== "brand_fit_check") {
    throw new Error(`${AGENT} cannot run at status ${fromStatus}`);
  }

  const fit = priorOutput<BrandFitOutput>(ctx, "BrandFitAgent");

  const { mode, value } = await callManusOrDemo(
    () => demoRate(ctx),
    () =>
      runManusStructuredTask<RateOutput>(
        ratePrompt(ctx, fit),
        MANUS_RATE_SCHEMA,
        `BrandPilot rate — ${ctx.deal.brandName}`,
      ),
  );

  let parsed = rateOutputSchema.parse(value);
  const bundle = enforceMinimumBundle(parsed.bundle);
  if (bundle !== parsed.bundle) {
    parsed = { ...parsed, bundle, rationale: `${parsed.rationale} (raised to £${bundle} floor)` };
  }

  const toStatus = getNextStatus(fromStatus)!;
  const output = {
    ...parsed,
    mode,
    summary: `LinkedIn £${parsed.linkedin}, X £${parsed.x}, bundle £${parsed.bundle}`,
  };

  await persistAgentRun(dealId, AGENT, fromStatus, toStatus, { product: ctx.deal.product }, output);

  return { agent: AGENT, fromStatus, toStatus, summary: output.summary };
}

function demoRate(ctx: Awaited<ReturnType<typeof loadAgentContext>>): RateOutput {
  const { advance } = splitPaymentAmounts(1800);
  void advance;
  return {
    linkedin: 1000,
    x: 800,
    bundle: 1800,
    currency: "GBP",
    rationale: `Standard bundle for 1 LinkedIn + 5-tweet X thread for ${ctx.deal.brandName}.`,
  };
}
