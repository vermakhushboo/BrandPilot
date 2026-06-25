import { z } from "zod";

import * as store from "@/lib/data/brandpilot-store";
import { DEMO_CALENDAR_POSTS } from "@/lib/seed";
import type { DealStatus } from "@/lib/state-machine";
import type { CalendarPost, CreatorProfile, Deal } from "@/lib/types";

import { inferBrandUrl, type ManusMode } from "./manus-client";

// ---------------------------------------------------------------------------
// Runtime result
// ---------------------------------------------------------------------------

export interface AgentRunResult {
  agent: string;
  fromStatus: DealStatus;
  toStatus: DealStatus;
  summary: string;
}

// ---------------------------------------------------------------------------
// Runtime context (loaded from Supabase / memory store)
// ---------------------------------------------------------------------------

export interface CreatorMeta {
  rates: Record<string, unknown>;
  audience: Record<string, unknown>;
}

export interface AgentContext {
  deal: Deal;
  creator: CreatorProfile;
  creatorMeta: CreatorMeta;
  calendarPosts: CalendarPost[];
  examplePosts: string[];
  brandUrl: string;
  priorOutputs: Record<string, Record<string, unknown>>;
  brandMessages: string[];
}

export async function loadAgentContext(dealId: string): Promise<AgentContext> {
  const deal = await store.getActiveDeal();
  if (!deal || deal.id !== dealId) {
    throw new Error("Deal not found");
  }

  const { profile, meta } = await store.getCreatorProfileWithMeta();
  const creator = profile ?? {
    id: "demo",
    name: "Alex Chen",
    handle: "@alexchen_dev",
    niche: "DevTools & AI Engineering",
    followers: "142K",
  };

  const calendarPosts = creator.id
    ? await store.getCalendarPosts(creator.id)
    : DEMO_CALENDAR_POSTS;

  const examplePosts = calendarPosts
    .filter((p) => !p.isSponsored)
    .map((p) => p.content)
    .filter(Boolean);

  return {
    deal,
    creator,
    creatorMeta: meta ?? { rates: {}, audience: {} },
    calendarPosts,
    examplePosts: examplePosts.length
      ? examplePosts
      : DEMO_CALENDAR_POSTS.map((p) => p.content),
    brandUrl: inferBrandUrl(deal.brandName),
    priorOutputs: await store.getAgentRunOutputs(dealId),
    brandMessages: deal.messages.filter((m) => m.sender === "brand").map((m) => m.text),
  };
}

export function priorOutput<T extends Record<string, unknown>>(
  ctx: AgentContext,
  agentName: string,
): T | null {
  const raw = ctx.priorOutputs[agentName];
  return raw ? (raw as T) : null;
}

export function contextBlock(ctx: AgentContext): string {
  return JSON.stringify(
    {
      brand: ctx.deal.brandName,
      product: ctx.deal.product,
      status: ctx.deal.status,
      creator: {
        name: ctx.creator.name,
        handle: ctx.creator.handle,
        niche: ctx.creator.niche,
        followers: ctx.creator.followers,
        rates: ctx.creatorMeta.rates,
        audience: ctx.creatorMeta.audience,
      },
      brandUrl: ctx.brandUrl,
      brandMessages: ctx.brandMessages.slice(-5),
      fitScore: ctx.deal.fitScore,
      quotedRate: ctx.deal.quotedRate,
      payments: ctx.deal.payment,
      draftCount: ctx.deal.drafts.length,
    },
    null,
    2,
  );
}

export async function persistAgentRun(
  dealId: string,
  agent: string,
  fromStatus: DealStatus,
  toStatus: DealStatus,
  input: Record<string, unknown>,
  output: Record<string, unknown> & { mode?: ManusMode },
  runStatus: "completed" | "failed" = "completed",
): Promise<void> {
  await store.appendAgentRun(dealId, agent, runStatus, input, {
    ...output,
    fromStatus,
    toStatus,
  });

  if (fromStatus !== toStatus) {
    const patch: { fitScore?: number; quotedRate?: number } = {};
    if (typeof output.fitScore === "number") patch.fitScore = output.fitScore;
    if (typeof output.bundle === "number") patch.quotedRate = output.bundle;
    if (typeof output.quotedBundle === "number") patch.quotedRate = output.quotedBundle;
    await store.updateDealStatus(dealId, toStatus, patch);
  }
}

export async function sendBrandMessage(dealId: string, text: string): Promise<void> {
  await store.appendMessage(dealId, "outbound", "whatsapp", text);
}

// ---------------------------------------------------------------------------
// Zod schemas + output types
// ---------------------------------------------------------------------------

const stringArray = z.array(z.string().min(1)).min(1);

export const brandFitSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  verdict: z.enum(["accepted", "rejected"]),
  rationale: z.string().min(1),
  overlap: z.string().min(1),
  productSummary: z.string().min(1),
  sponsorshipAngles: stringArray,
});

export const researchToneSchema = z.object({
  voiceSummary: z.string().min(1),
  toneMarkers: stringArray,
  sentenceStyle: z.string().min(1),
  vocabularyLevel: z.string().min(1),
  disclosurePattern: z.string().min(1),
  sampleOpeners: stringArray,
});

export const researchMarketSchema = z.object({
  primaryAngle: z.string().min(1),
  hooks: stringArray,
  proofPoints: stringArray,
  trendingTopics: stringArray,
  optimalTiming: z.string().min(1),
  marketNotes: z.string().min(1),
});

