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

/** Compare UUIDs from DB vs JWT (string-normalized). */
function sameId(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
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
    const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim() : "";
    const trainerName = body.trainerName as string | undefined;
    const inviteTokenBody = typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";
    const clientIdBody = typeof body.clientId === "string" ? body.clientId.trim() : "";
    const siteOrigin = body.siteOrigin;

    if (!clientEmail) {
      return jsonOk({
        success: false,
        emailSent: false,
        code: "bad_request",
        error: "Missing clientEmail",
      });
    }

    if (!clientIdBody && !inviteTokenBody) {
      return jsonOk({
        success: false,
        emailSent: false,
        code: "bad_request",
        error: "Missing clientId or inviteToken",
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let client: { id: string; trainer_id: string | null; invite_token: string | null } | null = null;

    if (clientIdBody) {
      const { data: row, error: rowErr } = await supabase
        .from("clients")
        .select("id, trainer_id, invite_token")
        .eq("id", clientIdBody)
        .maybeSingle();

      if (rowErr) {
        console.error("[send-invite-email] client by id:", rowErr);
        return jsonOk({
          success: false,
          emailSent: false,
          code: "server_error",
          error: rowErr.message,
        });
      }
      client = row;
    } else {
      const { data: row, error: rowErr } = await supabase
        .from("clients")
        .select("id, trainer_id, invite_token")
        .eq("invite_token", inviteTokenBody)
        .maybeSingle();

      if (rowErr) {
        console.error("[send-invite-email] client by token:", rowErr);
        return jsonOk({
          success: false,
          emailSent: false,
          code: "server_error",
          error: rowErr.message,
        });
      }
      client = row;
    }

    if (!client || !sameId(client.trainer_id, userId)) {
      return jsonOk({
        success: false,
        emailSent: false,
        code: "forbidden",
        error:
          "Access denied — العميل غير مرتبط بحسابك كمدرب. تأكد من نشر آخر نسخة من الدالة وأن clientId صحيح.",
      });
    }

    const tokenForEmail = client.invite_token?.trim() || inviteTokenBody || "";

    const result = await inviteClientAuth(supabase, {
      clientId: client.id,
      email: clientEmail,
      clientName: clientName ?? "عميل",
      trainerName: trainerName || "مدربك",
      inviteToken: tokenForEmail,
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
      resendId: result.resendId,
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
const { data, error } = await resend.emails.send({
  // التعديل هنا: استخدم أي اسم قبل @coachbase.health
  from: "CoachBase <noreply@coachbase.health>", 
  to: [email],
  subject: "دعوة للانضمام إلى CoachBase",
  html: `<h1>مرحباً بك في CoachBase</h1>...`,
});