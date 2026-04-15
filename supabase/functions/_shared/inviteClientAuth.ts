import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type InviteClientAuthResult = {
  success: boolean;
  emailSent?: boolean;
  setupLink?: string;
  authUserId?: string;
  skipped?: boolean;
  message?: string;
  error?: string;
};

function publicAppUrl(siteOrigin?: string): string {
  const trimmed = (siteOrigin ?? "").trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return (Deno.env.get("PUBLIC_APP_URL") ?? "https://coachbase.health").replace(/\/$/, "");
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
  }
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
    return { success: true, skipped: true, message: "Already linked to auth" };
  }

  const em = (params.email || row.email || "").trim();
  if (!em) {
    return { success: false, error: "No email on client" };
  }

  const inviteToken = params.inviteToken ?? row.invite_token;
  const base = publicAppUrl(params.siteOrigin ?? undefined);
  const setupLink = inviteToken
    ? `${base}/client-register/${inviteToken}`
    : `${base}/client-login`;

  // Send email via Resend directly — no auth user creation
  const resendKey = Deno.env.get("RESEND_API_KEY") || Deno.env.get("RESEND_API_KEY_1");
  if (resendKey && inviteToken) {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CoachBase <noreply@coachbase.health>",
        to: [em],
        subject: `مرحباً ${clientName} 👋 - دعوة من ${trainerName}`,
        html: `
          <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; color: #ffffff; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #16a34a; font-size: 28px; margin: 0;">CoachBase</h1>
            </div>
            <h2 style="font-size: 22px; margin-bottom: 8px;">مرحباً ${clientName} 👋</h2>
            <p style="color: #a0a0a0; font-size: 16px; line-height: 1.8;">
              مدربك <strong style="color: #16a34a;">${trainerName}</strong> أضافك على منصة CoachBase
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
      return { success: false, error: `Resend ${emailRes.status}: ${errText.slice(0, 200)}`, setupLink };
    }
    return { success: true, emailSent: true, setupLink };
  }

  if (!resendKey) {
    console.warn("[inviteClientAuth] RESEND_API_KEY not set — email not sent. PUBLIC_APP_URL / setup link:", setupLink);
  }

  return {
    success: true,
    emailSent: false,
    setupLink,
    message: resendKey
      ? "لم يتم إرسال الإيميل"
      : "لم يتم إعداد خدمة الإيميل. شارك الرابط يدوياً",
  };
}
