import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_TRIAL_DAYS = 183;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: trainers } = await supabase
      .from("profiles")
      .select("user_id, full_name, created_at, subscription_plan")
      .or("subscription_plan.is.null,subscription_plan.eq.free");

    if (!trainers || trainers.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendEmail = async (to: string, subject: string, body: string) => {
      if (!resendKey || !to) return;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "CoachBase <noreply@coachbase.health>",
          to: [to],
          subject,
          html: `<div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#1a1a2e;color:#fff;border-radius:16px;">
            <h1 style="color:#16a34a;text-align:center;font-size:28px;margin-bottom:24px;">CoachBase</h1>
            ${body}
            <div style="text-align:center;margin-top:24px;">
              <a href="https://coachbase.health/subscription" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">اشترك الآن</a>
            </div>
            <p style="color:#666;font-size:12px;text-align:center;margin-top:20px;">فريق CoachBase</p>
          </div>`,
        }),
      });
    };

    // Get trainer emails from auth
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    authUsers?.users?.forEach((u: any) => {
      if (u.email) emailMap.set(u.id, u.email);
    });

    let processed = 0;

    for (const t of trainers) {
      const createdAt = new Date(t.created_at);
      const trialEndDate = new Date(createdAt.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const daysUntilExpiry = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const daysAfterExpiry = -daysUntilExpiry;
      const email = emailMap.get(t.user_id);
      const name = t.full_name || "مدرب";

      if (!email) continue;

      if (daysUntilExpiry === 30) {
        await sendEmail(email, "فترتك المجانية تنتهي خلال شهر", `
          <h2 style="color:#fff;font-size:18px;">مرحبا ${name}،</h2>
          <p style="color:#ccc;line-height:1.8;">فترتك المجانية تنتهي خلال 30 يوما.</p>
          <p style="color:#ccc;line-height:1.8;">اشترك الآن واستمر بنفس السعر - سعرك لن يتغير طالما اشتراكك مستمر.</p>
        `);
        processed++;
      } else if (daysUntilExpiry === 7) {
        await sendEmail(email, "تبقى 7 أيام في فترتك المجانية", `
          <h2 style="color:#fff;font-size:18px;">مرحبا ${name}،</h2>
          <p style="color:#ccc;line-height:1.8;">تبقى 7 أيام فقط في فترتك المجانية.</p>
          <p style="color:#ccc;line-height:1.8;">لا تفقد وصولك لعملائك وبياناتك.</p>
        `);
        processed++;
      } else if (daysUntilExpiry === 1) {
        await sendEmail(email, "آخر يوم في فترتك المجانية", `
          <h2 style="color:#fff;font-size:18px;">مرحبا ${name}،</h2>
          <p style="color:#ccc;line-height:1.8;">هذا آخر يوم في فترتك المجانية.</p>
          <p style="color:#ccc;line-height:1.8;">اشترك اليوم لتبقى متصلا بعملائك.</p>
        `);
        processed++;
      } else if (daysUntilExpiry === 0) {
        await sendEmail(email, "انتهت فترتك المجانية اليوم", `
          <h2 style="color:#fff;font-size:18px;">مرحبا ${name}،</h2>
          <p style="color:#ccc;line-height:1.8;">انتهت فترتك المجانية اليوم.</p>
          <p style="color:#ccc;line-height:1.8;">اختر باقتك للاستمرار في إدارة عملائك.</p>
        `);
        processed++;
      } else if (daysAfterExpiry === 30) {
        await sendEmail(email, "بياناتك ستحذف خلال 30 يوم", `
          <h2 style="color:#fff;font-size:18px;">مرحبا ${name}،</h2>
          <p style="color:#ccc;line-height:1.8;">مضى شهر على انتهاء فترتك المجانية.</p>
          <p style="color:#e74c3c;line-height:1.8;font-weight:bold;">بياناتك وبيانات عملائك ستحذف خلال 30 يوما إذا لم تشترك.</p>
          <p style="color:#ccc;line-height:1.8;">اشترك الآن لحفظ كل شيء.</p>
        `);
        processed++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
