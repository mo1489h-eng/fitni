/**
 * Password recovery email link target. Must be listed in Supabase Dashboard:
 * Authentication → URL Configuration → Redirect URLs → add:
 * https://coachbase.health/reset-password
 */
export const PASSWORD_RESET_REDIRECT_URL =
  typeof import.meta.env.VITE_AUTH_SITE_ORIGIN === "string" && import.meta.env.VITE_AUTH_SITE_ORIGIN.trim()
    ? `${import.meta.env.VITE_AUTH_SITE_ORIGIN.replace(/\/$/, "")}/reset-password`
    : "https://coachbase.health/reset-password";
