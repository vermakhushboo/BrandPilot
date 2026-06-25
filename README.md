# BrandPilot

### Brand deals. Zero effort.

> **From brand DM to published campaign — fully autonomous.**
> An AI agent that runs your entire brand collaboration — from inquiry to published post.

🔗 **Live demo:** [brandpilot-9hpukbpg.manus.space](https://brandpilot-9hpukbpg.manus.space/)

---

## The problem

**Creators lose 40+ hours a month on brand ops.**

A single sponsorship is death by a thousand small tasks:

- Reading and triaging brand emails
- Writing drafts back and forth
- Negotiating rates
- Chasing invoices and payments
- Scheduling posts around organic content
- Tracking it all in spreadsheets

That's time not spent creating — the one thing the audience actually shows up for.

## The solution

BrandPilot is an **autonomous AI talent manager** that takes a brand deal from first message to ready-to-post, with the creator only stepping in to approve.

| Without BrandPilot | With BrandPilot |
|--------------------|-----------------|
| Reading brand emails | Agent reads & responds |
| Writing drafts back & forth | Ghost-writes in **your** voice |
| Negotiating rates | Auto-quotes pricing |
| Chasing payments | Handles PayPal advance + final |
| Scheduling posts | Creates content & schedules slots |
| Tracking in spreadsheets | You just approve via notification |
| **40+ hrs/month wasted** | **~0 hrs — fully autonomous** |

**Autonomous, not unsupervised.** The human stays in control: notified at every milestone, able to review before publish, inject feedback mid-flow, and pause or roll back at will. Hard gates make the autonomy safe — no content before the advance clears, nothing published before final payment and brand approval.

---

## End-to-end, fully automated

From brand inquiry → published post, with zero manual steps in between:

```
Receive → Qualify → Quote → Negotiate → 💰 Advance → Research
   → Draft → Safety → Schedule → Brand review → 💰 Final → Publish
```

Each step is owned by a dedicated agent that reads the full deal state, makes one decision, logs it, and hands off to the next.

| Deal status | Agent | Produces | Next status |
|-------------|-------|----------|-------------|
| `inbound` | **BrandFitAgent** | Fit score, verdict, audience overlap, sponsorship angles | `brand_fit_check` |
| `brand_fit_check` | **RateAgent** | LinkedIn / X / bundle pricing (min-rate floor enforced) | `rate_quote` |
| `rate_quote` | **NegotiatorAgent** | Negotiation message + terms → sent to brand | `negotiating` |
| `negotiating` | **PaymentAgent** | Issues 50% advance PayPal invoice | `awaiting_advance_payment` 🔒 |
| `advance_paid` | **ResearchAgent** (tone) | Voice profile from organic posts | `researching` |
| `researching` | **ResearchAgent** (market) | Angles, hooks, proof points, timing | `drafting` |
| `drafting` | **CreativeAgent** → **SafetyAgent** | LinkedIn post + X thread + disclosure, then QA gates | `calendar_fit` |
| `calendar_fit` | **CalendarFitAgent** | Sponsored slots spaced into the organic calendar | `brand_review` 🔒 |
| `brand_review` | **PaymentAgent** | Issues final 50% PayPal invoice on approval | `awaiting_final_payment` 🔒 |
| `final_paid` | **PaymentAgent** | Confirms payment, campaign locked | `ready_to_post` |

🔒 = blocked gate (waits for external action: payment or brand approval).

The orchestrator (`lib/agents/engine.ts`) drives this in two modes:

- `runNextAgentStep` — run exactly one agent
- `runAgentLoopUntilBlocked` — run autonomously until the next gate

---

## What it does

BrandPilot is an autonomous **deal desk** for a single creator. The control room is a single screen:

- **Left** — WhatsApp-style brand conversation
- **Middle** — deal pipeline + content calendar
- **Right** — live agent log and safety checks
- **Bottom** — drafts, payment state, and scheduled slots

Every agent action writes a visible log entry. Payment and approval gates are hard-stops: no drafts before the advance clears, no ready-to-post before the final payment clears, and nothing reaches the brand without going through the conversation.

---

## Partner stack

| Layer | Tech | Role |
|-------|------|------|
| Framework | **Next.js 16** (App Router, Turbopack) | UI + API routes |
| Language | **TypeScript** + **Zod** | Strict JSON validation of agent output |
| AI agents | **Manus** (`api.manus.ai` v2) | Brand fit, research, copy, scheduling, QA |
| Payments | **PayPal** (sandbox/live) | Advance + final invoices and capture |
| Data | **Supabase** (Postgres) | Deals, messages, runs, payments, drafts, calendar |
| Styling | **Tailwind CSS v4** | Control-room UI |

---

## Setup

**Prerequisites:** Node.js 20+, a Supabase project, and (optionally) PayPal sandbox + Manus credentials.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (see Env vars below)
cp .env.example .env.local   # then fill in values

# 3. Provision the database
#    Run these in the Supabase SQL editor (or psql):
#      supabase/schema.sql   — tables + constraints
#      supabase/seed.sql     — creator + seeded Atoms deal

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Scripts:**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test:e2e` | End-to-end API smoke test of the full pipeline |

---

## Env vars

Create `.env.local` in the project root:

```bash
# --- Supabase (required) ---
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# --- PayPal (optional — demo mode if missing) ---
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<client-id>   # client-safe
PAYPAL_CLIENT_ID=<client-id>
PAYPAL_CLIENT_SECRET=<client-secret>
PAYPAL_ENV=sandbox                         # sandbox | live
PAYPAL_CURRENCY=GBP

# --- Manus (optional — demo mode if missing) ---
MANUS_API_KEY=<manus-api-key>
MANUS_API_BASE=https://api.manus.ai        # optional override
MANUS_TIMEOUT_MS=90000                      # optional
MANUS_POLL_MS=3000                          # optional

# --- App ---
APP_BASE_URL=http://localhost:3000
```

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Falls back to an in-memory store if unset |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side writes |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | No | Without these, payments run in demo mode |
| `MANUS_API_KEY` | No | Without this, agents use deterministic demo output |
| `MANUS_TIMEOUT_MS` / `MANUS_POLL_MS` | No | Tune Manus task polling |

> **Never commit `.env.local`.** Keys above are read server-side only, except `NEXT_PUBLIC_*`.

---

## Demo mode

BrandPilot runs fully without any third-party keys. Demo fallbacks activate **per integration** when its key is missing:

- **No `MANUS_API_KEY`** → agents return deterministic, on-brand demo output (fit scores, pricing, copy, research, calendar rationale). When the key *is* present, **nothing is hardcoded** — every creative/analytical output comes from Manus.
- **No PayPal credentials** → invoices and captures simulate a sandbox order so the payment gates still function end-to-end.
- **No Supabase** → an in-memory store backs the same API surface.

This makes the pipeline fully demoable offline, while flipping to real partners the moment keys are added.

> **Tip:** Live Manus calls take a few seconds per step. For a fast local demo or running `npm run test:e2e`, start the server with `MANUS_API_KEY=` unset to use demo output.

---

## 2-minute demo script

1. **Open the control room** at `http://localhost:3000`. The seeded deal — **Atoms** (AI-native IDE) reaching out to creator **Alex Chen** — sits in the `inbound` column with the brand's opening message in the left chat.
2. **Hit "Run autonomously."** Watch the agent log on the right fill in: BrandFit → Rate → Negotiator → PaymentAgent. The pipeline advances and pauses at **Awaiting Advance Payment** — the first hard gate.
3. **Pay the advance.** Use the PayPal button (sandbox) or **"Simulate advance"** to clear the gate. Note that no drafts existed before this point.
4. **Run the loop again.** Research (tone + market) → Creative → Safety → CalendarFit run autonomously. Two drafts (LinkedIn + X) appear at the bottom, sponsored slots land on the calendar, and the deal stops at **Brand Review**.
5. **Approve the drafts.** This triggers the final 50% invoice and pauses at **Awaiting Final Payment**.
6. **Pay the final.** PayPal or **"Simulate final"** → the deal flips to **Ready to Post**, with the brand confirmation message sent in chat.
7. **Scroll the agent log** — every decision, score, and gate is recorded as an auditable run.

---

## Safety & payment gates

These constraints are enforced deterministically in code — agents cannot override them:

- **Advance gate.** No content is drafted until the 50% advance is verified (`awaiting_advance_payment` blocks the loop).
- **Final gate.** Nothing reaches `ready_to_post` until the remaining 50% is verified (`awaiting_final_payment` blocks the loop).
- **Approval gate.** No external message or post leaves the system without going through the brand conversation; drafts require explicit brand approval at `brand_review`.
- **Minimum rate floor.** RateAgent output is clamped to a minimum bundle rate regardless of model suggestion.
- **Content QA.** SafetyAgent runs both Manus content review *and* deterministic gates (disclosure present, no unsubstantiated claims) before the deal can advance; failures hold the deal at `drafting`.
- **Full audit trail.** Every agent action — including failures — is written to `agent_runs` and surfaced in the live log.
- **Brand-facing copy is scoped.** Only negotiation, invoices, draft review, and the campaign confirmation are sent to the brand. Internal pipeline status never leaks into the conversation.

---

## Project layout

```
app/
  api/agents/run-next      POST — run one agent step
  api/agents/run-loop      POST — run until the next gate
  api/paypal/…             create-order, capture-order
  api/demo/…               simulate-advance, approve-draft, simulate-final
lib/
  agents/
    types.ts               context loading, Zod + Manus schemas, persistence
    prompts.ts             structured prompt builders
    manus-client.ts        Manus API client + demo fallback
    brand-fit-agent.ts     …one file per agent…
    engine.ts              orchestrator (dispatch, payment, loop)
    business-rules.ts      deterministic gates (rates, payment splits, QA)
  data/brandpilot-store.ts Supabase + in-memory store
  state-machine.ts         deal statuses + blocked gates
supabase/
  schema.sql               tables + constraints
  seed.sql                 creator profile + seeded Atoms deal
scripts/
  e2e-test.mjs             full-pipeline API smoke test
```

---

<sub>Built with AI · Hackathon 2026 · Made with [Manus](https://manus.im)</sub>
