import { DEMO_RATES } from "@/lib/agents/prompts";
import type { Deal } from "@/lib/types";

/** Deterministic business constants — not AI-generated. */
export const MIN_BUNDLE_RATE_GBP = DEMO_RATES.floor;
export const ADVANCE_SPLIT = 0.5;

export function enforceMinimumBundle(bundle: number): number {
  return Math.max(bundle, MIN_BUNDLE_RATE_GBP);
}

export function splitPaymentAmounts(bundle: number): {
  advance: number;
  final: number;
} {
  const advance = Math.round(bundle * ADVANCE_SPLIT);
  return { advance, final: bundle - advance };
}

export function isAdvancePaid(deal: Deal): boolean {
  return deal.payment.advanceStatus === "paid";
}

export function isFinalPaid(deal: Deal): boolean {
  return deal.payment.finalStatus === "paid";
}

export function hasDisclosure(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("#ad") ||
    lower.includes("paid partnership") ||
    lower.includes("sponsored") ||
    lower.includes("partnered with")
  );
}

export interface SafetyGateResult {
  gate: string;
  passed: boolean;
  detail: string;
}

export function evaluateDeterministicSafetyGates(
  deal: Deal,
  linkedinDraft: string,
  xDraft: string,
): SafetyGateResult[] {
  const disclosureOk =
    hasDisclosure(linkedinDraft) && hasDisclosure(xDraft);
  const brandInLinkedin = linkedinDraft.includes(deal.brandName);
  const brandInX = xDraft.includes(deal.brandName);

  return [
    {
      gate: "advance_payment",
      passed: isAdvancePaid(deal),
      detail: isAdvancePaid(deal)
        ? "Advance verified — drafting gate open"
        : "BLOCKED: advance not paid",
    },
    {
      gate: "disclosure",
      passed: disclosureOk,
      detail: disclosureOk
        ? "Disclosure present in LinkedIn and X drafts"
        : "BLOCKED: #ad or sponsored disclosure missing",
    },
    {
      gate: "brand_name",
      passed: brandInLinkedin && brandInX,
      detail:
        brandInLinkedin && brandInX
          ? `Brand "${deal.brandName}" spelled consistently`
          : `Brand name "${deal.brandName}" missing from one or more drafts`,
    },
  ];
}

export function allGatesPassed(checks: SafetyGateResult[]): boolean {
  return checks.every((c) => c.passed);
}
