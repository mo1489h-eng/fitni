import { getResendApiKey, resendFromSupportAddress } from "../_shared/resendConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret =
      Deno.env.get("RESEND_WEBHOOK_SECRET")?.trim() || Deno.env.get("WEBHOOK_SIGNING_SECRET")?.trim() || "";
    const RESEND_API_KEY = getResendApiKey();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("[receive-email] Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();

    if (webhookSecret) {
      const svixId = req.headers.get("svix-id");
      const svixTimestamp = req.headers.get("svix-timestamp");
      const svixSignature = req.headers.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("[receive-email] Missing Svix headers");
        return new Response(JSON.stringify({ error: "Missing signature headers" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
      const encoder = new TextEncoder();

      const secretRaw = webhookSecret.replace(/^whsec_/, "");
      const secretBytes = Uint8Array.from(atob(secretRaw), (c) => c.charCodeAt(0));

      const key = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));
      const bytes = new Uint8Array(sig);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const computedSig = btoa(binary);

      const expectedSigs = svixSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
      const isValid = expectedSigs.some((s) => s === computedSig);

      if (!isValid) {
        console.error("[receive-email] Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ts = parseInt(svixTimestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > 300) {
        console.error("[receive-email] Webhook timestamp too old");
        return new Response(JSON.stringify({ error: "Timestamp expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("[receive-email] RESEND_WEBHOOK_SECRET not set — signature not verified");
    }

    const payload = JSON.parse(rawBody);
    console.log("[receive-email] Webhook event type:", payload.type);

    const data = payload.data || payload;
    const from = data.from || data.sender || "unknown";
    const subject = data.subject || "بدون موضوع";
    const textBody = data.text || "";
    const htmlBody = data.html || "";
    const to = Array.isArray(data.to) ? data.to.join(", ") : (data.to || "");

    if (!LOVABLE_API_KEY) {
      console.warn("[receive-email] LOVABLE_API_KEY not set — ack webhook without forwarding");
      return new Response(
        JSON.stringify({ success: true, forwarded: false, reason: "lovable_gateway_not_configured" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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
        from: resendFromSupportAddress(),
        to: ["coachbase.health@gmail.com"],
        subject: `رسالة جديدة: ${subject}`,
        html: emailHtml,
      }),
    });

    const result = await res.json();
    console.log("[receive-email] Forward result:", JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, forwarded: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[receive-email] error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