export const rateOutputSchema = z.object({
  linkedin: z.number().positive(),
  x: z.number().positive(),
  bundle: z.number().positive(),
  currency: z.string().min(1),
  rationale: z.string().min(1),
});

export const negotiatorOutputSchema = z.object({
  message: z.string().min(1),
  quotedBundle: z.number().positive(),
  advanceRequested: z.number().positive(),
  terms: z.string().min(1),
  summary: z.string().min(1),
});

export const creativeOutputSchema = z.object({
  disclosure: z.string().min(1),
  linkedinPost: z.string().min(1),
  xThread: z.string().min(1),
  mediaPrompt: z.string().min(1),
  summary: z.string().min(1),
});

export const calendarSlotSchema = z.object({
  platform: z.enum(["linkedin", "x"]),
  scheduledAt: z.string().min(1),
  label: z.string().min(1),
  title: z.string().min(1),
});

export const calendarOutputSchema = z.object({
  slots: z.array(calendarSlotSchema).min(2),
  summary: z.string().min(1),
});

export const safetyReviewSchema = z.object({
  claimsOk: z.boolean(),
  toneOk: z.boolean(),
  aiIssues: z.array(z.string()),
  aiSummary: z.string().min(1),
});

export type BrandFitOutput = z.infer<typeof brandFitSchema>;
export type ResearchToneOutput = z.infer<typeof researchToneSchema>;
export type ResearchMarketOutput = z.infer<typeof researchMarketSchema>;
export type RateOutput = z.infer<typeof rateOutputSchema>;
export type NegotiatorOutput = z.infer<typeof negotiatorOutputSchema>;
export type CreativeOutput = z.infer<typeof creativeOutputSchema>;
export type CalendarOutput = z.infer<typeof calendarOutputSchema>;
export type SafetyReviewOutput = z.infer<typeof safetyReviewSchema>;

// Manus JSON schemas (strict structured output)
export const MANUS_BRAND_FIT_SCHEMA = {
  type: "object",
  properties: {
    fitScore: { type: "integer" },
    verdict: { type: "string", enum: ["accepted", "rejected"] },
    rationale: { type: "string" },
    overlap: { type: "string" },
    productSummary: { type: "string" },
    sponsorshipAngles: { type: "array", items: { type: "string" } },
  },
  required: ["fitScore", "verdict", "rationale", "overlap", "productSummary", "sponsorshipAngles"],
  additionalProperties: false,
} as const;

export const MANUS_RESEARCH_TONE_SCHEMA = {
  type: "object",
  properties: {
    voiceSummary: { type: "string" },
    toneMarkers: { type: "array", items: { type: "string" } },
    sentenceStyle: { type: "string" },
    vocabularyLevel: { type: "string" },
    disclosurePattern: { type: "string" },
    sampleOpeners: { type: "array", items: { type: "string" } },
  },
  required: ["voiceSummary", "toneMarkers", "sentenceStyle", "vocabularyLevel", "disclosurePattern", "sampleOpeners"],
  additionalProperties: false,
} as const;

export const MANUS_RESEARCH_MARKET_SCHEMA = {
  type: "object",
  properties: {
    primaryAngle: { type: "string" },
    hooks: { type: "array", items: { type: "string" } },
    proofPoints: { type: "array", items: { type: "string" } },
    trendingTopics: { type: "array", items: { type: "string" } },
    optimalTiming: { type: "string" },
    marketNotes: { type: "string" },
  },
  required: ["primaryAngle", "hooks", "proofPoints", "trendingTopics", "optimalTiming", "marketNotes"],
  additionalProperties: false,
} as const;

export const MANUS_RATE_SCHEMA = {
  type: "object",
  properties: {
    linkedin: { type: "number" },
    x: { type: "number" },
    bundle: { type: "number" },
    currency: { type: "string" },
    rationale: { type: "string" },
  },
  required: ["linkedin", "x", "bundle", "currency", "rationale"],
  additionalProperties: false,
} as const;

export const MANUS_NEGOTIATOR_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    quotedBundle: { type: "number" },
    advanceRequested: { type: "number" },
    terms: { type: "string" },
    summary: { type: "string" },
  },
  required: ["message", "quotedBundle", "advanceRequested", "terms", "summary"],
  additionalProperties: false,
} as const;

export const MANUS_CREATIVE_SCHEMA = {
  type: "object",
  properties: {
    disclosure: { type: "string" },
    linkedinPost: { type: "string" },
    xThread: { type: "string" },
    mediaPrompt: { type: "string" },
    summary: { type: "string" },
  },
  required: ["disclosure", "linkedinPost", "xThread", "mediaPrompt", "summary"],
  additionalProperties: false,
} as const;

export const MANUS_CALENDAR_SCHEMA = {
  type: "object",
  properties: {
    slots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["linkedin", "x"] },
          scheduledAt: { type: "string" },
          label: { type: "string" },
          title: { type: "string" },
        },
        required: ["platform", "scheduledAt", "label", "title"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["slots", "summary"],
  additionalProperties: false,
} as const;

export const MANUS_SAFETY_SCHEMA = {
  type: "object",
  properties: {
    claimsOk: { type: "boolean" },
    toneOk: { type: "boolean" },
    aiIssues: { type: "array", items: { type: "string" } },
    aiSummary: { type: "string" },
  },
  required: ["claimsOk", "toneOk", "aiIssues", "aiSummary"],
  additionalProperties: false,
} as const;
