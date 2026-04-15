import type { SupabaseClient } from "@supabase/supabase-js";

/** Why email was not sent (safe to show in UI; no secrets). */
export type InviteEmailReason =
  | "missing_resend_api_key"
  | "missing_invite_token"
  | "resend_request_failed"
  | "already_linked";

export type InviteClientAuthResult = {
  success: boolean;
  emailSent?: boolean;
  setupLink?: string;
  authUserId?: string;
  skipped?: boolean;
  message?: string;
  error?: string;
  reason?: InviteEmailReason;
  /** Resend message id when send succeeded (for support logs). */
  resendId?: string;
};

/** Supabase Edge secrets — try common names / trim whitespace. */
export function getResendApiKey(): string | null {
  const names = ["RESEND_API_KEY", "RESEND_API_KEY_1", "RESEND_KEY", "RESEND_SECRET"] as const;
  for (const n of names) {
    const v = Deno.env.get(n)?.trim();
    if (v) return v;
  }
  return null;
}

/**
 * "From" must be a domain verified in Resend (Domains), or Resend test sender.
 * Set Edge secret RESEND_FROM e.g. `CoachBase <noreply@your-verified-domain.com>`.
 */
function resendFromAddress(): string {
  const from = Deno.env.get("RESEND_FROM")?.trim();
  if (from) return from;
  return "CoachBase <onboarding@resend.dev>";
}

function publicAppUrl(siteOrigin?: string): string {
  const trimmed = (siteOrigin ?? "").trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return (Deno.env.get("PUBLIC_APP_URL") ?? "https://coachbase.health").replace(/\/$/, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends a Resend invite email with a link to /client-register/:token.
 * Does NOT create an auth user — that happens when the client submits the registration form
 * via the register-client-account edge function.
 */
export async function inviteClientAuth(
  supabase: SupabaseClient,
  params: {
    clientId: string;
    email: string;
    clientName: string;
    trainerName?: string;
    inviteToken?: string | null;
    /** Optional absolute site origin from client (`getAuthSiteOrigin()`) so dev/staging links match the environment */
    siteOrigin?: string | null;
  },
): Promise<InviteClientAuthResult> {
  const trainerName = params.trainerName ?? "مدربك";
  const { clientId, clientName } = params;

  const { data: row, error: rowErr } = await supabase
    .from("clients")
    .select("id, email, auth_user_id, invite_token")
    .eq("id", clientId)
    .maybeSingle();

  if (rowErr || !row) {
    return { success: false, error: rowErr?.message ?? "Client not found" };
  }
  if (row.auth_user_id) {
    return {
      success: true,
      skipped: true,
      reason: "already_linked",
      message: "Already linked to auth",
    };
  }

  const em = (params.email || row.email || "").trim();
  if (!em) {
    return { success: false, error: "No email on client" };
  }

  const inviteToken = params.inviteToken ?? row.invite_token;
  const base = publicAppUrl(params.siteOrigin ?? undefined);
  const setupLink = inviteToken ? `${base}/client-register/${inviteToken}` : `${base}/client-login`;

  const resendKey = getResendApiKey();

  if (!inviteToken) {
    console.warn("[inviteClientAuth] No invite_token — cannot send invite email");
    return {
      success: true,
      emailSent: false,
      setupLink,
      reason: "missing_invite_token",
      message:
        "لا يوجد رمز دعوة للعميل. تحقق من تفعيل trigger توليد invite_token على جدول clients.",
    };
  }

  if (!resendKey) {
    console.warn("[inviteClientAuth] RESEND_API_KEY not set — email not sent. setupLink:", setupLink);
    return {
      success: true,
      emailSent: false,
      setupLink,
      reason: "missing_resend_api_key",
      message:
        "لم يُضبط إرسال البريد: أضف سر RESEND_API_KEY في Supabase (Edge Functions → Secrets) ثم أعد نشر send-invite-email. يمكنك نسخ رابط التسجيل أدناه لمشاركته يدوياً.",
    };
  }

  const safeName = escapeHtml(clientName);
  const safeTrainer = escapeHtml(trainerName);

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromAddress(),
      to: [em],
      subject: `مرحباً ${clientName} 👋 - دعوة من ${trainerName}`,
      html: `
          <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; color: #ffffff; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #16a34a; font-size: 28px; margin: 0;">CoachBase</h1>
            </div>
            <h2 style="font-size: 22px; margin-bottom: 8px;">مرحباً ${safeName} 👋</h2>
            <p style="color: #a0a0a0; font-size: 16px; line-height: 1.8;">
              مدربك <strong style="color: #16a34a;">${safeTrainer}</strong> أضافك على منصة CoachBase
            </p>
            <p style="color: #a0a0a0; font-size: 16px;">أنشئ حسابك المجاني الآن:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${setupLink}" style="display: inline-block; background: #16a34a; color: #000; font-weight: bold; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-size: 18px;">
                أنشئ حسابي 💪
              </a>
            </div>
            <p style="color: #666; font-size: 12px; text-align: center;">
              صلاحية هذا الرابط 7 أيام. إذا انتهت، تواصل مع مدربك لإعادة إرسال الدعوة.
            </p>
          </div>
        `,
    }),
  });

  if (!emailRes.ok) {
    const errText = await emailRes.text();
    console.error("[inviteClientAuth] Resend HTTP error:", emailRes.status, errText);
    let detail = errText.slice(0, 400);
    try {
      const j = JSON.parse(errText) as { message?: string };
      if (j?.message) detail = j.message;
    } catch {
      /* keep raw */
    }
    const domainHint =
      /domain|verify|not valid|from/i.test(detail)
        ? " في لوحة Resend: Domains → تحقق من نطاقك، ثم أضف سر RESEND_FROM في الدالة بصيغة: الاسم <noreply@نطاقك>."
        : "";
    return {
      success: false,
      reason: "resend_request_failed",
      error: `Resend ${emailRes.status}: ${detail}`,
      setupLink,
      message:
        `فشل إرسال الإيميل عبر Resend.${domainHint} تحقق أيضاً من أن المفتاح صحيح وأن المستلم ليس محظوراً.`,
    };
  }

  let resendId: string | undefined;
  try {
    const ok = (await emailRes.json()) as { id?: string };
    if (ok?.id) resendId = ok.id;
  } catch {
    /* ignore */
  }

  return { success: true, emailSent: true, setupLink, resendId };
}
