import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { inviteClientAuth } from "../_shared/inviteClientAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Always 200 + JSON so `supabase.functions.invoke` fills `data` (non-2xx often yields only FunctionsHttpError). */
function jsonOk(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("[send-invite-email] Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
      return jsonOk({
        success: false,
        emailSent: false,
        code: "server_error",
        error:
          "ضبط أسرار الدالة: SUPABASE_URL و SUPABASE_ANON_KEY و SUPABASE_SERVICE_ROLE_KEY (مطلوبة تلقائياً في Supabase).",
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonOk({
        success: false,
        emailSent: false,
        code: "unauthorized",
        error: "Unauthorized — no Bearer token",
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !userData?.user) {
      console.error("[send-invite-email] auth.getUser failed:", authError?.message);
      return jsonOk({
        success: false,
        emailSent: false,
        code: "unauthorized",
        error: authError?.message ?? "Invalid or expired session",
      });
    }
    const userId = userData.user.id;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonOk({
        success: false,
        emailSent: false,
        code: "bad_request",
        error: "Invalid JSON body",
      });
    }

    const clientName = body.clientName as string | undefined;
    const clientEmail = body.clientEmail as string | undefined;
    const trainerName = body.trainerName as string | undefined;
    const inviteToken = body.inviteToken as string | undefined;
    const siteOrigin = body.siteOrigin;

    if (!clientEmail || !inviteToken) {
      return jsonOk({
        success: false,
        emailSent: false,
        code: "bad_request",
        error: "Missing required fields (clientEmail, inviteToken)",
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, trainer_id")
      .eq("invite_token", inviteToken)
      .maybeSingle();

    if (clientErr) {
      console.error("[send-invite-email] client lookup:", clientErr);
      return jsonOk({
        success: false,
        emailSent: false,
        code: "server_error",
        error: clientErr.message,
      });
    }

    if (!client || client.trainer_id !== userId) {
      return jsonOk({
        success: false,
        emailSent: false,
        code: "forbidden",
        error:
          "Access denied — رمز الدعوة لا يطابق عميلاً تابعاً لك. جرّب إعادة إرسال الدعوة من ملف العميل.",
      });
    }

    const result = await inviteClientAuth(supabase, {
      clientId: client.id,
      email: clientEmail,
      clientName: clientName ?? "عميل",
      trainerName: trainerName || "مدربك",
      inviteToken,
      siteOrigin: typeof siteOrigin === "string" ? siteOrigin : null,
    });

    if (!result.success) {
      console.error("[send-invite-email] inviteClientAuth failed:", result.error);
      return jsonOk({
        success: false,
        error: result.error,
        message: result.message,
        reason: result.reason,
        setupLink: result.setupLink,
        emailSent: false,
      });
    }

    return jsonOk({
      success: true,
      setupLink: result.setupLink,
      emailSent: result.emailSent ?? false,
      message: result.message,
      skipped: result.skipped,
      reason: result.reason,
      error: result.error,
    });
  } catch (err) {
    console.error("Error:", err);
    return jsonOk({
      success: false,
      emailSent: false,
      code: "server_error",
      error: (err as Error).message,
    });
  }
});
