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
 * Resolve role after login: trainer profile row in `profiles` → coach; else linked row in
 * `clients.auth_user_id` → trainee. (No separate `profiles.role` column in current schema —
 * presence of a trainer profile implies coach.)
 */
export async function resolveFitniRole(userId: string): Promise<FitniRole | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("resolveFitniRole profile", error);
  }

  if (profile?.id) return "coach";

  const { data: client } = await supabase.from("clients").select("id").eq("auth_user_id", userId).maybeSingle();

  if (client) return "trainee";

  return null;
}
