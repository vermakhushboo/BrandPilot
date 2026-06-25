import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

let browserClient: SupabaseClient | null = null;

/** Browser-safe client using the anon key. Returns null when not configured. */
export function createBrowserClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  if (!browserClient) {
    browserClient = createClient(url, anonKey);
  }

  return browserClient;
}
