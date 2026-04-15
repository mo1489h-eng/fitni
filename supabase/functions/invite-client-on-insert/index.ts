/// <reference types="deno" />
/**
 * Database Webhook target: call when `clients` row is inserted (or updated with email).
 * Configure in Supabase Dashboard → Database → Webhooks:
 *   Table: clients, Events: INSERT (and optionally UPDATE)
 *   URL: https://<project-ref>.supabase.co/functions/v1/invite-client-on-insert
 *   HTTP Header: X-Webhook-Secret: <same value as CLIENT_INVITE_WEBHOOK_SECRET>
 *
 * Returns HTTP 200 for all handled outcomes so Supabase does not retry on Resend/business failures
 * (5xx would trigger webhook retries and duplicate attempts).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { inviteClientAuth } from "../_shared/inviteClientAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-webhook-secret",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get("CLIENT_INVITE_WEBHOOK_SECRET");
  if (!secret) {
    console.error("CLIENT_INVITE_WEBHOOK_SECRET is not set");
    return false;
  }
  const header = req.headers.get("X-Webhook-Secret");
  return header === secret;
}

/** Supabase webhook payloads: `record` at top level or under `payload`. */
function extractRecord(body: Record<string, unknown>): Record<string, unknown> | null {
  const direct = body.record as Record<string, unknown> | undefined;
  if (direct && typeof direct === "object") return direct;
  const payload = body.payload as { record?: Record<string, unknown> } | undefined;
  if (payload?.record && typeof payload.record === "object") return payload.record;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!isAuthorized(req)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const type = body.type as string | undefined;

    if (type === "DELETE") {
      return json({ skipped: true, reason: "delete_event" });
    }

    const record = extractRecord(body);
    if (!record?.id) {
      return json({ error: "Missing record" }, 400);
    }

    const email = (record.email as string | null)?.trim();
    if (!email) {
      return json({ skipped: true, reason: "no email" });
    }

    if (record.auth_user_id) {
      return json({ skipped: true, reason: "already linked" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[invite-client-on-insert] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return json({
        success: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on the function",
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let trainerName = "مدربك";
    if (record.trainer_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", record.trainer_id)
        .maybeSingle();
      if (profile?.full_name) trainerName = profile.full_name;
    }

    const publicOrigin = Deno.env.get("PUBLIC_APP_URL")?.trim() || null;

    const result = await inviteClientAuth(supabase, {
      clientId: record.id as string,
      email,
      clientName: (record.name as string) || "عميل",
      trainerName,
      inviteToken: record.invite_token as string | null,
      siteOrigin: publicOrigin,
    });

    // Always 200: include result; do not use 5xx for Resend failures (webhook retries).
    return json({ ...result } as Record<string, unknown>);
  } catch (err) {
    console.error("[invite-client-on-insert]", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
