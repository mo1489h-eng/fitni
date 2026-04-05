import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const from = payload.from || payload.data?.from || "unknown";
    const subject = payload.subject || payload.data?.subject || "بدون موضوع";
    const textBody = payload.text || payload.data?.text || "";
    const htmlBody = payload.html || payload.data?.html || "";
    const to = payload.to || payload.data?.to || "";

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      console.error("Missing RESEND_API_KEY or LOVABLE_API_KEY");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

    const emailHtml = `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#111;color:#ededed;border-radius:12px;">
        <h2 style="color:#22c55e;margin-bottom:16px;">رسالة واردة جديدة</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:10px;border-bottom:1px solid #333;font-weight:bold;color:#888;">من</td><td style="padding:10px;border-bottom:1px solid #333;">${from}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #333;font-weight:bold;color:#888;">إلى</td><td style="padding:10px;border-bottom:1px solid #333;">${to}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #333;font-weight:bold;color:#888;">الموضوع</td><td style="padding:10px;border-bottom:1px solid #333;">${subject}</td></tr>
          <tr><td style="padding:10px;font-weight:bold;color:#888;">المحتوى</td><td style="padding:10px;">${htmlBody || textBody || "لا يوجد محتوى"}</td></tr>
        </table>
      </div>
    `;

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "CoachBase <support@coachbase.health>",
        to: ["coachbase.health@gmail.com"],
        subject: `رسالة جديدة: ${subject}`,
        html: emailHtml,
      }),
    });

    const result = await res.json();
    console.log("Forward result:", JSON.stringify(result));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("receive-email error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
