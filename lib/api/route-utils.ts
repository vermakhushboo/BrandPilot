import { NextResponse } from "next/server";

import type { ControlRoomData } from "@/lib/types";

export function jsonData(data: ControlRoomData, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function parseDealId(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { dealId?: string };
    return body.dealId?.trim() || null;
  } catch {
    return null;
  }
}
