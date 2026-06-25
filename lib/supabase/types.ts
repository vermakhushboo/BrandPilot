export interface DbCreatorProfile {
  id: string;
  name: string;
  handle: string;
  niche: string;
  followers: string;
  bio: string | null;
  rates: Record<string, unknown>;
  audience: Record<string, unknown>;
  platforms: unknown[];
  created_at: string;
}

export interface DbDeal {
  id: string;
  creator_profile_id: string;
  brand_name: string;
  brand_logo: string | null;
  product: string;
  stage: string;
  fit_score: number | null;
  quoted_rate: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbMessage {
  id: string;
  deal_id: string;
  sender: string;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbAgentRun {
  id: string;
  deal_id: string;
  agent_name: string;
  action: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  created_at: string;
}

export interface DbPayment {
  id: string;
  deal_id: string;
  type: "advance" | "final";
  amount: number;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbDraft {
  id: string;
  deal_id: string;
  platform: string;
  content: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbCalendarPost {
  id: string;
  creator_profile_id: string;
  deal_id: string | null;
  platform: string;
  title: string | null;
  content: string;
  scheduled_at: string | null;
  status: string;
  is_sponsored: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbApproval {
  id: string;
  deal_id: string;
  draft_id: string | null;
  status: string;
  feedback: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}
