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
 * Accepts any thrown/shape from @supabase/supabase-js (code string|number, message variants).
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

/**
 * PostgREST returns 400 when the select list references a column that does not exist on the remote DB
 * (e.g. migrations not applied yet). Used to fall back to a narrower `profiles` select in useAuth.
 */
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
 * Single source of truth: `profiles.role` ("coach" | "trainee") from Postgres only.
 * `ensure_user_profile` / `repair_profile_role_from_metadata` run server `compute_profile_role` (clients + app_metadata + signup hints).
 */
export async function resolveFitniRole(userId: string): Promise<FitniRole | null> {
  const read = () => supabase.from("profiles").select("role").eq("user_id", userId).maybeSingle();

  let { data: row, error } = await read();
  if (error && isMissingProfilesRoleColumn(error)) {
    authLogDev("role_column_absent", { userId });
    return null;
  }
  if (error) {
    console.error("[auth] resolveFitniRole profile select", error);
    authLogDev("role_resolution_error", {
      userId,
      code: (error as { code?: string }).code,
      message: (error as Error).message,
    });
    return null;
  }

  const norm = (r: typeof row) => normalizeFitniRole(r?.role as string | undefined);

  let resolved = norm(row);
  if (resolved) {
    authLogDev("role_resolution", { userId, source: "profiles.role", role: resolved });
    return resolved;
  }

  if (row?.role != null && String(row.role).trim() !== "") {
    authLogDev("role_invalid", { userId, rawRole: String(row.role) });
    return null;
  }

  if (!row) {
    authLogDev("role_resolution", { userId, source: "ensure_user_profile" });
    const { error: rpcErr } = await supabase.rpc("ensure_user_profile");
    if (rpcErr) {
      console.error("[auth] ensure_user_profile", rpcErr);
      authLogDev("ensure_user_profile_error", { userId, message: rpcErr.message });
    }
    const retry = await read();
    row = retry.data;
    error = retry.error;
    if (error && isMissingProfilesRoleColumn(error)) return null;
    if (error) {
      console.error("[auth] resolveFitniRole profile re-select", error);
      return null;
    }
    resolved = norm(row);
    if (resolved) {
      authLogDev("role_resolution", { userId, source: "profiles.role_after_ensure", role: resolved });
      return resolved;
    }
  }

  const { data: sessionUser } = await supabase.auth.getUser();
  if (sessionUser.user?.id !== userId) {
    return null;
  }

  const { error: repairErr } = await supabase.rpc("repair_profile_role_from_metadata");
  if (repairErr) {
    console.warn("[auth] repair_profile_role_from_metadata", repairErr.message);
  }

  const fin = await read();
  resolved = norm(fin.data);
  if (resolved) {
    authLogDev("role_resolution", { userId, source: "profiles.role_after_repair", role: resolved });
  }
  return resolved;
}
