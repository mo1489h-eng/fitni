import { supabase } from "@/integrations/supabase/client";
import { getAuthSiteOrigin } from "@/lib/auth-constants";
import { TRAINER_HOME } from "@/lib/app-routes";

/** Resend signup confirmation to a specific address. */
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

/** Sync verification from auth — no-op if RPC doesn't exist. */
export async function syncVerificationStatus(): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not authenticated") };
    // Use auth.getUser() to check email confirmation directly
    const verified = !!user.email_confirmed_at;
    return { error: verified ? null : new Error("Email not verified") };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/** True when the user's email is verified via auth. */
export function checkVerification(profile: { email_verified?: boolean | null } | null | undefined): boolean {
  return profile?.email_verified === true;
}
