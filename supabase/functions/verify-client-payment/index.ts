import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payment_id, client_id, amount, billing_cycle } = await req.json();

    if (!payment_id || !client_id || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Tap API
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
      return new Response(JSON.stringify({ error: "Payment not completed", status: payment.status }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (Number(payment.amount) !== Number(amount)) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: client, error: clientError } = await supabase
      .from("clients").select("id, trainer_id, name").eq("id", client_id).maybeSingle();

    if (clientError || !client || client.trainer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Client not found or access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const endDate = new Date(now);
    const cycle = billing_cycle || "monthly";
    if (cycle === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
    else if (cycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    await supabase.from("client_payments").insert({
      client_id, trainer_id: user.id, amount,
      moyasar_payment_id: payment_id, status: "paid", billing_cycle: cycle,
      period_start: now.toISOString().split("T")[0],
      period_end: endDate.toISOString().split("T")[0],
    });

    await supabase.from("clients").update({
      subscription_end_date: endDate.toISOString().split("T")[0],
      subscription_price: amount, billing_cycle: cycle,
    }).eq("id", client_id);

    // Send receipt email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const { data: clientFull } = await supabase.from("clients").select("email, name").eq("id", client_id).maybeSingle();
    if (resendKey && clientFull?.email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "CoachBase <noreply@coachbase.health>",
            to: [clientFull.email],
            subject: "إيصال دفع — CoachBase 🧾",
            html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#1a1a2e;color:#fff;border-radius:16px;">
              <h1 style="color:#16a34a;text-align:center;">CoachBase</h1>
              <h2>تم استلام الدفع بنجاح ✅</h2>
              <div style="background:rgba(34,197,94,0.1);border-radius:12px;padding:20px;margin:20px 0;">
                <p><strong style="color:#16a34a;">المبلغ:</strong> ${amount} ر.س</p>
                <p><strong style="color:#16a34a;">الفترة:</strong> حتى ${endDate.toLocaleDateString("ar-SA")}</p>
              </div>
              <p style="color:#666;font-size:12px;text-align:center;">شكراً لثقتك — فريق CoachBase</p>
            </div>`,
          }),
        });
      } catch (e) { console.error("Email error:", e); }
    }

    return new Response(
      JSON.stringify({ success: true, period_end: endDate.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
