import { supabase } from "@/integrations/supabase/client";
import { getAuthSiteOrigin } from "@/lib/auth-constants";
import { TRAINER_HOME } from "@/lib/app-routes";

/**
 * CoachBase: optional email verification — app uses `profiles.email_verified` for sensitive actions,
 * not `auth.users.email_confirmed_at` for blocking login.
 */

/** Resend signup confirmation to a specific address (e.g. `/confirm-email` before session exists). */
export async function sendSignupConfirmationToEmail(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${getAuthSiteOrigin()}${TRAINER_HOME}` },
  });
  return { error: error ? new Error(error.message) : null };
}

export async function sendVerificationEmail(): Promise<{ error: Error | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: new Error("No authenticated email") };
  return sendSignupConfirmationToEmail(user.email);
}

export async function syncVerificationStatus(): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("sync_profile_email_verification_from_auth");
  return { error: error ? new Error(error.message) : null };
}

/** True when the profile row marks email as verified (synced from auth on confirm). */
export function checkVerification(profile: { email_verified?: boolean | null } | null | undefined): boolean {
  return profile?.email_verified === true;
}
