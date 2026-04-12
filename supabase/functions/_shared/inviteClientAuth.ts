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

function publicAppUrl(): string {
  return (Deno.env.get("PUBLIC_APP_URL") ?? "https://coachbase.health").replace(/\/$/, "");
}

function inviteRedirectUrl(): string {
  return (
    Deno.env.get("CLIENT_INVITE_REDIRECT_URL") ?? `${publicAppUrl()}/client-login`
  );
}

function isDuplicateEmailError(err: { message?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return (
    m.includes("already") ||
    m.includes("registered") ||
    m.includes("exists") ||
    m.includes("duplicate")
  );
}

async function findAuthUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("listUsers:", error.message);
      return null;
    }
    const user = data.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
    if (user?.id) return user.id;
    if (data.users.length < perPage) break;
    page++;
  }
  return null;
}

async function linkClientToAuthUser(
  supabase: SupabaseClient,
  clientId: string,
  authUserId: string
): Promise<void> {
  const { error } = await supabase
    .from("clients")
    .update({ auth_user_id: authUserId, invite_token: null })
    .eq("id", clientId);
  if (error) throw error;
}

/**
 * Sends Supabase Auth invite (set-password email) and links clients.auth_user_id.
 * Falls back to Resend + manual /client-register/:token when Auth invite fails.
 */
export async function inviteClientAuth(
  supabase: SupabaseClient,
  params: {
    clientId: string;
    email: string;
    clientName: string;
    trainerName?: string;
    inviteToken?: string | null;
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
  const base = publicAppUrl();
  const setupLink = inviteToken
    ? `${base}/client-register/${inviteToken}`
    : `${base}/client-login`;

  const redirectTo = inviteRedirectUrl();

  const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
    em,
    {
      redirectTo,
      data: {
        is_client_invite: true,
        invite_token: inviteToken,
        client_name: clientName,
        trainer_name: trainerName,
        client_id: clientId,
      },
    }
  );

  if (!inviteErr && inviteData?.user?.id) {
    await linkClientToAuthUser(supabase, clientId, inviteData.user.id);
    return {
      success: true,
      emailSent: true,
      setupLink,
      authUserId: inviteData.user.id,
    };
  }

  if (inviteErr && isDuplicateEmailError(inviteErr)) {
    const existingId = await findAuthUserIdByEmail(supabase, em);
    if (existingId) {
      await linkClientToAuthUser(supabase, clientId, existingId);
      return {
        success: true,
        emailSent: false,
        setupLink,
        authUserId: existingId,
        message: "Linked existing auth user",
      };
    }
  }

  console.log("inviteUserByEmail failed, Resend fallback:", inviteErr?.message);

  const resendKey = Deno.env.get("RESEND_API_KEY");
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
                  إذا لم تطلب هذا الرابط، يمكنك تجاهل هذا الإيميل
                </p>
              </div>
            `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return {
        success: false,
        error: "Failed to send email",
        setupLink,
      };
    }
    return { success: true, emailSent: true, setupLink };
  }

  if (!resendKey) {
    console.log("No RESEND_API_KEY; manual link:", setupLink);
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
