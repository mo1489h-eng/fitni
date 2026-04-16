import { supabase } from "@/integrations/supabase/client";

/** Same key as `usePortalToken` / `MobileLogin` — portal RPCs read token from sessionStorage after first URL visit. */
export const TRAINEE_PORTAL_TOKEN_STORAGE_KEY = "portal_token";

/**
 * Load the linked client's `portal_token` and store it for `/portal/*` routes (web parity with native app login).
 */
export async function syncTraineePortalTokenForUser(authUserId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from("clients")
      .select("portal_token")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    const t = data?.portal_token?.trim();
    if (t && t.length >= 8) {
      sessionStorage.setItem(TRAINEE_PORTAL_TOKEN_STORAGE_KEY, t);
    }
  } catch {
    /* ignore */
  }
}

export function clearTraineePortalToken(): void {
  try {
    sessionStorage.removeItem(TRAINEE_PORTAL_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
