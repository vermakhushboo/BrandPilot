import type { AgentContext } from "./types";

/** Payment constants used by deterministic business rules only. */
export const DEMO_RATES = {
  linkedin: 1000,
  x: 800,
  bundle: 1800,
  floor: 1400,
  advance: 900,
  final: 900,
  currency: "GBP",
} as const;

export function brandFitPrompt(ctx: AgentContext): string {
  return `You are BrandFitAgent for BrandPilot (creator deal desk).
Evaluate whether this brand sponsorship fits the creator's audience.
Brand URL: ${ctx.brandUrl}

Context:
${contextJson(ctx)}

Return strict JSON matching the schema.`;
}

export function researchTonePrompt(ctx: AgentContext): string {
  return `You are ResearchAgent (tone phase) for BrandPilot.
Extract the creator's writing voice from organic posts for sponsored content.

Organic posts:
${ctx.examplePosts.map((p, i) => `${i + 1}. ${p}`).join("\n\n")}

Creator: ${ctx.creator.name} (${ctx.creator.handle}), niche: ${ctx.creator.niche}.

Context:
${contextJson(ctx)}

Return strict JSON matching the schema.`;
}

export function researchMarketPrompt(ctx: AgentContext, fit: unknown, tone: unknown): string {
  const organic = ctx.calendarPosts
    .filter((p) => !p.isSponsored)
    .map((p) => `- ${p.title}: ${p.scheduledAt}`);

  return `You are ResearchAgent (market phase) for BrandPilot.
Produce market research, hooks, and proof points for a sponsored campaign.

Context:
${contextJson(ctx)}

Prior brand fit: ${JSON.stringify(fit ?? {})}
Tone profile: ${JSON.stringify(tone ?? {})}
Organic calendar:
${organic.join("\n")}

Return strict JSON matching the schema.`;
}

export function ratePrompt(ctx: AgentContext, fit: unknown): string {
  return `You are RateAgent for BrandPilot.
Price a sponsored package: 1 LinkedIn post + 5-tweet X thread. Currency GBP.

Context:
${contextJson(ctx)}

Brand fit research: ${JSON.stringify(fit ?? {})}
Creator rate card: ${JSON.stringify(ctx.creatorMeta.rates)}

Return strict JSON matching the schema.`;
}

export function negotiatorPrompt(ctx: AgentContext, rates: unknown, advance: number): string {
  return `You are NegotiatorAgent for BrandPilot.
Write a WhatsApp message to the brand presenting rates and requesting 50% advance (£${advance}).
Include 1 revision round and 48h draft turnaround.

Context:
${contextJson(ctx)}

Rate card: ${JSON.stringify(rates ?? {})}

Return strict JSON matching the schema.`;
}

export function creativePrompt(ctx: AgentContext, research: unknown): string {
  return `You are CreativeAgent for BrandPilot.
Draft a sponsored LinkedIn post + 5-tweet X thread in the creator's authentic voice.
Include FTC/ASA disclosure. No unsubstantiated performance claims.

Context:
${contextJson(ctx)}

Research bundle: ${JSON.stringify(research ?? {})}

Return strict JSON matching the schema.`;
}

export function calendarPrompt(ctx: AgentContext): string {
  const organic = ctx.calendarPosts
    .filter((p) => !p.isSponsored)
    .map((p) => ({ title: p.title, platform: p.platform, scheduledAt: p.scheduledAt }));

  return `You are CalendarFitAgent for BrandPilot.
Schedule sponsored LinkedIn + X slots avoiding organic post conflicts.
Prefer Thursday with LinkedIn AM and X PM separation.
scheduledAt must be ISO 8601.

Organic calendar:
${JSON.stringify(organic)}

Context:
${contextJson(ctx)}

Return strict JSON matching the schema.`;
}

export function safetyPrompt(ctx: AgentContext, linkedin: string, xDraft: string): string {
  return `You are SafetyAgent (content QA) for BrandPilot.
Review sponsored drafts for unsubstantiated claims, tone fit, and brand alignment.

Brand: ${ctx.deal.brandName}

LinkedIn draft:
${linkedin}

X draft:
${xDraft}

Return strict JSON matching the schema.`;
}

function contextJson(ctx: AgentContext): string {
  return JSON.stringify(
    {
      brand: ctx.deal.brandName,
      product: ctx.deal.product,
      creator: ctx.creator,
      rates: ctx.creatorMeta.rates,
      audience: ctx.creatorMeta.audience,
      brandMessages: ctx.brandMessages.slice(-5),
      fitScore: ctx.deal.fitScore,
      quotedRate: ctx.deal.quotedRate,
    },
    null,
    2,
  );
}
