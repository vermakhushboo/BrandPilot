import {
  allGatesPassed,
  evaluateDeterministicSafetyGates,
} from "@/lib/agents/business-rules";
import { getNextStatus } from "@/lib/state-machine";

import { safetyPrompt } from "./prompts";
import { callManusOrDemo, runManusStructuredTask } from "./manus-client";
import {
  loadAgentContext,
  MANUS_SAFETY_SCHEMA,
  persistAgentRun,
  safetyReviewSchema,
  type AgentRunResult,
  type SafetyReviewOutput,
} from "./types";

const AGENT = "SafetyAgent";

export async function runSafetyAgent(dealId: string): Promise<AgentRunResult> {
  const ctx = await loadAgentContext(dealId);
  const fromStatus = ctx.deal.status;

  if (fromStatus !== "drafting") {
    throw new Error(`${AGENT} cannot run at status ${fromStatus}`);
  }

  const linkedin = ctx.deal.drafts.find((d) => d.platform === "linkedin")?.content ?? "";
  const xDraft = ctx.deal.drafts.find((d) => d.platform === "x")?.content ?? "";

  const { mode, value } = await callManusOrDemo(
    () => demoSafetyReview(),
    () =>
      runManusStructuredTask<SafetyReviewOutput>(
        safetyPrompt(ctx, linkedin, xDraft),
        MANUS_SAFETY_SCHEMA,
        `BrandPilot safety — ${ctx.deal.brandName}`,
      ),
  );

  const aiReview = safetyReviewSchema.parse(value);
  const deterministic = evaluateDeterministicSafetyGates(ctx.deal, linkedin, xDraft);
  const aiGatePassed = aiReview.claimsOk && aiReview.toneOk;
  const passed = allGatesPassed(deterministic) && aiGatePassed;

  const checks = [
    ...deterministic,
    { gate: "ai_content_review", passed: aiGatePassed, detail: aiReview.aiSummary },
  ];

  const output = {
    mode,
    passed,
    checks,
    aiReview,
    summary: passed
      ? "Safety checks passed — ready for calendar fit"
      : "Safety checks failed — resolve gates before continuing",
  };

  if (!passed) {
    await persistAgentRun(dealId, AGENT, fromStatus, fromStatus, {}, output, "failed");
    return { agent: AGENT, fromStatus, toStatus: fromStatus, summary: output.summary };
  }

  const toStatus = getNextStatus(fromStatus)!;
  await persistAgentRun(dealId, AGENT, fromStatus, toStatus, {}, output);

  return { agent: AGENT, fromStatus, toStatus, summary: output.summary };
}

function demoSafetyReview(): SafetyReviewOutput {
  return {
    claimsOk: true,
    toneOk: true,
    aiIssues: [],
    aiSummary: "Drafts use experience-based wording without unsubstantiated claims.",
  };
}
