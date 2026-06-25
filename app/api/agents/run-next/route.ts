import { getControlRoomData } from "@/lib/data";
import { runNextAgentStep } from "@/lib/deal-actions";
import { jsonData, jsonError, parseDealId } from "@/lib/api/route-utils";

export async function POST(request: Request) {
  const dealId = await parseDealId(request);
  if (!dealId) return jsonError("dealId is required");

  try {
    await runNextAgentStep(dealId);
    const data = await getControlRoomData();
    return jsonData(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent step failed";
    return jsonError(message, 500);
  }
}
