const DASHBOARD_PROJECT_PATTERN = /project\/([a-z0-9]+)/i;

/** Resolve API URL from env; accepts dashboard URLs pasted by mistake. */
export function resolveSupabaseUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;

  const trimmed = raw.trim().replace(/\/$/, "");

  if (trimmed.includes(".supabase.co")) {
    return trimmed;
  }

  const match = trimmed.match(DASHBOARD_PROJECT_PATTERN);
  if (match) {
    return `https://${match[1]}.supabase.co`;
  }

  return null;
}

export function getSupabaseConfig() {
  const url = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

  return { url, anonKey, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey, serviceRoleKey } = getSupabaseConfig();
  return Boolean(url && (anonKey || serviceRoleKey));
}

/** Store uses Supabase only when URL + service role key are present. */
export function isStoreSupabaseEnabled(): boolean {
  const { url, serviceRoleKey } = getSupabaseConfig();
  return Boolean(url && serviceRoleKey);
}
