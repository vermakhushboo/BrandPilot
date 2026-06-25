import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapCalendarPost,
  mapCreatorProfile,
  mapDeal,
} from "./mappers";
import type {
  DbAgentRun,
  DbCalendarPost,
  DbCreatorProfile,
  DbDeal,
  DbDraft,
  DbMessage,
  DbPayment,
} from "@/lib/supabase/types";
import type { CalendarPost, CreatorProfile, Deal } from "@/lib/types";

export async function fetchCreatorProfile(
  supabase: SupabaseClient,
): Promise<CreatorProfile | null> {
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapCreatorProfile(data as DbCreatorProfile);
}

export async function fetchPrimaryDeal(
  supabase: SupabaseClient,
): Promise<Deal | null> {
  const { data: dealRow, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dealError || !dealRow) return null;

  const deal = dealRow as DbDeal;

  const [messagesRes, agentRunsRes, draftsRes, paymentsRes] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_runs")
      .select("*")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: true }),
    supabase.from("drafts").select("*").eq("deal_id", deal.id),
    supabase.from("payments").select("*").eq("deal_id", deal.id),
  ]);

  if (messagesRes.error || agentRunsRes.error || draftsRes.error || paymentsRes.error) {
    return null;
  }

  return mapDeal(
    deal,
    (messagesRes.data ?? []) as DbMessage[],
    (agentRunsRes.data ?? []) as DbAgentRun[],
    (draftsRes.data ?? []) as DbDraft[],
    (paymentsRes.data ?? []) as DbPayment[],
  );
}

export async function fetchCalendarPosts(
  supabase: SupabaseClient,
  creatorProfileId: string,
): Promise<CalendarPost[]> {
  const { data, error } = await supabase
    .from("calendar_posts")
    .select("*")
    .eq("creator_profile_id", creatorProfileId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error || !data) return [];

  return (data as DbCalendarPost[]).map(mapCalendarPost);
}
