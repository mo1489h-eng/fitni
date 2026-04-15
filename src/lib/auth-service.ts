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

/** PostgREST / Postgres when `profiles.role` was never migrated */
export function isMissingProfilesRoleColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const c = String(error.code ?? "");
  const m = (error.message ?? "").toLowerCase();
  return c === "42703" || (m.includes("profiles.role") && m.includes("does not exist"));
}

async function patchProfileRole(userId: string, role: FitniRole): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("user_id", userId);
  if (error) {
    if (isMissingProfilesRoleColumn(error)) return;
    authLogDev("role_patch_failed", { userId, role, message: error.message });
  }
}

/** When DB has no `profiles.role` column yet — infer only (no UPDATE). */
async function inferRoleWithoutRoleColumn(userId: string): Promise<FitniRole> {
  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (clientErr) console.error("[auth] inferRoleWithoutRoleColumn clients", clientErr);
  if (clientRow?.id) {
    authLogDev("role_resolution", { userId, source: "clients.auth_user_id (no role column)", role: "trainee" });
    return "trainee";
  }
  authLogDev("role_resolution", { userId, source: "default_coach (no role column)", role: "coach" });
  return "coach";
}

/**
 * Resolves Fitni role from `profiles.role`, with safe fallbacks:
 * - `ensure_user_profile` when no profile row exists
 * - Linked client (`clients.auth_user_id`) → trainee (matches DB trigger intent)
 * - Otherwise → coach (default app user)
 *
 * `ensure_user_profile` only inserts new rows; it does not fix NULL `role` on existing rows — we handle that here.
 */
export async function resolveFitniRole(userId: string): Promise<FitniRole | null> {
  const readProfileRole = async () =>
    supabase.from("profiles").select("role").eq("user_id", userId).maybeSingle();

  let { data: row, error } = await readProfileRole();
  if (error) {
    console.error("[auth] resolveFitniRole profile select", error);
    authLogDev("role_resolution_error", { userId, code: error.code, message: error.message });
    return null;
  }

  const tryNormalize = (roleRaw: string | null | undefined) => normalizeFitniRole(roleRaw as string | undefined);

  let resolved = tryNormalize(row?.role as string | undefined);
  if (resolved) {
    authLogDev("role_resolution", { userId, source: "profiles.role", role: resolved });
    return resolved;
  }

  // Garbage in role column (non-empty but not coach/trainee)
  if (row?.role != null && String(row.role).trim() !== "") {
    authLogDev("role_invalid", { userId, rawRole: String(row.role) });
    return null;
  }

  // No profile row yet
  if (!row) {
    authLogDev("role_resolution", { userId, source: "ensure_user_profile" });
    const { error: rpcErr } = await supabase.rpc("ensure_user_profile");
    if (rpcErr) {
      console.error("[auth] ensure_user_profile", rpcErr);
      authLogDev("ensure_user_profile_error", { userId, message: rpcErr.message });
    }

    const retry = await readProfileRole();
    row = retry.data;
    error = retry.error;
    if (error && isMissingProfilesRoleColumn(error)) {
      return inferRoleWithoutRoleColumn(userId);
    }
    if (error) {
      console.error("[auth] resolveFitniRole profile re-select", error);
      return null;
    }

    resolved = tryNormalize(row?.role as string | undefined);
    if (resolved) {
      authLogDev("role_resolution", { userId, source: "profiles.role_after_ensure", role: resolved });
      return resolved;
    }
  }

  // Profile exists but role is NULL/empty — infer (cannot rely on ensure_user_profile alone)
  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (clientErr) {
    console.error("[auth] resolveFitniRole clients select", clientErr);
  }

  if (clientRow?.id) {
    void patchProfileRole(userId, "trainee");
    authLogDev("role_resolution", { userId, source: "clients.auth_user_id", role: "trainee" });
    return "trainee";
  }

  void patchProfileRole(userId, "coach");
  authLogDev("role_resolution", { userId, source: "default_coach", role: "coach" });
  return "coach";
}
