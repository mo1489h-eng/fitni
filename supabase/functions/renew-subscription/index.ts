import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { creditTrainerWalletFromTap } from "../_shared/walletCredit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { payment_id, client_id, package_id, amount, billing_cycle, portal_token } = await req.json();

    if (!payment_id || !client_id || !amount) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Tap
    const tapSecret = Deno.env.get("TAP_SECRET_KEY");
    if (!tapSecret) {
      return new Response(JSON.stringify({ error: "Payment not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tapRes = await fetch(`https://api.tap.company/v2/charges/${payment_id}`, {
      headers: { Authorization: `Bearer ${tapSecret}` },
    });
    if (!tapRes.ok) {
      return new Response(JSON.stringify({ error: "Payment verification failed" }), {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: client, error: cErr } = await supabase.from("clients").select("*").eq("id", client_id).maybeSingle();
    if (cErr || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (portal_token && client.portal_token !== portal_token) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentEnd = new Date(client.subscription_end_date);
    const base = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(base);
    const cycle = billing_cycle || "monthly";
    if (cycle === "quarterly") newEnd.setMonth(newEnd.getMonth() + 3);
    else if (cycle === "yearly") newEnd.setFullYear(newEnd.getFullYear() + 1);
    else newEnd.setMonth(newEnd.getMonth() + 1);

    await supabase.from("client_payments").insert({
      client_id, trainer_id: client.trainer_id, amount,
      moyasar_payment_id: payment_id, status: "paid", billing_cycle: cycle,
      period_start: base.toISOString().split("T")[0],
      period_end: newEnd.toISOString().split("T")[0],
    });

    await supabase.from("clients").update({
      subscription_end_date: newEnd.toISOString().split("T")[0],
      subscription_price: amount, billing_cycle: cycle,
    }).eq("id", client_id);

    if (client.trainer_id) {
      await supabase.from("trainer_notifications").insert({
        trainer_id: client.trainer_id, client_id,
        type: "payment",
        title: `💰 ${client.name} جدد اشتراكه`,
        body: `المبلغ: ${amount} ر.س — ساري حتى ${newEnd.toLocaleDateString("ar-SA")}`,
      });
    }

    const wallet = await creditTrainerWalletFromTap(supabase, {
      tapChargeId: payment_id,
      trainerId: client.trainer_id,
      amount: Number(amount),
      kind: "subscription",
    });
    if (!wallet.ok) {
      console.error("renew-subscription wallet credit failed:", wallet.error);
      return new Response(JSON.stringify({ error: "Failed to credit trainer wallet" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && client.email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "CoachBase <noreply@coachbase.health>",
            to: [client.email],
            subject: "تم تجديد اشتراكك بنجاح ✅",
            html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#1a1a2e;color:#fff;border-radius:16px;">
              <h1 style="color:#16a34a;text-align:center;">CoachBase</h1>
              <h2>تم تجديد اشتراكك بنجاح ✅</h2>
              <div style="background:rgba(34,197,94,0.1);border-radius:12px;padding:20px;margin:20px 0;">
                <p><strong style="color:#16a34a;">المبلغ:</strong> ${amount} ر.س</p>
                <p><strong style="color:#16a34a;">ساري حتى:</strong> ${newEnd.toLocaleDateString("ar-SA")}</p>
              </div>
              <p style="color:#666;font-size:12px;text-align:center;">شكراً لثقتك — فريق CoachBase</p>
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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
