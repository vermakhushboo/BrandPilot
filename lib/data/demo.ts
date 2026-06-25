import { CREATOR, DEMO_CALENDAR_POSTS, SEED_DEAL, SPONSORED_CALENDAR_SLOT } from "@/lib/seed";
import type { ControlRoomData } from "@/lib/types";

export function getDemoControlRoomData(): ControlRoomData {
  return {
    source: "demo",
    creator: {
      id: "demo-creator",
      name: CREATOR.name,
      handle: CREATOR.handle,
      niche: CREATOR.niche,
      followers: CREATOR.followers,
    },
    deal: SEED_DEAL,
    calendarPosts: [...DEMO_CALENDAR_POSTS, SPONSORED_CALENDAR_SLOT],
  };
}
