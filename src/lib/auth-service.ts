import { supabase } from "@/integrations/supabase/client";
import { authLogDev } from "@/lib/auth-log";
import { normalizeFitniRole, type FitniRole } from "@/lib/auth-role";

export type { FitniRole } from "@/lib/auth-role";
export { normalizeFitniRole } from "@/lib/auth-role";

/** Legacy key — cleared on logout; role is never read from localStorage for access control. */
export const FITNI_ROLE_STORAGE_KEY = "fitni.user_role_v1";

export function clearStoredFitniRole(): void {
  try {
    localStorage.removeItem(FITNI_ROLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * PostgREST / Postgres when `profiles.role` was never migrated.
 */
export function isMissingProfilesRoleColumn(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = String(e.code ?? "");
  const msg = String(e.message ?? "");
  const details = String(e.details ?? "");
  const hint = String(e.hint ?? "");
  const all = `${msg} ${details} ${hint}`.toLowerCase();
  if (code === "42703") return true;
  if (all.includes("does not exist") && (all.includes("role") || all.includes("profiles.role"))) return true;
  return false;
}

export function isPostgrestMissingColumnError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = String(e.code ?? "");
  const msg = String(e.message ?? "").toLowerCase();
  const details = String(e.details ?? "").toLowerCase();
  const hint = String(e.hint ?? "").toLowerCase();
  const all = `${msg} ${details} ${hint}`;
  if (code === "42703" || code === "PGRST204") return true;
  if (all.includes("column") && all.includes("does not exist")) return true;
  if (msg.includes("could not find") && msg.includes("column")) return true;
  return false;
}

/**
 * Single source of truth: `profiles.role` (set by DB). No inference from `clients` or defaults.
 */
export async function resolveFitniRole(userId: string): Promise<FitniRole | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) console.warn("[auth] resolveFitniRole", error);
      authLogDev("role_resolution", { userId, source: "profiles.role", role: null, error: String((error as Error).message ?? error) });
      return null;
    }

    if (!data) {
      authLogDev("role_resolution", { userId, source: "profiles.role", role: null, reason: "no_profile_row" });
      return null;
    }

    const r = normalizeFitniRole(data.role);
    authLogDev("role_resolution", { userId, source: "profiles.role", role: r });
    return r;
  } catch (err) {
    console.error("[auth] resolveFitniRole error", err);
    return null;
  }
}
