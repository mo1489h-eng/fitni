import { supabase } from "@/integrations/supabase/client";
import { authLogDev } from "@/lib/auth-log";
import { normalizeFitniRole, type FitniRole } from "@/lib/auth-role";

export type { FitniRole } from "@/lib/auth-role";
export { normalizeFitniRole } from "@/lib/auth-role";

export const FITNI_ROLE_STORAGE_KEY = "fitni.user_role_v1";

export function readStoredFitniRole(): FitniRole | null {
  try {
    const s = localStorage.getItem(FITNI_ROLE_STORAGE_KEY);
    return s === "coach" || s === "trainee" ? s : null;
  } catch {
    return null;
  }
}

export function persistFitniRole(role: FitniRole): void {
  try {
    localStorage.setItem(FITNI_ROLE_STORAGE_KEY, role);
  } catch {
    /* ignore */
  }
}

export function clearStoredFitniRole(): void {
  try {
    localStorage.removeItem(FITNI_ROLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Single source of truth: `profiles.role` only (see DB trigger on `clients` for trainee sync).
 * If no row exists, calls `ensure_user_profile()` then re-reads.
 */
export async function resolveFitniRole(userId: string): Promise<FitniRole | null> {
  const readRole = async () =>
    supabase.from("profiles").select("role").eq("user_id", userId).maybeSingle();

  let { data: row, error } = await readRole();
  if (error) {
    console.error("[auth] resolveFitniRole profile select", error);
    authLogDev("role_resolution_error", { userId, code: error.code, message: error.message });
    return null;
  }

  let resolved = normalizeFitniRole(row?.role as string | undefined);
  if (resolved) {
    authLogDev("role_resolution", { userId, source: "profiles.role", role: resolved });
    return resolved;
  }

  if (row && row.role != null && !resolved) {
    authLogDev("role_invalid", { userId, rawRole: String(row.role) });
    return null;
  }

  authLogDev("role_resolution", { userId, source: "ensure_user_profile" });
  const { error: rpcErr } = await supabase.rpc("ensure_user_profile");
  if (rpcErr) {
    console.error("[auth] ensure_user_profile", rpcErr);
    authLogDev("ensure_user_profile_error", { userId, message: rpcErr.message });
  }

  const retry = await readRole();
  row = retry.data;
  error = retry.error;
  if (error) {
    console.error("[auth] resolveFitniRole profile re-select", error);
    return null;
  }

  resolved = normalizeFitniRole(row?.role as string | undefined);
  if (resolved) {
    authLogDev("role_resolution", { userId, source: "profiles.role_after_ensure", role: resolved });
    return resolved;
  }

  if (row?.role != null && !resolved) {
    authLogDev("role_invalid_after_ensure", { userId, rawRole: String(row.role) });
    return null;
  }

  console.warn("[auth] resolveFitniRole: no profile or role after ensure", { userId });
  authLogDev("role_resolution_failed", { userId });
  return null;
}
