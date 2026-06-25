import * as store from "@/lib/data/brandpilot-store";
import { brandDraftsReviewMessage } from "@/lib/agents/brand-messages";
import { getNextStatus } from "@/lib/state-machine";

import { calendarPrompt } from "./prompts";
import { callManusOrDemo, runManusStructuredTask } from "./manus-client";
import {
  calendarOutputSchema,
  loadAgentContext,
  MANUS_CALENDAR_SCHEMA,
  persistAgentRun,
  sendBrandMessage,
  type AgentRunResult,
  type CalendarOutput,
} from "./types";

const AGENT = "CalendarFitAgent";

export async function runCalendarFitAgent(dealId: string): Promise<AgentRunResult> {
  const ctx = await loadAgentContext(dealId);
  const fromStatus = ctx.deal.status;

  if (fromStatus !== "calendar_fit") {
    throw new Error(`${AGENT} cannot run at status ${fromStatus}`);
  }

  const { mode, value } = await callManusOrDemo(
    () => demoCalendar(ctx),
    () =>
      runManusStructuredTask<CalendarOutput>(
        calendarPrompt(ctx),
        MANUS_CALENDAR_SCHEMA,
        `BrandPilot calendar — ${ctx.deal.brandName}`,
      ),
  );

  const parsed = calendarOutputSchema.parse(value);

  for (const slot of parsed.slots) {
    await store.saveCalendarSlot(
      dealId,
      slot.platform,
      "sponsored",
      slot.title,
      slot.scheduledAt,
      "scheduled",
      `${slot.label} — sponsored slot for ${ctx.deal.brandName}`,
    );
  }

  const toStatus = getNextStatus(fromStatus)!;
  const output = { ...parsed, mode, summary: parsed.summary };

  await persistAgentRun(dealId, AGENT, fromStatus, toStatus, {}, output);
  await sendBrandMessage(
    dealId,
    brandDraftsReviewMessage(ctx.deal.brandName, parsed.slots[0].label, parsed.slots[1].label),
  );

  return { agent: AGENT, fromStatus, toStatus, summary: output.summary };
}

function demoCalendar(ctx: Awaited<ReturnType<typeof loadAgentContext>>): CalendarOutput {
  const thursday = nextThursday();
  return {
    slots: [
      {
        platform: "linkedin",
        scheduledAt: setTime(thursday, 10, 0),
        label: "Thu 10:00",
        title: `${ctx.deal.brandName} · LinkedIn sponsored post`,
      },
      {
        platform: "x",
        scheduledAt: setTime(thursday, 15, 30),
        label: "Thu 15:30",
        title: `${ctx.deal.brandName} · X thread`,
      },
    ],
    summary: "Proposed Thursday slots with separation between LinkedIn and X.",
  };
}

function nextThursday(): Date {
  const d = new Date();
  const day = d.getDay();
  const daysUntil = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(0, 0, 0, 0);
  return d;
}

function setTime(date: Date, hours: number, minutes: number): string {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}
