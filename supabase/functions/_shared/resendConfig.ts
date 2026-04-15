/**
 * Resend + Supabase Edge Functions
 *
 * In Supabase Dashboard → Edge Functions → Secrets, set the same values you use with
 * Resend (API key from resend.com/api-keys). Optional: RESEND_FROM so all transactional
 * mail uses your verified domain without editing code.
 *
 * - RESEND_API_KEY — primary; also checks RESEND_API_KEY_1, RESEND_KEY, RESEND_SECRET
 *   (matches common Supabase / dashboard naming).
 * - RESEND_FROM — e.g. `CoachBase <noreply@your-verified-domain.com>` (must match Resend Domains).
 * - RESEND_FROM_SUPPORT — optional; defaults to `CoachBase <support@coachbase.health>` for inbound-forward emails.
 */

const DEFAULT_FROM = "CoachBase <noreply@coachbase.health>";
const DEFAULT_FROM_SUPPORT = "CoachBase <support@coachbase.health>";

export function getResendApiKey(): string | null {
  const names = ["RESEND_API_KEY", "RESEND_API_KEY_1", "RESEND_KEY", "RESEND_SECRET"] as const;
  for (const n of names) {
    const v = Deno.env.get(n)?.trim();
    if (v) return v;
  }
  return null;
}

/** Verified-domain sender for most transactional email (invites, payments, reminders). */
export function resendFromAddress(): string {
  const from = Deno.env.get("RESEND_FROM")?.trim();
  if (from) return from;
  return DEFAULT_FROM;
}

/** Optional separate "from" for support/inbound-forward flows; verify `support@…` in Resend if used. */
export function resendFromSupportAddress(): string {
  const from = Deno.env.get("RESEND_FROM_SUPPORT")?.trim();
  if (from) return from;
  return DEFAULT_FROM_SUPPORT;
}
