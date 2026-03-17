import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { payment_id, client_id, package_id, amount, billing_cycle, portal_token } = await req.json();

    if (!payment_id || !client_id || !amount) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify payment with Moyasar
    const moyasarSecret = Deno.env.get("MOYASAR_SECRET_KEY");
    if (!moyasarSecret) {
      return new Response(JSON.stringify({ error: "Payment not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const moyRes = await fetch(`https://api.moyasar.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Basic ${btoa(moyasarSecret + ":")}` },
    });
    if (!moyRes.ok) {
      return new Response(JSON.stringify({ error: "Payment verification failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payment = await moyRes.json();
    if (payment.status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed", status: payment.status }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (payment.amount !== amount * 100) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get client
    const { data: client, error: cErr } = await supabase.from("clients").select("*").eq("id", client_id).maybeSingle();
    if (cErr || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify portal token
    if (portal_token && client.portal_token !== portal_token) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calculate new end date (extend from current end or now, whichever is later)
    const currentEnd = new Date(client.subscription_end_date);
    const base = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(base);
    const cycle = billing_cycle || "monthly";
    if (cycle === "quarterly") newEnd.setMonth(newEnd.getMonth() + 3);
    else if (cycle === "yearly") newEnd.setFullYear(newEnd.getFullYear() + 1);
    else newEnd.setMonth(newEnd.getMonth() + 1);

    // Record payment
    await supabase.from("client_payments").insert({
      client_id,
      trainer_id: client.trainer_id,
      amount,
      moyasar_payment_id: payment_id,
      status: "paid",
      billing_cycle: cycle,
      period_start: base.toISOString().split("T")[0],
      period_end: newEnd.toISOString().split("T")[0],
    });

    // Update client subscription
    await supabase.from("clients").update({
      subscription_end_date: newEnd.toISOString().split("T")[0],
      subscription_price: amount,
      billing_cycle: cycle,
    }).eq("id", client_id);

    // Trainer notification
    if (client.trainer_id) {
      await supabase.from("trainer_notifications").insert({
        trainer_id: client.trainer_id,
        client_id,
        type: "payment",
        title: `💰 ${client.name} جدد اشتراكه`,
        body: `المبلغ: ${amount} ر.س — ساري حتى ${newEnd.toLocaleDateString("ar-SA")}`,
      });
    }

    // Send receipt email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && client.email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "fitni <onboarding@resend.dev>",
            to: [client.email],
            subject: "تم تجديد اشتراكك بنجاح ✅",
            html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#1a1a2e;color:#fff;border-radius:16px;">
              <h1 style="color:#22c55e;text-align:center;">fitni</h1>
              <h2>تم تجديد اشتراكك بنجاح ✅</h2>
              <div style="background:rgba(34,197,94,0.1);border-radius:12px;padding:20px;margin:20px 0;">
                <p><strong style="color:#22c55e;">المبلغ:</strong> ${amount} ر.س</p>
                <p><strong style="color:#22c55e;">ساري حتى:</strong> ${newEnd.toLocaleDateString("ar-SA")}</p>
              </div>
              <p style="color:#666;font-size:12px;text-align:center;">شكراً لثقتك — فريق fitni</p>
            </div>`,
          }),
        });
      } catch (e) { console.error("Email error:", e); }
    }

    return new Response(JSON.stringify({ success: true, period_end: newEnd.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
