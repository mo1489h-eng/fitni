/**
 * Public site origin for auth redirects (confirmation, recovery). Set in .env for non-production:
 * VITE_AUTH_SITE_ORIGIN=https://your-domain.com
 *
 * Supabase Dashboard → Authentication → URL Configuration → add matching Redirect URLs.
 *
 * Flows:
 * - Trainer sign-up (`Register.tsx`) uses `auth.signUp`; if «Confirm email» is enabled in the dashboard,
 *   Supabase sends the confirmation email (configure SMTP or use the built-in sender).
 * - Client invite completion uses the Edge Function `register-client-account` with Admin API and
 *   `email_confirm: true`, so no separate Supabase «signup confirmation» email is required for trainees.
 */
export function getAuthSiteOrigin(): string {
  const fromEnv = typeof import.meta.env.VITE_AUTH_SITE_ORIGIN === "string" ? import.meta.env.VITE_AUTH_SITE_ORIGIN.trim() : "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "https://coachbase.health";
}

/**
 * Password recovery email link target. Must be listed in Supabase Dashboard:
 * Authentication → URL Configuration → Redirect URLs → add:
 * https://coachbase.health/reset-password
 */
export const PASSWORD_RESET_REDIRECT_URL = `${getAuthSiteOrigin()}/reset-password`;
