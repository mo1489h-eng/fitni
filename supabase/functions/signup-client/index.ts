import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { creditTrainerWalletFromTap } from "../_shared/walletCredit.ts";
import { getResendApiKey, resendFromAddress } from "../_shared/resendConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      payment_id, package_id, trainer_id,
      client_name, client_phone, client_email, client_password,
      client_age, client_weight, client_height, client_goal, client_notes,
      amount, referral_code,
    } = await req.json();

    if (!payment_id || !package_id || !trainer_id || !client_name || !client_email || !client_password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tapSecret = Deno.env.get("TAP_SECRET_KEY");
    if (!tapSecret) {
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tapRes = await fetch(`https://api.tap.company/v2/charges/${payment_id}`, {
      headers: { Authorization: `Bearer ${tapSecret}` },
    });
    if (!tapRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to verify payment" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await tapRes.json();
    if (payment.status !== "CAPTURED") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingPayment } = await supabase
      .from("client_payments")
      .select("id")
      .eq("tap_charge_id", payment_id)
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ error: "Payment already processed" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pkg, error: pkgError } = await supabase
      .from("trainer_packages")
      .select("*")
      .eq("id", package_id)
      .eq("trainer_id", trainer_id)
      .eq("is_active", true)
      .maybeSingle();

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (Number(payment.amount) !== Number(pkg.price)) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: client_email,
      password: client_password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ error: "هذا الإيميل مسجل بالفعل. جرب تسجيل الدخول" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw authError;
    }

    const authUserId = authData.user.id;

    const now = new Date();
    const endDate = new Date(now);
    const cycle = pkg.billing_cycle || "monthly";
    if (cycle === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
    else if (cycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: client_name,
        phone: client_phone,
        email: client_email,
        trainer_id: trainer_id,
        auth_user_id: authUserId,
        goal: client_goal || "",
        age: client_age || null,
        weight: client_weight || null,
        height: client_height || null,
        subscription_price: pkg.price,
        subscription_end_date: endDate.toISOString().split("T")[0],
        billing_cycle: cycle,
      })
      .select("id, portal_token")
      .single();

    if (clientError) {
      console.error("Client insert error:", clientError);
      throw clientError;
    }

    await supabase.from("client_payments").insert({
      client_id: clientData.id,
      trainer_id: trainer_id,
      amount: pkg.price,
      tap_charge_id: payment_id,
      payment_method: "tap",
      status: "paid",
      billing_cycle: cycle,
      period_start: now.toISOString().split("T")[0],
      period_end: endDate.toISOString().split("T")[0],
    });

    const wallet = await creditTrainerWalletFromTap(supabase, {
      tapChargeId: payment_id,
      trainerId: trainer_id,
      amount: pkg.price,
      kind: "subscription",
    });
    if (!wallet.ok) {
      console.error("signup-client wallet credit failed:", wallet.error);
      return new Response(JSON.stringify({ error: "Failed to credit trainer wallet" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("trainer_notifications").insert({
      trainer_id: trainer_id,
      client_id: clientData.id,
      type: "new_client",
      title: `عميل جديد! ${client_name} اشترك في ${pkg.name}`,
      body: `المبلغ: ${pkg.price} ر.س — الهدف: ${client_goal || "غير محدد"}`,
    });

    if (referral_code) {
      const { data: referrer } = await supabase
        .from("clients")
        .select("id, name, trainer_id")
        .eq("referral_code", referral_code)
        .eq("trainer_id", trainer_id)
        .maybeSingle();

      if (referrer) {
        await supabase.from("referrals").insert({
          referrer_client_id: referrer.id,
          referred_client_id: clientData.id,
          trainer_id: trainer_id,
          reward_status: "pending",
        });

        await supabase.from("trainer_notifications").insert({
          trainer_id: trainer_id,
          client_id: clientData.id,
          type: "referral",
          title: `متدرب جديد انضم عبر إحالة ${referrer.name}`,
          body: `${client_name} انضم عبر رابط إحالة ${referrer.name}`,
        });
      }
    }

    const resendKey = getResendApiKey();
    if (resendKey) {
      const { data: trainerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", trainer_id)
        .maybeSingle();

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: resendFromAddress(),
            to: [client_email],
            subject: `مرحباً ${client_name}! 💪 — اشتراكك جاهز`,
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; color: #fff; border-radius: 16px;">
                <h1 style="color: #16a34a; text-align: center;">CoachBase</h1>
                <h2 style="text-align: center;">مرحباً ${client_name}! 💪</h2>
                <p style="text-align: center; color: #999;">اشتراكك مع ${trainerProfile?.full_name || "مدربك"} تم بنجاح</p>
                <div style="background: rgba(34,197,94,0.1); border-radius: 12px; padding: 20px; margin: 20px 0;">
                   <p><strong style="color: #16a34a;">الباقة:</strong> ${pkg.name}</p>
                   <p><strong style="color: #16a34a;">الإيميل:</strong> ${client_email}</p>
                   <p><strong style="color: #16a34a;">صالح حتى:</strong> ${endDate.toLocaleDateString("ar-SA")}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://coachbase.health/client-login" style="background: #16a34a; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">ادخل لبوابتك الآن</a>
                </div>
                <p style="color: #666; font-size: 12px; text-align: center;">شكراً لثقتك — فريق CoachBase</p>
              </div>
            `,
          }),
        });
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, client_id: clientData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
