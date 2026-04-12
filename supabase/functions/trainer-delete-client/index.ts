/**
 * Deletes a client row (cascade) and removes their Supabase Auth user when present.
 * Only the owning trainer may delete.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "غير مصرّح" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "غير مصرّح" }, 401);

    const body = (await req.json()) as { client_id?: string };
    const clientId = body.client_id?.trim();
    if (!clientId) return json({ error: "client_id مطلوب" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: client, error: fetchErr } = await admin
      .from("clients")
      .select("id, auth_user_id, trainer_id")
      .eq("id", clientId)
      .maybeSingle();

    if (fetchErr) {
      console.error("[trainer-delete-client] fetch:", fetchErr);
      return json({ error: fetchErr.message }, 500);
    }
    if (!client) return json({ error: "العميل غير موجود" }, 404);

    if (client.trainer_id !== user.id) {
      return json({ error: "غير مصرح بحذف هذا العميل" }, 403);
    }

    const authUid = client.auth_user_id as string | null;

    const { error: delErr } = await admin.from("clients").delete().eq("id", clientId).eq("trainer_id", user.id);
    if (delErr) {
      console.error("[trainer-delete-client] delete client:", delErr);
      return json({ error: delErr.message }, 500);
    }

    if (authUid) {
      const { error: authDelErr } = await admin.auth.admin.deleteUser(authUid);
      if (authDelErr) {
        console.error("[trainer-delete-client] deleteUser:", authDelErr);
      }
    }

    return json({ success: true });
  } catch (e) {
    console.error("[trainer-delete-client]", e);
    return json({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }, 500);
  }
});
