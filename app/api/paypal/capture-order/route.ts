import { NextResponse } from "next/server";

import { getControlRoomData } from "@/lib/data";
import * as store from "@/lib/data/brandpilot-store";
import { runAgentLoopUntilBlocked } from "@/lib/deal-actions";
import {
  capturePayPalOrder,
  isPayPalDemoMode,
  type PayPalPaymentStage,
} from "@/lib/paypal";

export async function POST(request: Request) {
  let body: { orderId?: string; dealId?: string; stage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const dealId = body.dealId?.trim();
  const stage = body.stage as PayPalPaymentStage;

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId is required" }, { status: 400 });
  }
  if (!dealId) {
    return NextResponse.json({ ok: false, error: "dealId is required" }, { status: 400 });
  }
  if (stage !== "advance" && stage !== "final") {
    return NextResponse.json(
      { ok: false, error: 'stage must be "advance" or "final"' },
      { status: 400 },
    );
  }

  const deal = await store.getActiveDeal();
  if (!deal || deal.id !== dealId) {
    return NextResponse.json({ ok: false, error: "Deal not found" }, { status: 404 });
  }

  try {
    const capture = await capturePayPalOrder(orderId);

    if (capture.status !== "COMPLETED") {
      return NextResponse.json(
        {
          ok: false,
          error: `PayPal order status is ${capture.status}, expected COMPLETED`,
          capture,
        },
        { status: 400 },
      );
    }

    await store.updatePaymentMetadata(dealId, stage, {
      paypal_order_id: orderId,
      paypalOrderId: orderId,
      paypalCaptureId: capture.captureId,
      paypalStatus: capture.status,
      paypalMode: capture.mode,
      capturedAt: new Date().toISOString(),
    });
    await store.updatePaymentStatus(dealId, stage, "paid");

    const nextDealStatus = stage === "advance" ? "advance_paid" : "final_paid";
    await store.updateDealStatus(dealId, nextDealStatus);

    const label = stage === "advance" ? "Advance" : "Final";
    await store.appendAgentRun(
      dealId,
      "PaymentAgent",
      "completed",
      { orderId, stage, amount: capture.amount },
      {
        action: `${label} payment captured via PayPal — £${capture.amount} ${capture.currency}`,
        summary: `PayPal ${stage} payment COMPLETED (${orderId})`,
        paypalOrderId: orderId,
        paypalCaptureId: capture.captureId,
      },
    );

    await store.appendMessage(
      dealId,
      "inbound",
      "whatsapp",
      `${label} paid via PayPal ✓`,
    );

    await runAgentLoopUntilBlocked(dealId);
    const data = await getControlRoomData();

    return NextResponse.json({
      ok: true,
      demo: isPayPalDemoMode(),
      orderId,
      capture,
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PayPal capture failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
