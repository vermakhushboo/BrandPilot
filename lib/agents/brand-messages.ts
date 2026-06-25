import { DEMO_RATES } from "@/lib/agents/prompts";

/** WhatsApp copy sent to the brand — never internal pipeline status. */

export function brandPaymentInvoiceMessage(
  stage: "advance" | "final",
  amount: number,
): string {
  if (stage === "advance") {
    return (
      `Hi! Attached is the advance invoice for £${amount} (50% of the £${DEMO_RATES.bundle} package).\n\n` +
      `Once payment is confirmed we'll begin research and draft your LinkedIn post + X thread. Let us know if you have any questions.`
    );
  }

  return (
    `Thanks for approving the drafts! Here's the final invoice for £${amount} (remaining 50%).\n\n` +
    `Once this clears we'll confirm your publish slots.`
  );
}

export function brandDraftsReviewMessage(
  brandName: string,
  linkedinSlot: string,
  xSlot: string,
): string {
  return (
    `Hi ${brandName} team — your sponsored drafts are ready for review.\n\n` +
    `• LinkedIn post — proposed ${linkedinSlot}\n` +
    `• X thread — proposed ${xSlot}\n\n` +
    `Please share any feedback or let us know when you're happy to approve.`
  );
}

export function brandCampaignConfirmedMessage(
  linkedinSlot: string,
  xSlot: string,
): string {
  return (
    `Payment received — thank you! Your sponsored content is confirmed:\n\n` +
    `• LinkedIn — ${linkedinSlot}\n` +
    `• X — ${xSlot}\n\n` +
    `We'll share live links after publish.`
  );
}
