"use client";

import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";

import {
  PAYPAL_STAGE_AMOUNTS,
  type PayPalPaymentStage,
} from "@/lib/paypal-constants";
import type { ControlRoomData } from "@/lib/types";

interface PayPalProviderProps {
  clientId: string;
  currency: string;
  children: React.ReactNode;
}

export function PayPalProvider({
  clientId,
  currency,
  children,
}: PayPalProviderProps) {
  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency,
        intent: "capture",
        components: "buttons",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}

interface PayPalPaymentButtonProps {
  dealId: string;
  stage: PayPalPaymentStage;
  disabled?: boolean;
  compact?: boolean;
  onComplete: (data: ControlRoomData) => void;
  onError?: (message: string) => void;
}

export function PayPalPaymentButton({
  dealId,
  stage,
  disabled,
  compact,
  onComplete,
  onError,
}: PayPalPaymentButtonProps) {
  const amount = PAYPAL_STAGE_AMOUNTS[stage];
  const label = stage === "advance" ? "Advance payment" : "Final payment";

  if (compact) {
    return (
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
        <p className="mb-2 text-[11px] font-medium text-foreground">
          Pay £{amount} with PayPal Sandbox
        </p>
        <div className="min-h-[42px]">
          <PayPalButtonInner
            dealId={dealId}
            stage={stage}
            disabled={disabled}
            onComplete={onComplete}
            onError={onError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted">
        Pay £{amount} via PayPal Sandbox to unlock the next stage
      </p>
      <div className="mt-3 min-h-[45px]">
        <PayPalButtonInner
          dealId={dealId}
          stage={stage}
          disabled={disabled}
          onComplete={onComplete}
          onError={onError}
        />
      </div>
    </div>
  );
}

function PayPalButtonInner({
  dealId,
  stage,
  disabled,
  onComplete,
  onError,
}: PayPalPaymentButtonProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isRejected) {
    return (
      <p className="text-xs text-red-400">
        PayPal failed to load. Check NEXT_PUBLIC_PAYPAL_CLIENT_ID.
      </p>
    );
  }

  return (
    <PayPalButtons
      disabled={disabled || isPending}
      style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
      createOrder={async () => {
        const res = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealId, stage }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          orderId?: string;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.orderId) {
          throw new Error(json.error ?? "Failed to create PayPal order");
        }
        return json.orderId;
      }}
      onApprove={async (data) => {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.orderID,
            dealId,
            stage,
          }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          data?: ControlRoomData;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.data) {
          const msg = json.error ?? "Failed to capture PayPal payment";
          onError?.(msg);
          throw new Error(msg);
        }
        onComplete(json.data);
      }}
      onError={(err) => {
        const msg = err instanceof Error ? err.message : "PayPal checkout error";
        onError?.(msg);
      }}
    />
  );
}
