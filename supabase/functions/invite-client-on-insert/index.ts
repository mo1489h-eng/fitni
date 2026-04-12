/**
 * Database Webhook target: call when `clients` row is inserted (or updated with email).
 * Configure in Supabase Dashboard → Database → Webhooks:
 *   Table: clients, Events: INSERT (and optionally UPDATE)
 *   URL: https://<project-ref>.supabase.co/functions/v1/invite-client-on-insert
 *   HTTP Header: X-Webhook-Secret: <same value as CLIENT_INVITE_WEBHOOK_SECRET>
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { inviteClientAuth } from "../_shared/inviteClientAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-webhook-secret",
};

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get("CLIENT_INVITE_WEBHOOK_SECRET");
  if (!secret) {
    console.error("CLIENT_INVITE_WEBHOOK_SECRET is not set");
    return false;
  }
  const header = req.headers.get("X-Webhook-Secret");
  return header === secret;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const record = body.record ?? body;
    const type = body.type as string | undefined;

    if (type === "DELETE") {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!record?.id) {
      return new Response(JSON.stringify({ error: "Missing record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = (record.email as string | null)?.trim();
    if (!email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (record.auth_user_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "already linked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const result = await inviteClientAuth(supabase, {
      clientId: record.id as string,
      email,
      clientName: (record.name as string) || "عميل",
      trainerName,
      inviteToken: record.invite_token as string | null,
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
