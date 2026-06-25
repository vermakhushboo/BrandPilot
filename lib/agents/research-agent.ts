import { getNextStatus } from "@/lib/state-machine";

import { researchMarketPrompt, researchTonePrompt } from "./prompts";
import { callManusOrDemo, runManusStructuredTask } from "./manus-client";
import {
  loadAgentContext,
  MANUS_RESEARCH_MARKET_SCHEMA,
  MANUS_RESEARCH_TONE_SCHEMA,
  persistAgentRun,
  priorOutput,
  researchMarketSchema,
  researchToneSchema,
  type AgentRunResult,
  type BrandFitOutput,
  type ResearchMarketOutput,
  type ResearchToneOutput,
} from "./types";

const AGENT = "ResearchAgent";

/** Tone extraction at advance_paid, market research at researching. */
export async function runResearchAgent(dealId: string): Promise<AgentRunResult> {
  const ctx = await loadAgentContext(dealId);
  const fromStatus = ctx.deal.status;

  if (fromStatus === "advance_paid") {
    return runTonePhase(dealId, ctx);
  }
  if (fromStatus === "researching") {
    return runMarketPhase(dealId, ctx);
  }

  throw new Error(`${AGENT} cannot run at status ${fromStatus}`);
}

async function runTonePhase(
  dealId: string,
  ctx: Awaited<ReturnType<typeof loadAgentContext>>,
): Promise<AgentRunResult> {
  const fromStatus = ctx.deal.status;

  const { mode, value } = await callManusOrDemo(
    () => demoTone(ctx),
    () =>
      runManusStructuredTask<ResearchToneOutput>(
        researchTonePrompt(ctx),
        MANUS_RESEARCH_TONE_SCHEMA,
        "BrandPilot tone extraction",
      ),
  );

  const parsed = researchToneSchema.parse(value);
  const toStatus = getNextStatus(fromStatus)!;
  const output = { ...parsed, mode, phase: "tone", summary: `Tone profile locked (${mode})` };

  await persistAgentRun(dealId, AGENT, fromStatus, toStatus, { posts: ctx.examplePosts.length }, output);

  return { agent: AGENT, fromStatus, toStatus, summary: output.summary };
}

async function runMarketPhase(
  dealId: string,
  ctx: Awaited<ReturnType<typeof loadAgentContext>>,
): Promise<AgentRunResult> {
  const fromStatus = ctx.deal.status;
  const fit = priorOutput<BrandFitOutput>(ctx, "BrandFitAgent");
  const tone = priorOutput<ResearchToneOutput>(ctx, "ResearchAgent");

  const { mode, value } = await callManusOrDemo(
    () => demoMarket(ctx),
    () =>
      runManusStructuredTask<ResearchMarketOutput>(
        researchMarketPrompt(ctx, fit, tone),
        MANUS_RESEARCH_MARKET_SCHEMA,
        `BrandPilot market — ${ctx.deal.brandName}`,
      ),
  );

  const parsed = researchMarketSchema.parse(value);
  const toStatus = getNextStatus(fromStatus)!;
  const output = {
    ...parsed,
    mode,
    phase: "market",
    summary: `Market research complete (${mode})`,
  };

  await persistAgentRun(dealId, AGENT, fromStatus, toStatus, { phase: "market" }, output);

  return { agent: AGENT, fromStatus, toStatus, summary: output.summary };
}

function demoTone(ctx: Awaited<ReturnType<typeof loadAgentContext>>): ResearchToneOutput {
  return {
    voiceSummary: `Direct, experience-led ${ctx.creator.niche} voice — practical, skeptical of hype.`,
    toneMarkers: ["experience-based", "specific", "no hype"],
    sentenceStyle: "Short paragraphs; numbered bullets on LinkedIn; thread hooks on X",
    vocabularyLevel: "Technical but accessible",
    disclosurePattern: `#ad Partnered with ${ctx.deal.brandName} — opinions are my own.`,
    sampleOpeners: ["I've been testing this for the past week as my daily driver."],
  };
}

function demoMarket(ctx: Awaited<ReturnType<typeof loadAgentContext>>): ResearchMarketOutput {
  const brand = ctx.deal.brandName;
  return {
    primaryAngle: `${brand} as the AI-native IDE that removes context-switching`,
    hooks: [
      "Ship without leaving the editor",
      `From prompt to PR with ${brand}`,
      "Why senior engineers want one surface for code and agents",
    ],
    proofPoints: [
      "Audience skews staff+ engineers evaluating AI coding tools",
      "Launch window aligns with organic devtools calendar",
    ],
    trendingTopics: ["AI agent evals", "Inner dev loop", "DevTools launches"],
    optimalTiming: "Thursday AM LinkedIn + Thursday afternoon X",
    marketNotes: "Lead with experience-based claims; avoid performance guarantees.",
  };
}
