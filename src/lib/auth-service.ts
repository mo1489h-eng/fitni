import { supabase } from "@/integrations/supabase/client";

/** Canonical Fitni roles (DB + routing) */
export type FitniRole = "coach" | "trainee";

export const FITNI_ROLE_STORAGE_KEY = "fitni.user_role_v1";

export function normalizeFitniRole(raw: string | null | undefined): FitniRole | null {
  if (!raw) return null;
  const r = raw.toLowerCase().trim();
  if (r === "coach" || r === "trainer") return "coach";
  if (r === "trainee" || r === "client") return "trainee";
  return null;
}

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
 * Resolve app role. Order matters:
 * 1) `clients.auth_user_id` → trainee (even if `profiles` exists — auth trigger may have inserted coach profile).
 * 2) `profiles.role` when set to trainee → trainee.
 * 3) `profiles` row → coach.
 * 4) Else `ensure_trainer_profile` once for trainer signup lag, then re-check profile.
 */
export async function resolveFitniRole(userId: string): Promise<FitniRole | null> {
  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (clientErr) console.error("[auth] resolveFitniRole clients select", clientErr);
  if (clientRow?.id) {
    if (import.meta.env.DEV) console.log("[auth] resolveFitniRole: trainee (clients.auth_user_id)");
    return "trainee";
  }

  const selectProfile = async () =>
    supabase.from("profiles").select("id, role").eq("user_id", userId).maybeSingle();

  let { data: profile, error } = await selectProfile();

  if (error) console.error("[auth] resolveFitniRole profile select", error);

  if (profile?.id) {
    const dbRole = normalizeFitniRole(profile.role as string | null | undefined);
    if (dbRole === "trainee") {
      if (import.meta.env.DEV) console.log("[auth] resolveFitniRole: trainee (profiles.role)");
      return "trainee";
    }
    if (import.meta.env.DEV) console.log("[auth] resolveFitniRole: coach (profiles row)");
    return "coach";
  }

  if (import.meta.env.DEV) console.log("[auth] resolveFitniRole: no profile — ensure_trainer_profile");
  const { error: rpcErr } = await supabase.rpc("ensure_trainer_profile" as any);
  if (rpcErr) {
    console.error("[auth] resolveFitniRole ensure_trainer_profile", rpcErr);
  } else {
    const retry = await selectProfile();
    profile = retry.data;
    error = retry.error;
    if (error) console.error("[auth] resolveFitniRole profile re-select", error);
    if (profile?.id) {
      const dbRole = normalizeFitniRole(profile.role as string | null | undefined);
      if (dbRole === "trainee") return "trainee";
      if (import.meta.env.DEV) console.log("[auth] resolveFitniRole: coach (after ensure_trainer_profile)");
      return "coach";
    }
  }

  console.warn("[auth] resolveFitniRole: still no role after ensure — returning null", { userId });
  return null;
}
