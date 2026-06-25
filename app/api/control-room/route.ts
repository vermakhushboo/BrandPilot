import { getControlRoomData } from "@/lib/data";
import { jsonData } from "@/lib/api/route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getControlRoomData();
  return jsonData(data);
}
