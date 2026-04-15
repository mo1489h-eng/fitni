import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getResendApiKey, resendFromAddress } from "../_shared/resendConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = getResendApiKey();
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
    const in1 = new Date(today); in1.setDate(in1.getDate() + 1);
    const ago3 = new Date(today); ago3.setDate(ago3.getDate() - 3);

    const fmt = (d: Date) => d.toISOString().split("T")[0];

    // 7 days before expiry
    const { data: expiring7 } = await supabase.from("clients")
      .select("id, name, email, trainer_id, subscription_end_date")
      .eq("subscription_end_date", fmt(in7));

    // 1 day before expiry
    const { data: expiring1 } = await supabase.from("clients")
      .select("id, name, email, trainer_id, subscription_end_date")
      .eq("subscription_end_date", fmt(in1));

    // Expired today
    const { data: expiredToday } = await supabase.from("clients")
      .select("id, name, email, trainer_id, subscription_end_date")
      .eq("subscription_end_date", fmt(today));

    // Expired 3 days ago (no renewal)
    const { data: expired3 } = await supabase.from("clients")
      .select("id, name, trainer_id, subscription_end_date")
      .eq("subscription_end_date", fmt(ago3));

    const sendEmail = async (to: string, subject: string, body: string) => {
      if (!resendKey || !to) return;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: resendFromAddress(),
          to: [to],
          subject,
          html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#1a1a2e;color:#fff;border-radius:16px;">
            <h1 style="color:#16a34a;text-align:center;">CoachBase</h1>
            ${body}
            <p style="color:#666;font-size:12px;text-align:center;margin-top:20px;">فريق CoachBase</p>
          </div>`,
        }),
      });
    };

    // Process 7-day reminders
    for (const c of expiring7 || []) {
      await sendEmail(c.email, "اشتراكك ينتهي قريباً 💪", `
        <h2>اشتراكك ينتهي خلال 7 أيام ⚠️</h2>
        <p>مرحباً ${c.name}،</p>
        <p>جدد الآن واستمر في تحقيق أهدافك!</p>
      `);
    }

    // Process 1-day reminders
    for (const c of expiring1 || []) {
      await sendEmail(c.email, "آخر يوم في اشتراكك! ⚡", `
        <h2>اشتراكك ينتهي غداً! ⚡</h2>
        <p>مرحباً ${c.name}،</p>
        <p>لا تفوت الفرصة — جدد الآن!</p>
      `);
    }

    // Process expiry-day emails
    for (const c of expiredToday || []) {
      await sendEmail(c.email, "انتهى اشتراكك 😔", `
        <h2>انتهى اشتراكك اليوم 😔</h2>
        <p>مرحباً ${c.name}،</p>
        <p>عود الآن واكمل رحلتك مع مدربك!</p>
      `);
    }

    // Notify trainer about non-renewals after 3 days
    for (const c of expired3 || []) {
      if (c.trainer_id) {
        await supabase.from("trainer_notifications").insert({
          trainer_id: c.trainer_id,
          client_id: c.id,
          type: "subscription_expired",
          title: `⚠️ ${c.name} لم يجدد اشتراكه`,
          body: "مضى 3 أيام على انتهاء الاشتراك",
        });
      }
    }

    const total = (expiring7?.length || 0) + (expiring1?.length || 0) + (expiredToday?.length || 0) + (expired3?.length || 0);
    return new Response(JSON.stringify({ success: true, processed: total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
