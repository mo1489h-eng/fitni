import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, inquiry_type, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "الحقول المطلوبة ناقصة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "بريد إلكتروني غير صالح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("contact_submissions").insert({
      name: name.slice(0, 200),
      email: email.slice(0, 255),
      inquiry_type: (inquiry_type || "other").slice(0, 50),
      message: message.slice(0, 5000),
    });

    // Send email via Resend if configured
    if (RESEND_API_KEY) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

      if (LOVABLE_API_KEY) {
        await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: "CoachBase <noreply@coachbase.health>",
            to: ["support@coachbase.health"],
            subject: `رسالة جديدة من ${name} — ${inquiry_type || "استفسار عام"}`,
            html: `
              <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#16a34a;">رسالة جديدة من نموذج التواصل</h2>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">الاسم</td><td style="padding:8px;border-bottom:1px solid #eee;">${name}</td></tr>
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">البريد</td><td style="padding:8px;border-bottom:1px solid #eee;">${email}</td></tr>
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">نوع الاستفسار</td><td style="padding:8px;border-bottom:1px solid #eee;">${inquiry_type || "أخرى"}</td></tr>
                  <tr><td style="padding:8px;font-weight:bold;">الرسالة</td><td style="padding:8px;">${message}</td></tr>
                </table>
              </div>
            `,
          }),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return new Response(JSON.stringify({ error: "حدث خطأ في إرسال الرسالة" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
