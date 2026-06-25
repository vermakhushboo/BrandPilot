import {
  getActiveDeal,
  getCalendarPosts,
  getCreatorProfile,
  getStoreMode,
  seedDemoData,
} from "@/lib/data/brandpilot-store";
import type { ControlRoomData } from "@/lib/types";

export async function getControlRoomData(): Promise<ControlRoomData> {
  let creator = await getCreatorProfile();
  let deal = await getActiveDeal();

  if (!creator || !deal) {
    await seedDemoData();
    creator = await getCreatorProfile();
    deal = await getActiveDeal();
  }

  if (!creator || !deal) {
    throw new Error("Failed to load control room data");
  }

  const calendarPosts = await getCalendarPosts(creator.id);

  return {
    source: getStoreMode() === "supabase" ? "supabase" : "demo",
    creator,
    deal,
    calendarPosts,
  };
}

export {
  getActiveDeal,
  getCalendarPosts,
  getCreatorProfile,
  getStoreMode,
  seedDemoData,
} from "@/lib/data/brandpilot-store";
