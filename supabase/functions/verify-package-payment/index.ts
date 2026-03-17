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
    const { payment_id, package_id, client_name, client_phone, client_email } = await req.json();

    // trainer_id is NOT accepted from the request body — derived from package
    if (!payment_id || !package_id || !client_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Moyasar
    const moyasarSecret = Deno.env.get("MOYASAR_SECRET_KEY");
    if (!moyasarSecret) {
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const moyasarRes = await fetch(`https://api.moyasar.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Basic ${btoa(moyasarSecret + ":")}` },
    });

    if (!moyasarRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to verify payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await moyasarRes.json();

    if (payment.status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get package details — trainer_id is derived from here, NOT from request
    const { data: pkg, error: pkgError } = await supabase
      .from("trainer_packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .maybeSingle();

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Securely derive trainer_id from the package record
    const trainer_id = pkg.trainer_id;

    // Verify amount matches (Moyasar uses halalah = price * 100)
    if (payment.amount !== pkg.price * 100) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent duplicate processing — check if this payment_id was already recorded
    const { data: existingPayment } = await supabase
      .from("client_payments")
      .select("id")
      .eq("moyasar_payment_id", payment_id)
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ error: "Payment already processed" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const endDate = new Date(now);
    if (pkg.billing_cycle === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
    else if (pkg.billing_cycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    // Create client automatically
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        trainer_id,
        name: client_name,
        phone: client_phone || "",
        email: client_email || null,
        subscription_price: pkg.price,
        subscription_end_date: endDate.toISOString().split("T")[0],
        billing_cycle: pkg.billing_cycle,
        goal: pkg.name,
      })
      .select("id")
      .single();

    if (clientError) {
      console.error("Client creation error:", clientError);
      return new Response(JSON.stringify({ error: "Failed to create client" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record payment
    await supabase.from("client_payments").insert({
      client_id: newClient.id,
      trainer_id,
      amount: pkg.price,
      moyasar_payment_id: payment_id,
      status: "paid",
      billing_cycle: pkg.billing_cycle,
      period_start: now.toISOString().split("T")[0],
      period_end: endDate.toISOString().split("T")[0],
    });

    // Notify trainer
    await supabase.from("trainer_notifications").insert({
      trainer_id,
      client_id: newClient.id,
      type: "payment",
      title: `💰 ${client_name} دفع ${pkg.price} ريال - ${pkg.name}`,
      body: `تم إضافة ${client_name} تلقائياً كعميل جديد`,
    });

    // Send receipt email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && client_email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "fitni <onboarding@resend.dev>",
            to: [client_email],
            subject: "إيصال دفع — fitni 🧾",
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; color: #fff; border-radius: 16px;">
                <h1 style="color: #22c55e; text-align: center;">fitni</h1>
                <h2>تم استلام الدفع بنجاح ✅</h2>
                <div style="background: rgba(34,197,94,0.1); border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <p><strong style="color: #22c55e;">الباقة:</strong> ${pkg.name}</p>
                  <p><strong style="color: #22c55e;">المبلغ:</strong> ${pkg.price} ر.س</p>
                  <p><strong style="color: #22c55e;">الفترة:</strong> حتى ${endDate.toLocaleDateString("ar-SA")}</p>
                </div>
                <p style="color: #666; font-size: 12px; text-align: center;">شكراً لثقتك — فريق fitni</p>
              </div>
            `,
          }),
        });
      } catch (e) { console.error("Email error:", e); }
    }

    return new Response(
      JSON.stringify({ success: true, client_id: newClient.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
