import type { CalendarPost, Deal } from "./types";

export const CREATOR = {
  name: "Alex Chen",
  handle: "@alexchen_dev",
  niche: "DevTools & AI Engineering",
  followers: "142K",
};

export const DEMO_CALENDAR_POSTS: CalendarPost[] = [
  {
    id: "cal-1",
    platform: "linkedin",
    title: "Why I stopped chasing 10x dev tools",
    content:
      "Hot take: the best productivity gain wasn't a new IDE — it was deleting half my toolchain.",
    scheduledAt: "2026-06-26T14:00:00Z",
    status: "scheduled",
    isSponsored: false,
  },
  {
    id: "cal-2",
    platform: "x",
    title: "Agent eval thread",
    content:
      "How I eval AI coding agents: fixed task set, score correctness + test pass rate, run 3x, take median.",
    scheduledAt: "2026-06-27T16:30:00Z",
    status: "scheduled",
    isSponsored: false,
  },
  {
    id: "cal-3",
    platform: "linkedin",
    title: "Ship log: autonomous deal desk",
    content:
      "Built an agent pipeline that qualifies inbound brand deals, quotes rates, and gates content on payment.",
    scheduledAt: "2026-06-28T10:00:00Z",
    status: "draft",
    isSponsored: false,
  },
];

export const SPONSORED_CALENDAR_SLOT: CalendarPost = {
  id: "cal-sponsored",
  platform: "linkedin",
  title: "Vercel · Next.js 16 Sponsored Post",
  content: "Reserved slot for brand-sponsored content after calendar fit check.",
  scheduledAt: "2026-06-30T12:00:00Z",
  status: "scheduled",
  isSponsored: true,
};

export const INBOUND_DEAL: Deal = {
  id: "deal-atoms",
  brandName: "Atoms",
  brandLogo: "⚛",
  product: "Atoms AI IDE Launch Sponsorship",
  status: "inbound",
  fitScore: null,
  quotedRate: null,
  messages: [
    {
      id: "m1",
      sender: "brand",
      text: "Hi Alex — we're launching Atoms, an AI-native IDE for full-stack developers. Interested in a sponsored LinkedIn + X package for our July launch?",
      timestamp: "Just now",
    },
  ],
  agentLogs: [],
  drafts: [],
  payment: {
    dealValue: 0,
    advanceAmount: 0,
    advanceStatus: "pending",
    finalAmount: 0,
    finalStatus: "pending",
  },
};

export const SEED_DEAL: Deal = {
  id: "deal-001",
  brandName: "Vercel",
  brandLogo: "▲",
  product: "Next.js 16 Sponsored Post",
  status: "brand_review",
  fitScore: 94,
  quotedRate: 8500,
  messages: [
    {
      id: "m1",
      sender: "brand",
      text: "Hi Alex! We're launching Next.js 16 and love your dev content. Interested in a sponsored LinkedIn + X post?",
      timestamp: "Mon 9:12 AM",
    },
    {
      id: "m2",
      sender: "agent",
      text: "Thanks for reaching out! Alex's audience is 78% senior engineers — great fit for Next.js. What's your timeline and deliverables?",
      timestamp: "Mon 9:14 AM",
    },
    {
      id: "m3",
      sender: "brand",
      text: "1 LinkedIn post + 1 X thread, launch week of June 30. We can do $7,500.",
      timestamp: "Mon 9:22 AM",
    },
    {
      id: "m4",
      sender: "agent",
      text: "Based on Alex's rates and engagement, our quote is $8,500 — includes 1 revision round and 48h turnaround on drafts.",
      timestamp: "Mon 9:25 AM",
    },
    {
      id: "m5",
      sender: "brand",
      text: "Deal. Send over the contract and invoice for 50% advance.",
      timestamp: "Mon 10:01 AM",
    },
    {
      id: "m6",
      sender: "agent",
      text: "Advance invoice sent ($4,250). We'll start drafting once payment clears.",
      timestamp: "Mon 10:03 AM",
    },
    {
      id: "m7",
      sender: "brand",
      text: "Advance paid ✓",
      timestamp: "Mon 2:47 PM",
    },
    {
      id: "m8",
      sender: "agent",
      text: "Drafts ready for your review — LinkedIn post and X thread attached below. Let us know any edits!",
      timestamp: "Tue 11:30 AM",
    },
  ],
  agentLogs: [
    {
      id: "a1",
      agent: "Qualifier",
      action: "Scored brand fit: 94/100 — devtools audience overlap 78%",
      timestamp: "Mon 9:13 AM",
    },
    {
      id: "a2",
      agent: "Rate Calculator",
      action: "Computed rate: $8,500 (base $7k + engagement premium)",
      timestamp: "Mon 9:24 AM",
    },
    {
      id: "a3",
      agent: "Negotiator",
      action: "Countered $7,500 → $8,500 with revision + turnaround terms",
      timestamp: "Mon 9:25 AM",
    },
    {
      id: "a4",
      agent: "Payment Agent",
      action: "Generated advance invoice: $4,250 (50%)",
      timestamp: "Mon 10:03 AM",
    },
    {
      id: "a5",
      agent: "Payment Agent",
      action: "Verified advance payment — gate cleared for drafting",
      timestamp: "Mon 2:48 PM",
    },
    {
      id: "a6",
      agent: "Research Agent",
      action: "Gathered Next.js 16 launch talking points and Alex's past DX posts",
      timestamp: "Tue 10:15 AM",
    },
    {
      id: "a7",
      agent: "Content Drafter",
      action: "Generated LinkedIn post + X thread drafts",
      timestamp: "Tue 11:28 AM",
    },
    {
      id: "a8",
      agent: "Calendar Agent",
      action: "Reserved Jun 30 sponsored slot — no organic conflicts",
      timestamp: "Tue 11:29 AM",
    },
    {
      id: "a9",
      agent: "Approval Agent",
      action: "Sent drafts to brand for review — awaiting response",
      timestamp: "Tue 11:30 AM",
    },
  ],
  drafts: [
    {
      platform: "linkedin",
      content:
        "Shipped my first Next.js 16 app this week and the DX improvements are real.\n\n▸ Turbopack is noticeably faster in dev\n▸ The new caching defaults just make sense\n▸ App Router patterns feel mature now\n\nIf you're still on 15, the migration path is smoother than you'd expect.\n\n#NextJS #WebDev #Vercel",
      status: "pending",
    },
    {
      platform: "x",
      content:
        "🧵 Just migrated to @nextjs 16 — here's what actually changed for me:\n\n1/ Turbopack cold starts: ~40% faster locally\n2/ Cache components = less boilerplate\n3/ Server Actions feel production-ready\n\nFull breakdown in my LinkedIn post. Worth the upgrade.",
      status: "pending",
    },
  ],
  payment: {
    dealValue: 8500,
    advanceAmount: 4250,
    advanceStatus: "paid",
    finalAmount: 4250,
    finalStatus: "pending",
  },
};
