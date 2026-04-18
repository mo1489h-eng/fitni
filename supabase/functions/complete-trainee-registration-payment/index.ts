/**
 * After Tap CAPTURED for trainee_registration: create auth user, link client, settle wallet (service role; no JWT).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptPendingTraineePassword } from "../_shared/pendingTraineeCrypto.ts";
import { creditTrainerWalletFromTap } from "../_shared/walletCredit.ts";
import { getResendApiKey, resendFromAddress } from "../_shared/resendConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isDuplicateUserError(err: { message?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return m.includes("already") || m.includes("registered") || m.includes("exists") || m.includes("duplicate");
}

async function findUserIdByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const { data: rpcId, error: rpcErr } = await supabaseAdmin.rpc("get_auth_user_id_by_email", {
    p_email: email,
  });
  if (!rpcErr && rpcId) return rpcId as string;

  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = data?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (users.length < perPage) return null;
    page += 1;
  }
  return null;
}

function amountMatches(a: number, b: number): boolean {
  return Math.abs(Number(a) - Number(b)) < 0.02;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("PENDING_TRAINEE_REG_SECRET");
    if (!secret || secret.length < 16) {
      return new Response(
        JSON.stringify({ success: false, error: "PENDING_TRAINEE_REG_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { payment_id } = await req.json();
    if (!payment_id || typeof payment_id !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Missing payment_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tapSecret = Deno.env.get("TAP_SECRET_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existingPay } = await supabase
      .from("client_payments")
      .select("client_id")
      .eq("tap_charge_id", payment_id)
      .maybeSingle();

    if (existingPay?.client_id) {
      const { data: cl } = await supabase
        .from("clients")
        .select("email, auth_user_id")
        .eq("id", existingPay.client_id)
        .maybeSingle();
      if (cl?.auth_user_id) {
        return new Response(
          JSON.stringify({ success: true, email: (cl.email ?? "").trim(), idempotent: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const tapRes = await fetch(`https://api.tap.company/v2/charges/${payment_id}`, {
      headers: { Authorization: `Bearer ${tapSecret}` },
    });
    if (!tapRes.ok) {
      return new Response(JSON.stringify({ success: false, error: "Failed to verify payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await tapRes.json();
    if (payment.status !== "CAPTURED") {
      return new Response(
        JSON.stringify({ success: false, error: "Payment not completed", status: payment.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const meta = (payment.metadata ?? {}) as Record<string, string>;
    if (String(meta.type || "") !== "trainee_registration") {
      return new Response(JSON.stringify({ success: false, error: "Invalid payment type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inviteToken = String(meta.invite_token || "").trim();
    if (!inviteToken) {
      return new Response(JSON.stringify({ success: false, error: "Missing invite_token in metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tapAmount = Number(payment.amount);

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select(
        "id, email, phone, invite_token, auth_user_id, trainer_id, subscription_price, billing_cycle, pending_reg_password_enc, pending_reg_full_name, pending_reg_phone, created_at",
      )
      .eq("invite_token", inviteToken)
      .maybeSingle();

    if (clientErr || !client) {
      return new Response(JSON.stringify({ success: false, error: "Invite no longer valid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (client.auth_user_id) {
      return new Response(
        JSON.stringify({ success: true, email: (client.email ?? "").trim(), idempotent: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!amountMatches(tapAmount, Number(client.subscription_price))) {
      return new Response(JSON.stringify({ success: false, error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enc = client.pending_reg_password_enc as string | null;
    if (!enc) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing pending registration — restart checkout from invite link" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let password: string;
    try {
      password = await decryptPendingTraineePassword(enc, secret);
    } catch (e) {
      console.error("[complete-trainee-registration-payment] decrypt failed:", e);
      return new Response(JSON.stringify({ success: false, error: "Invalid pending registration data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = (client.email as string).trim().toLowerCase();
    const name = ((client.pending_reg_full_name as string | null) ?? "").trim() || (client.email as string);
    const pendingPhone = (client.pending_reg_phone as string | null)?.trim() || null;

    let userId: string | null = null;

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, is_client: true, role: "trainee", source: "invite" },
      app_metadata: { fitni_signup: "invite" },
    });

    if (createErr) {
      if (!isDuplicateUserError(createErr)) {
        console.error("createUser failed:", createErr.message);
        return new Response(
          JSON.stringify({ success: false, error: createErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const existingId = await findUserIdByEmail(supabase, email);
      if (!existingId) {
        return new Response(
          JSON.stringify({ success: false, error: "User exists but could not be resolved" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      userId = existingId;

      const { data: existingAuth } = await supabase.auth.admin.getUserById(userId);
      const prevApp = (existingAuth?.user?.app_metadata ?? {}) as Record<string, unknown>;
      const prevUserMeta = (existingAuth?.user?.user_metadata ?? {}) as Record<string, unknown>;

      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          ...prevUserMeta,
          full_name: name,
          is_client: true,
          role: "trainee",
          source: "invite",
        },
        app_metadata: { ...prevApp, fitni_signup: "invite" },
      });
      if (updateErr) {
        return new Response(JSON.stringify({ success: false, error: updateErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = created.user?.id ?? null;
      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: "No user id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: otherClient } = await supabase
      .from("clients")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (otherClient && otherClient.id !== client.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Email linked to another client profile" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trainerId = client.trainer_id as string;
    const cycle = ((client.billing_cycle as string | null) || "monthly").trim() || "monthly";
    const now = new Date();
    const endDate = new Date(now);
    if (cycle === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
    else if (cycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().split("T")[0];

    const phoneMerged = (client.phone as string | null)?.trim() || pendingPhone || null;

    const { data: linkedRows, error: linkErr } = await supabase
      .from("clients")
      .update({
        auth_user_id: userId,
        invite_token: null,
        pending_reg_full_name: null,
        pending_reg_password_enc: null,
        pending_reg_phone: null,
        payment_pending: false,
        subscription_end_date: endDateStr,
        subscription_price: tapAmount,
        billing_cycle: cycle,
        ...(phoneMerged ? { phone: phoneMerged } : {}),
      })
      .eq("invite_token", inviteToken)
      .is("auth_user_id", null)
      .select("id")
      .maybeSingle();

    if (linkErr || !linkedRows?.id) {
      console.error("[complete-trainee-registration-payment] link failed:", linkErr);
      return new Response(JSON.stringify({ success: false, error: linkErr?.message ?? "Link failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profErr } = await supabase
      .from("profiles")
      .update({ role: "trainee", source: "invite" })
      .eq("user_id", userId);

    if (profErr) {
      console.error("[complete-trainee-registration-payment] profile:", profErr);
    }

    const { error: payErr } = await supabase.from("client_payments").insert({
      client_id: client.id,
      trainer_id: trainerId,
      amount: tapAmount,
      tap_charge_id: payment_id,
      payment_method: "tap",
      status: "paid",
      billing_cycle: cycle,
      period_start: now.toISOString().split("T")[0],
      period_end: endDateStr,
    });

    if (payErr && (payErr as { code?: string }).code !== "23505") {
      console.error("[complete-trainee-registration-payment] client_payments:", payErr);
      return new Response(JSON.stringify({ success: false, error: payErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wallet = await creditTrainerWalletFromTap(supabase, {
      tapChargeId: payment_id,
      trainerId,
      amount: tapAmount,
      kind: "subscription",
    });
    if (!wallet.ok) {
      console.error("[complete-trainee-registration-payment] wallet:", wallet.error);
    }

    const resendKey = getResendApiKey();
    if (resendKey && email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: resendFromAddress(),
            to: [email],
            subject: "مرحباً بك في CoachBase — تم تفعيل اشتراكك ✅",
            html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
              <h1 style="color:#16a34a;">تم إنشاء حسابك بنجاح</h1>
              <p>يمكنك تسجيل الدخول باستخدام بريدك وكلمة المرور التي اخترتها.</p>
              <p style="color:#666;font-size:13px;">الفترة حتى ${endDate.toLocaleDateString("ar-SA")}</p>
            </div>`,
          }),
        });
      } catch (e) {
        console.error("[complete-trainee-registration-payment] email:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, email, userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[complete-trainee-registration-payment]", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
