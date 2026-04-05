import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyWebhookSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const computedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Resend sends signature in various formats, try direct comparison
    const cleanSig = signature.replace(/^(v1,|sha256=)/, '');
    return computedSig === cleanSig || signature === computedSig;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      console.error("Missing RESEND_API_KEY or LOVABLE_API_KEY");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();

    // Verify webhook signature if secret is configured
    if (RESEND_WEBHOOK_SECRET) {
      const svixId = req.headers.get("svix-id");
      const svixTimestamp = req.headers.get("svix-timestamp");
      const svixSignature = req.headers.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Missing Svix headers");
        return new Response(JSON.stringify({ error: "Missing signature headers" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resend uses Svix: sign(msg_id + "." + timestamp + "." + body)
      const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
      const encoder = new TextEncoder();
      
      // Svix secret is base64-encoded after "whsec_" prefix
      const secretBytes = Uint8Array.from(atob(RESEND_WEBHOOK_SECRET.replace(/^whsec_/, '')), c => c.charCodeAt(0));
      
      const key = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));
      const computedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));

      // svix-signature can have multiple sigs: "v1,base64sig1 v1,base64sig2"
      const expectedSigs = svixSignature.split(" ").map(s => s.replace(/^v1,/, ''));
      const isValid = expectedSigs.some(s => s === computedSig);

      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check timestamp tolerance (5 minutes)
      const ts = parseInt(svixTimestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > 300) {
        console.error("Webhook timestamp too old");
        return new Response(JSON.stringify({ error: "Timestamp expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log("Webhook event type:", payload.type);

    // Extract email data from Resend webhook payload
    const data = payload.data || payload;
    const from = data.from || data.sender || "unknown";
    const subject = data.subject || "بدون موضوع";
    const textBody = data.text || "";
    const htmlBody = data.html || "";
    const to = Array.isArray(data.to) ? data.to.join(", ") : (data.to || "");

    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

    const emailHtml = `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#111;color:#ededed;border-radius:12px;">
        <h2 style="color:#22c55e;margin-bottom:16px;">📬 رسالة واردة جديدة</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:10px;border-bottom:1px solid #333;font-weight:bold;color:#888;">من</td><td style="padding:10px;border-bottom:1px solid #333;">${from}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #333;font-weight:bold;color:#888;">إلى</td><td style="padding:10px;border-bottom:1px solid #333;">${to}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #333;font-weight:bold;color:#888;">الموضوع</td><td style="padding:10px;border-bottom:1px solid #333;">${subject}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #333;font-weight:bold;color:#888;">نوع الحدث</td><td style="padding:10px;border-bottom:1px solid #333;">${payload.type || "N/A"}</td></tr>
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
