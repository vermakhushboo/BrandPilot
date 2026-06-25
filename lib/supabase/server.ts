import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

/** Server-side client; prefers service role, falls back to anon key. */
export function createServerClient(): SupabaseClient | null {
  const { url, anonKey, serviceRoleKey } = getSupabaseConfig();
  const key = serviceRoleKey ?? anonKey;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
