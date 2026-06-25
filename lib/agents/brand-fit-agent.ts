import { getNextStatus } from "@/lib/state-machine";

import { brandFitPrompt } from "./prompts";
import { callManusOrDemo, runManusStructuredTask } from "./manus-client";
import {
  brandFitSchema,
  loadAgentContext,
  MANUS_BRAND_FIT_SCHEMA,
  persistAgentRun,
  type AgentRunResult,
  type BrandFitOutput,
} from "./types";

const AGENT = "BrandFitAgent";

export async function runBrandFitAgent(dealId: string): Promise<AgentRunResult> {
  const ctx = await loadAgentContext(dealId);
  const fromStatus = ctx.deal.status;

  if (fromStatus !== "inbound") {
    throw new Error(`${AGENT} cannot run at status ${fromStatus}`);
  }

  const { mode, value } = await callManusOrDemo(
    () => demoBrandFit(ctx),
    () =>
      runManusStructuredTask<BrandFitOutput>(
        brandFitPrompt(ctx),
        MANUS_BRAND_FIT_SCHEMA,
        `BrandPilot fit — ${ctx.deal.brandName}`,
      ),
  );

  const parsed = brandFitSchema.parse(value);
  const toStatus = getNextStatus(fromStatus)!;
  const output = { ...parsed, mode, summary: `${parsed.verdict} — fit ${parsed.fitScore}/100` };

  await persistAgentRun(dealId, AGENT, fromStatus, toStatus, { brandUrl: ctx.brandUrl }, output);

  return { agent: AGENT, fromStatus, toStatus, summary: output.summary };
}

function demoBrandFit(ctx: Awaited<ReturnType<typeof loadAgentContext>>): BrandFitOutput {
  return {
    fitScore: 91,
    verdict: "accepted",
    rationale: `${ctx.deal.brandName} aligns with ${ctx.creator.name}'s ${ctx.creator.niche} audience.`,
    overlap: "76% senior engineers · 82% devtools interest",
    productSummary: `${ctx.deal.product}`,
    sponsorshipAngles: [
      `${ctx.deal.brandName} as an AI-native workflow for senior engineers`,
      "Compressing the inner dev loop without hype",
      "Honest eval-style sponsorship for launch window",
    ],
  };
}
