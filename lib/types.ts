import type { DealStatus } from "@/lib/state-machine";

export type { DealStatus };

export type MessageSender = "brand" | "creator" | "agent";

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
}

export interface AgentLogEntry {
  id: string;
  agent: string;
  action: string;
  timestamp: string;
}

export interface Draft {
  platform: "linkedin" | "x";
  content: string;
  status: "pending" | "approved";
}

export interface PaymentState {
  dealValue: number;
  advanceAmount: number;
  advanceStatus: "pending" | "paid";
  finalAmount: number;
  finalStatus: "pending" | "paid";
}

export interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  niche: string;
  followers: string;
}

export interface CalendarPost {
  id: string;
  platform: string;
  title: string | null;
  content: string;
  scheduledAt: string | null;
  status: string;
  isSponsored: boolean;
}

export interface Deal {
  id: string;
  brandName: string;
  brandLogo: string | null;
  product: string;
  status: DealStatus;
  fitScore: number | null;
  quotedRate: number | null;
  messages: Message[];
  agentLogs: AgentLogEntry[];
  drafts: Draft[];
  payment: PaymentState;
}

export type DataSource = "supabase" | "demo";

export interface ControlRoomData {
  source: DataSource;
  creator: CreatorProfile;
  deal: Deal;
  calendarPosts: CalendarPost[];
}
