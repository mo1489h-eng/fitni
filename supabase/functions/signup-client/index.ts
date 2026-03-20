import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      amount,
    } = await req.json();

    if (!payment_id || !package_id || !trainer_id || !client_name || !client_email || !client_password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Moyasar
    const moyasarSecret = Deno.env.get("MOYASAR_SECRET_KEY");
    if (!moyasarSecret) {
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const moyasarRes = await fetch(`https://api.moyasar.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Basic ${btoa(moyasarSecret + ":")}` },
    });
    if (!moyasarRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to verify payment" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const payment = await moyasarRes.json();
    if (payment.status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check for payment replay — ensure this payment_id hasn't been used before
    const { data: existingPayment } = await supabase
      .from("client_payments")
      .select("id")
      .eq("moyasar_payment_id", payment_id)
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ error: "Payment already processed" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify package exists and belongs to trainer
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

    // Verify amount matches package price
    if (payment.amount !== pkg.price * 100) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: client_email,
      password: client_password,
      email_confirm: true,
    });

    if (authError) {
      // If user already exists, try to get their ID
      if (authError.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ error: "هذا الإيميل مسجل بالفعل. جرب تسجيل الدخول" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw authError;
    }

    const authUserId = authData.user.id;

    // 2. Calculate subscription dates
    const now = new Date();
    const endDate = new Date(now);
    const cycle = pkg.billing_cycle || "monthly";
    if (cycle === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
    else if (cycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    // 3. Create client record
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

    // 4. Record payment
    await supabase.from("client_payments").insert({
      client_id: clientData.id,
      trainer_id: trainer_id,
      amount: pkg.price,
      moyasar_payment_id: payment_id,
      status: "paid",
      billing_cycle: cycle,
      period_start: now.toISOString().split("T")[0],
      period_end: endDate.toISOString().split("T")[0],
    });

    // 5. Notify trainer
    await supabase.from("trainer_notifications").insert({
      trainer_id: trainer_id,
      client_id: clientData.id,
      type: "new_client",
      title: `🎉 عميل جديد! ${client_name} اشترك في ${pkg.name}`,
      body: `المبلغ: ${pkg.price} ر.س — الهدف: ${client_goal || "غير محدد"}`,
    });

    // 6. Send welcome email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      // Get trainer name
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
            from: "fitni <onboarding@resend.dev>",
            to: [client_email],
            subject: `مرحباً ${client_name}! 💪 — اشتراكك جاهز`,
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; color: #fff; border-radius: 16px;">
                <h1 style="color: #22c55e; text-align: center;">fitni</h1>
                <h2 style="text-align: center;">مرحباً ${client_name}! 💪</h2>
                <p style="text-align: center; color: #999;">اشتراكك مع ${trainerProfile?.full_name || "مدربك"} تم بنجاح</p>
                <div style="background: rgba(34,197,94,0.1); border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <p><strong style="color: #22c55e;">الباقة:</strong> ${pkg.name}</p>
                  <p><strong style="color: #22c55e;">الإيميل:</strong> ${client_email}</p>
                  <p><strong style="color: #22c55e;">صالح حتى:</strong> ${endDate.toLocaleDateString("ar-SA")}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://fitni.lovable.app/client-login" style="background: #22c55e; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">ادخل لبوابتك الآن</a>
                </div>
                <p style="color: #666; font-size: 12px; text-align: center;">شكراً لثقتك — فريق fitni</p>
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
