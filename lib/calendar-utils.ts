import { SPONSORED_CALENDAR_SLOT } from "@/lib/seed";
import type { CalendarPost, Deal } from "@/lib/types";

export function getCalendarPostsForDeal(
  calendarPosts: CalendarPost[],
  deal: Deal,
): CalendarPost[] {
  const organic = calendarPosts.filter((p) => !p.isSponsored);
  const showSponsored =
    deal.status === "calendar_fit" ||
    deal.status === "brand_review" ||
    deal.status === "awaiting_final_payment" ||
    deal.status === "final_paid" ||
    deal.status === "ready_to_post" ||
    deal.status === "completed";

  if (!showSponsored) return organic;

  const sponsored =
    calendarPosts.find((p) => p.isSponsored) ?? SPONSORED_CALENDAR_SLOT;

  return [...organic, { ...sponsored, title: `${deal.brandName} · ${deal.product}` }];
}
