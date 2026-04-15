import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { creditTrainerWalletFromTap } from "../_shared/walletCredit.ts";
import { getResendApiKey, resendFromAddress } from "../_shared/resendConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { payment_id, package_id, checkout_token, referral_code } = await req.json();

    if (!payment_id || !package_id || !checkout_token) {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: pkg, error: pkgError } = await supabase
      .from("trainer_packages").select("*").eq("id", package_id).eq("is_active", true).maybeSingle();

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("package_checkout_sessions").select("*")
      .eq("token", checkout_token).eq("package_id", package_id).is("used_at", null).maybeSingle();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Invalid checkout session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Checkout session expired" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Tap
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

    if (Number(payment.amount) !== Number(pkg.price)) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trainer_id = pkg.trainer_id;

    // Duplicate Tap charge: if already paid, complete wallet + session if a prior run failed mid-way
    const { data: existingPayment } = await supabase
      .from("client_payments").select("id, client_id").eq("moyasar_payment_id", payment_id).maybeSingle();

    if (existingPayment) {
      const { data: settled } = await supabase
        .from("tap_wallet_settlements").select("tap_charge_id")
        .eq("tap_charge_id", payment_id).maybeSingle();

      if (settled) {
        return new Response(JSON.stringify({ success: true, client_id: existingPayment.client_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const walletRetry = await creditTrainerWalletFromTap(supabase, {
        tapChargeId: payment_id,
        trainerId: trainer_id,
        amount: pkg.price,
        kind: "subscription",
      });
      if (!walletRetry.ok) {
        return new Response(JSON.stringify({ error: "Failed to credit trainer wallet" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("package_checkout_sessions")
        .update({ used_at: new Date().toISOString() }).eq("id", session.id);

      return new Response(JSON.stringify({ success: true, client_id: existingPayment.client_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const client_name = session.client_name;
    const client_phone = session.client_phone;
    const client_email = session.client_email;

    const now = new Date();
    const endDate = new Date(now);
    if (pkg.billing_cycle === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
    else if (pkg.billing_cycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    const { data: newClient, error: clientError } = await supabase
      .from("clients").insert({
        trainer_id, name: client_name, phone: client_phone || "",
        email: client_email || null, subscription_price: pkg.price,
        subscription_end_date: endDate.toISOString().split("T")[0],
        billing_cycle: pkg.billing_cycle, goal: pkg.name,
      }).select("id").single();

    if (clientError) {
      console.error("Client creation error:", clientError);
      return new Response(JSON.stringify({ error: "Failed to create client" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("client_payments").insert({
      client_id: newClient.id, trainer_id, amount: pkg.price,
      moyasar_payment_id: payment_id, status: "paid", billing_cycle: pkg.billing_cycle,
      period_start: now.toISOString().split("T")[0],
      period_end: endDate.toISOString().split("T")[0],
    });

    await supabase.from("trainer_notifications").insert({
      trainer_id, client_id: newClient.id, type: "payment",
      title: `${client_name} دفع ${pkg.price} ريال - ${pkg.name}`,
      body: `تم إضافة ${client_name} تلقائيا كعميل جديد`,
    });

    // Handle referral - validate referral_code server-side
    const sanitizedReferralCode = typeof referral_code === "string" && /^[a-f0-9]{1,24}$/i.test(referral_code.trim())
      ? referral_code.trim()
      : null;

    if (sanitizedReferralCode) {
      const { data: referrer } = await supabase
        .from("clients").select("id, name, trainer_id")
        .eq("referral_code", sanitizedReferralCode).eq("trainer_id", trainer_id).maybeSingle();
      if (referrer) {
        await supabase.from("referrals").insert({
          referrer_client_id: referrer.id, referred_client_id: newClient.id,
          trainer_id, reward_status: "pending",
        });
        await supabase.from("trainer_notifications").insert({
          trainer_id, client_id: newClient.id, type: "referral",
          title: `متدرب جديد انضم عبر إحالة ${referrer.name}`,
          body: `${client_name} انضم عبر رابط إحالة ${referrer.name}`,
        });
      }
    }

    const wallet = await creditTrainerWalletFromTap(supabase, {
      tapChargeId: payment_id,
      trainerId: trainer_id,
      amount: pkg.price,
      kind: "subscription",
    });
    if (!wallet.ok) {
      console.error("verify-package-payment wallet credit failed:", wallet.error);
      return new Response(JSON.stringify({ error: "Failed to credit trainer wallet" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("package_checkout_sessions")
      .update({ used_at: new Date().toISOString() }).eq("id", session.id);

    // Send receipt
    const resendKey = getResendApiKey();
    if (resendKey && client_email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: resendFromAddress(),
            to: [client_email],
            subject: "إيصال دفع — CoachBase 🧾",
            html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#1a1a2e;color:#fff;border-radius:16px;">
              <h1 style="color:#16a34a;text-align:center;">CoachBase</h1>
              <h2>تم استلام الدفع بنجاح ✅</h2>
              <div style="background:rgba(34,197,94,0.1);border-radius:12px;padding:20px;margin:20px 0;">
                <p><strong style="color:#16a34a;">الباقة:</strong> ${pkg.name}</p>
                <p><strong style="color:#16a34a;">المبلغ:</strong> ${pkg.price} ر.س</p>
                <p><strong style="color:#16a34a;">الفترة:</strong> حتى ${endDate.toLocaleDateString("ar-SA")}</p>
              </div>
              <p style="color:#666;font-size:12px;text-align:center;">شكراً لثقتك — فريق CoachBase</p>
            </div>`,
          }),
        });
      } catch (e) { console.error("Email error:", e); }
    }

    return new Response(JSON.stringify({ success: true, client_id: newClient.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
