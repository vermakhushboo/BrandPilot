import { DEMO_RATES } from "@/lib/agents/prompts";

export type PayPalPaymentStage = "advance" | "final";

export const PAYPAL_STAGE_AMOUNTS: Record<PayPalPaymentStage, number> = {
  advance: DEMO_RATES.advance,
  final: DEMO_RATES.final,
};
