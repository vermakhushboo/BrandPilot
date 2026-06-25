import { getControlRoomData } from "@/lib/data";
import { runAgentLoopUntilBlocked } from "@/lib/deal-actions";
import * as store from "@/lib/data/brandpilot-store";
import { jsonData, jsonError } from "@/lib/api/route-utils";

export async function POST(request: Request) {
  let body: { dealId?: string; reset?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const dealId = body.dealId?.trim();
  if (!dealId) return jsonError("dealId is required");

  try {
    if (body.reset) {
      await store.resetActiveDealForAutonomousStart(dealId);
    }

    await runAgentLoopUntilBlocked(dealId);
    const data = await getControlRoomData();
    return jsonData(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent loop failed";
    return jsonError(message, 500);
  }
}
