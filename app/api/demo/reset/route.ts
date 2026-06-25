import { getControlRoomData } from "@/lib/data";
import * as store from "@/lib/data/brandpilot-store";
import { jsonData, jsonError, parseDealId } from "@/lib/api/route-utils";

export async function POST(request: Request) {
  const dealId = await parseDealId(request);
  if (!dealId) return jsonError("dealId is required");

  await store.resetActiveDealForAutonomousStart(dealId);
  const data = await getControlRoomData();
  return jsonData(data);
}
