/**
 * Paid invite flow: store pending credentials + create Tap charge (no auth user until payment succeeds).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptPendingTraineePassword } from "../_shared/pendingTraineeCrypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function publicOrigin(bodyOrigin: unknown): string {
  const trimmed = typeof bodyOrigin === "string" ? bodyOrigin.trim().replace(/\/$/, "") : "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return (Deno.env.get("PUBLIC_APP_URL") ?? "https://coachbase.health").replace(/\/$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("PENDING_TRAINEE_REG_SECRET");
    if (!secret || secret.length < 16) {
      console.error("[create-trainee-checkout] Set PENDING_TRAINEE_REG_SECRET (16+ chars) in Edge secrets");
      return new Response(
        JSON.stringify({ success: false, code: "SERVER_CONFIG", message: "Pending registration secret not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const invite_token = body.invite_token as string | undefined;
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    const password = body.password as string | undefined;
    const name = (body.name as string | undefined)?.trim() ?? "";
    const phone = (body.phone as string | undefined)?.trim() || null;
    const siteOrigin = publicOrigin(body.site_origin);

    if (!invite_token || !email || !password) {
      return new Response(
        JSON.stringify({ success: false, code: "MISSING_FIELDS", message: "Missing invite_token, email, or password" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, code: "WEAK_PASSWORD", message: "Password must be at least 6 characters" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tapSecret = Deno.env.get("TAP_SECRET_KEY");
    if (!supabaseUrl || !serviceRoleKey || !tapSecret) {
      return new Response(
        JSON.stringify({ success: false, code: "SERVER_CONFIG", message: "Server misconfigured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("id, email, invite_token, auth_user_id, created_at, trainer_id, subscription_price, billing_cycle")
      .eq("invite_token", invite_token)
      .maybeSingle();

    if (clientErr || !client) {
      return new Response(
        JSON.stringify({ success: false, code: "INVALID_INVITE", message: "رابط الدعوة غير صالح أو منتهي الصلاحية" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokenAge = Date.now() - new Date(client.created_at as string).getTime();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    if (tokenAge > SEVEN_DAYS) {
      return new Response(
        JSON.stringify({ success: false, code: "TOKEN_EXPIRED", message: "انتهت صلاحية الرابط، تواصل مع مدربك" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (client.auth_user_id) {
      return new Response(
        JSON.stringify({ success: false, code: "ALREADY_LINKED", message: "هذا الحساب مربوط مسبقاً. سجّل دخولك." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (client.email && client.email.trim().toLowerCase() !== email) {
      return new Response(
        JSON.stringify({ success: false, code: "EMAIL_MISMATCH", message: "البريد الإلكتروني لا يتطابق مع الدعوة" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const amount = Number(client.subscription_price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "NO_PAYMENT_REQUIRED",
          message: "هذا الدعوة بدون رسوم — أكمل التسجيل من نفس الصفحة بدون دفع.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const enc = await encryptPendingTraineePassword(password, secret);

    const { error: pendErr } = await supabaseAdmin
      .from("clients")
      .update({
        pending_reg_full_name: name || null,
        pending_reg_password_enc: enc,
        pending_reg_phone: phone,
      })
      .eq("invite_token", invite_token)
      .is("auth_user_id", null);

    if (pendErr) {
      console.error("[create-trainee-checkout] pending update:", pendErr);
      return new Response(
        JSON.stringify({ success: false, code: "PENDING_SAVE_FAILED", message: pendErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const redirectBase = `${siteOrigin}/payment/callback?type=trainee_registration`;
    const chargeRef = crypto.randomUUID();
    const meta: Record<string, string> = {
      type: "trainee_registration",
      invite_token,
      client_id: client.id,
      trainer_id: client.trainer_id as string,
      amount: String(amount),
    };

    const tapRes = await fetch("https://api.tap.company/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tapSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "SAR",
        description: `اشتراك متدرب — CoachBase`,
        source: { id: "src_all" },
        redirect: { url: redirectBase },
        metadata: meta,
        reference: { transaction: chargeRef, order: chargeRef },
        customer: {
          first_name: name || "Trainee",
          email,
          ...(phone
            ? {
                phone: {
                  country_code: "966",
                  number: phone.replace(/^0/, "").replace(/^\+966/, ""),
                },
              }
            : {}),
        },
      }),
    });

    const tapData = await tapRes.json();
    if (!tapRes.ok) {
      console.error("[create-trainee-checkout] Tap error:", tapData);
      return new Response(
        JSON.stringify({ success: false, code: "TAP_ERROR", message: "تعذّر إنشاء عملية الدفع", details: tapData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const paymentUrl = tapData.transaction?.url as string | undefined;
    if (!paymentUrl) {
      return new Response(
        JSON.stringify({ success: false, code: "TAP_NO_URL", message: "لم يُرجَع رابط الدفع" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, tap_payment_url: paymentUrl, charge_id: tapData.id as string }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[create-trainee-checkout]", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
