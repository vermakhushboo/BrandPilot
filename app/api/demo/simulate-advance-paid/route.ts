import { getControlRoomData } from "@/lib/data";
import { simulateAdvancePaid } from "@/lib/deal-actions";
import { jsonData, jsonError, parseDealId } from "@/lib/api/route-utils";

export async function POST(request: Request) {
  const dealId = await parseDealId(request);
  if (!dealId) return jsonError("dealId is required");

  await simulateAdvancePaid(dealId);
  const data = await getControlRoomData();
  return jsonData(data);
}
