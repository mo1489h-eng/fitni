/**
 * Calls Edge Function `admin-dashboard` via fetch (not `supabase.functions.invoke`).
 * Invokes on 401 often set `error` and omit parsed `data`, which breaks login UX in strict clients / iframes.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-dashboard`;

export type AdminDashboardJson = Record<string, unknown> & {
  error?: string;
  session_token?: string;
  filter_month?: string;
};

export async function invokeAdminDashboard(body: Record<string, unknown>): Promise<{
  status: number;
  ok: boolean;
  data: AdminDashboardJson | null;
}> {
  if (!supabaseUrl || !anonKey) {
    return { status: 0, ok: false, data: { error: "missing_supabase_env" } };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
      credentials: "omit",
    });

    let data: AdminDashboardJson | null = null;
    try {
      const text = await res.text();
      if (text) {
        data = JSON.parse(text) as AdminDashboardJson;
      }
    } catch {
      data = { error: "invalid_json" };
    }

    return { status: res.status, ok: res.ok, data };
  } catch {
    return { status: 0, ok: false, data: { error: "network" } };
  }
}
