#!/usr/bin/env node
/** End-to-end API smoke test for BrandPilot */

const BASE = process.env.APP_BASE_URL || "http://localhost:3000";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const json = await res.json();
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("=== BrandPilot E2E ===\n");

  const boot = await get("/api/control-room");
  assert(boot.json.ok, "control-room bootstrap failed");
  const dealId = boot.json.data.deal.id;
  console.log("Deal ID:", dealId);
  console.log("Source:", boot.json.data.source);

  // Reset and run autonomous pipeline
  let r = await post("/api/agents/run-loop", { dealId, reset: true });
  assert(r.json.ok, `run-loop: ${r.json.error}`);
  let status = r.json.data.deal.status;
  console.log("\n1. Autonomous run →", status);
  assert(status === "awaiting_advance_payment", `Expected awaiting_advance_payment, got ${status}`);

  // PayPal create order (real sandbox)
  r = await post("/api/paypal/create-order", { dealId, stage: "advance" });
  assert(r.json.ok, `create-order: ${r.json.error}`);
  console.log("2. PayPal create-order →", r.json.orderId, `(demo=${r.json.demo})`);

  // Capture without payer approval should fail on real sandbox
  if (!r.json.demo) {
    const cap = await post("/api/paypal/capture-order", {
      orderId: r.json.orderId,
      dealId,
      stage: "advance",
    });
    assert(!cap.json.ok, "Expected capture to fail without payer approval");
    console.log("3. PayPal capture (no approval) → correctly rejected");
  }

  // Demo simulate advance to continue flow
  r = await post("/api/demo/simulate-advance-paid", { dealId });
  assert(r.json.ok, `simulate-advance: ${r.json.error}`);
  status = r.json.data.deal.status;
  console.log("4. Simulate advance paid →", status);
  assert(status === "advance_paid", `Expected advance_paid, got ${status}`);

  r = await post("/api/agents/run-loop", { dealId });
  assert(r.json.ok, `continue loop: ${r.json.error}`);
  status = r.json.data.deal.status;
  console.log("5. Agent loop →", status);
  assert(status === "brand_review", `Expected brand_review, got ${status}`);
  assert(r.json.data.deal.drafts.length >= 2, "Expected drafts generated");

  r = await post("/api/demo/approve-brand-draft", { dealId });
  assert(r.json.ok, `approve draft: ${r.json.error}`);
  status = r.json.data.deal.status;
  console.log("6. Approve draft →", status);
  assert(status === "awaiting_final_payment", `Expected awaiting_final_payment, got ${status}`);

  r = await post("/api/paypal/create-order", { dealId, stage: "final" });
  assert(r.json.ok, `final create-order: ${r.json.error}`);
  console.log("7. Final PayPal order →", r.json.orderId);

  r = await post("/api/demo/simulate-final-paid", { dealId });
  assert(r.json.ok, `simulate-final: ${r.json.error}`);
  status = r.json.data.deal.status;
  console.log("8. Simulate final paid →", status);
  assert(
    status === "final_paid" || status === "ready_to_post" || status === "completed",
    `Expected final_paid+, got ${status}`,
  );

  if (status === "final_paid") {
    r = await post("/api/agents/run-loop", { dealId });
    assert(r.json.ok, `final loop: ${r.json.error}`);
    status = r.json.data.deal.status;
    console.log("9. Final agent loop →", status);
  } else {
    console.log("9. Agent loop auto-ran →", status);
  }
  assert(
    status === "ready_to_post" || status === "completed",
    `Expected ready_to_post or completed, got ${status}`,
  );

  const paymentAgentLogs = r.json.data.deal.agentLogs.filter(
    (l) => l.agent === "PaymentAgent",
  );
  console.log("10. PaymentAgent log entries:", paymentAgentLogs.length);
  assert(paymentAgentLogs.length >= 2, "Expected PaymentAgent logs");

  console.log("\n=== All E2E checks passed ===");
}

main().catch((e) => {
  console.error("\nE2E FAILED:", e.message);
  process.exit(1);
});
