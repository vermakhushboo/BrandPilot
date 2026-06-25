import {
  PAYPAL_STAGE_AMOUNTS,
  type PayPalPaymentStage,
} from "@/lib/paypal-constants";

export type { PayPalPaymentStage } from "@/lib/paypal-constants";
export { PAYPAL_STAGE_AMOUNTS };

export type PayPalMode = "live" | "demo";

export interface PayPalOrderResult {
  mode: PayPalMode;
  orderId: string;
  status: string;
  stage: PayPalPaymentStage;
  amount: number;
  currency: string;
  approveUrl?: string;
}

export interface PayPalCaptureResult {
  mode: PayPalMode;
  orderId: string;
  status: string;
  captureId?: string;
  amount: number;
  currency: string;
}

const STAGE_DESCRIPTIONS: Record<PayPalPaymentStage, string> = {
  advance: "BrandPilot advance payment for sponsored campaign",
  final: "BrandPilot final payment for sponsored campaign",
};

/** Server-only: requires client id + secret. */
export function isPayPalConfigured(): boolean {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientSecret);
}

export function isPayPalDemoMode(): boolean {
  return !isPayPalConfigured();
}

/** Client-safe: public client id only. */
export function isPayPalClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim());
}

export function getPayPalCurrency(): string {
  return (process.env.PAYPAL_CURRENCY ?? "GBP").trim().toUpperCase();
}

export function getPublicPayPalClientId(): string | null {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() || null;
}

function getPayPalBaseUrl(): string {
  const env = (process.env.PAYPAL_ENV ?? "sandbox").trim().toLowerCase();
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function demoOrderId(dealId: string, stage: PayPalPaymentStage): string {
  const slug = dealId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  return `DEMO-PAYPAL-${stage}-${slug}-${Date.now()}`;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

interface CreateOrderInput {
  dealId: string;
  stage: PayPalPaymentStage;
}

export function getStageDescription(stage: PayPalPaymentStage): string {
  return STAGE_DESCRIPTIONS[stage];
}

export async function createPayPalOrder(
  input: CreateOrderInput,
): Promise<PayPalOrderResult> {
  const { dealId, stage } = input;
  const amount = PAYPAL_STAGE_AMOUNTS[stage];
  const currency = getPayPalCurrency();

  if (isPayPalDemoMode()) {
    return {
      mode: "demo",
      orderId: demoOrderId(dealId, stage),
      status: "CREATED",
      stage,
      amount,
      currency,
    };
  }

  const token = await getAccessToken();

  const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `${dealId}-${stage}`,
          description: getStageDescription(stage),
          custom_id: `${dealId}:${stage}`,
          amount: {
            currency_code: currency,
            value: formatAmount(amount),
          },
        },
      ],
      application_context: {
        brand_name: "BrandPilot",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal create order failed: ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    links?: Array<{ rel: string; href: string }>;
  };

  const approveUrl = data.links?.find(
    (l) => l.rel === "approve" || l.rel === "payer-action",
  )?.href;

  return {
    mode: "live",
    orderId: data.id,
    status: data.status,
    stage,
    amount,
    currency,
    approveUrl,
  };
}

export async function capturePayPalOrder(
  orderId: string,
): Promise<PayPalCaptureResult> {
  if (orderId.startsWith("DEMO-PAYPAL-")) {
    const stage = orderId.includes("-advance-") ? "advance" : "final";
    const amount = PAYPAL_STAGE_AMOUNTS[stage as PayPalPaymentStage];
    return {
      mode: "demo",
      orderId,
      status: "COMPLETED",
      captureId: `DEMO-CAPTURE-${Date.now()}`,
      amount,
      currency: getPayPalCurrency(),
    };
  }

  const token = await getAccessToken();

  const res = await fetch(
    `${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal capture failed: ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id: string;
          amount: { currency_code: string; value: string };
        }>;
      };
    }>;
  };

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    mode: "live",
    orderId: data.id,
    status: data.status,
    captureId: capture?.id,
    amount: capture ? Number(capture.amount.value) : 0,
    currency: capture?.amount.currency_code ?? getPayPalCurrency(),
  };
}

export function paymentMessageWithPayPal(
  stage: PayPalPaymentStage,
  amount: number,
  orderId: string,
  mode: PayPalMode,
): string {
  const label = stage === "advance" ? "Advance" : "Final";
  const modeNote = mode === "demo" ? " (demo PayPal)" : "";
  return `${label} invoice sent — £${amount}${modeNote}.\nPayPal order: ${orderId}\nComplete checkout in the dashboard to proceed.`;
}
