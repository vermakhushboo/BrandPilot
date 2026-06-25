import { NextResponse } from "next/server";

import * as store from "@/lib/data/brandpilot-store";
import {
  createPayPalOrder,
  isPayPalDemoMode,
  type PayPalPaymentStage,
} from "@/lib/paypal";

export async function POST(request: Request) {
  let body: { dealId?: string; stage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const dealId = body.dealId?.trim();
  const stage = body.stage as PayPalPaymentStage;

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
    const order = await createPayPalOrder({ dealId, stage });

    await store.createPayment(dealId, stage, order.amount, {
      paypal_order_id: order.orderId,
      paypalOrderId: order.orderId,
      paypalMode: order.mode,
      paypalStatus: order.status,
      currency: order.currency,
    });

    return NextResponse.json({
      ok: true,
      demo: isPayPalDemoMode(),
      orderId: order.orderId,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PayPal create order failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
