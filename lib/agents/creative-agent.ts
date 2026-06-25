import * as store from "@/lib/data/brandpilot-store";

import { creativePrompt } from "./prompts";
import { callManusOrDemo, runManusStructuredTask } from "./manus-client";
import {
  creativeOutputSchema,
  loadAgentContext,
  MANUS_CREATIVE_SCHEMA,
  persistAgentRun,
  priorOutput,
  type AgentRunResult,
  type BrandFitOutput,
  type CreativeOutput,
  type ResearchMarketOutput,
  type ResearchToneOutput,
} from "./types";

const AGENT = "CreativeAgent";

export async function runCreativeAgent(dealId: string): Promise<AgentRunResult> {
  const ctx = await loadAgentContext(dealId);
  const fromStatus = ctx.deal.status;

  if (fromStatus !== "drafting") {
    throw new Error(`${AGENT} cannot run at status ${fromStatus}`);
  }

  const research = {
    fit: priorOutput<BrandFitOutput>(ctx, "BrandFitAgent"),
    tone: priorOutput<ResearchToneOutput>(ctx, "ResearchAgent"),
    market: priorOutput<ResearchMarketOutput>(ctx, "ResearchAgent"),
  };

  const { mode, value } = await callManusOrDemo(
    () => demoCreative(ctx),
    () =>
      runManusStructuredTask<CreativeOutput>(
        creativePrompt(ctx, research),
        MANUS_CREATIVE_SCHEMA,
        `BrandPilot creative — ${ctx.deal.brandName}`,
      ),
  );

  const parsed = creativeOutputSchema.parse(value);
  await store.saveDraft(dealId, "linkedin", parsed.linkedinPost, parsed.mediaPrompt);
  await store.saveDraft(dealId, "x", parsed.xThread, parsed.mediaPrompt);

  const output = { ...parsed, mode, summary: parsed.summary };
  await persistAgentRun(dealId, AGENT, fromStatus, fromStatus, { brand: ctx.deal.brandName }, output);

  return { agent: AGENT, fromStatus, toStatus: fromStatus, summary: output.summary };
}

function demoCreative(ctx: Awaited<ReturnType<typeof loadAgentContext>>): CreativeOutput {
  const brand = ctx.deal.brandName;
  const disclosure = `#ad Partnered with ${brand} — opinions are my own.`;
  return {
    disclosure,
    linkedinPost: `${disclosure}\n\nI've been testing ${brand} for the past week.\n\nThree workflow changes:\n▸ Agent-native edits\n▸ Single surface for code + terminal\n▸ Faster iteration on small PRs`,
    xThread: `${disclosure}\n\n🧵 Honest take on ${brand}:\n\n1/ Shorter inner loop.\n2/ Scoped agent tasks.\n3/ Full-stack context.\n4/ Cautious on huge refactors.\n5/ Launch worth watching.`,
    mediaPrompt: `Desk setup showing ${brand}, warm natural light`,
    summary: "LinkedIn post, X thread, disclosure, and media prompt generated.",
  };
}
