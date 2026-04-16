/**
 * Creates or reuses an auth user with the EXACT password from the registration form,
 * then links clients.auth_user_id. Called from /client-register with a valid invite_token.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isDuplicateUserError(err: { message?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return m.includes("already") || m.includes("registered") || m.includes("exists") || m.includes("duplicate");
}

/** Prefer DB RPC (migration `get_auth_user_id_by_email`); fallback to listUsers if RPC missing. */
async function findUserIdByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const { data: rpcId, error: rpcErr } = await supabaseAdmin.rpc("get_auth_user_id_by_email", {
    p_email: email,
  });
  if (!rpcErr && rpcId) return rpcId as string;
  if (rpcErr) console.warn("[register-client-account] get_auth_user_id_by_email:", rpcErr.message);

  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = data?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (users.length < perPage) return null;
    page += 1;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const invite_token = body.invite_token as string | undefined;
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    const password = body.password as string | undefined;
    const name = (body.name as string | undefined)?.trim() ?? "";
    const phone = (body.phone as string | undefined)?.trim();

    if (!invite_token || !email || !password) {
      return new Response(
        JSON.stringify({ success: false, code: "MISSING_FIELDS", message: "Missing invite_token, email, or password" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, code: "WEAK_PASSWORD", message: "Password must be at least 6 characters" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, code: "SERVER_CONFIG", message: "Server misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up client by invite_token
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("id, email, invite_token, auth_user_id, created_at")
      .eq("invite_token", invite_token)
      .maybeSingle();

    if (clientErr || !client) {
      return new Response(
        JSON.stringify({ success: false, code: "INVALID_INVITE", message: "رابط الدعوة غير صالح أو منتهي الصلاحية" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check 7-day expiry based on created_at of the token
    const tokenAge = Date.now() - new Date(client.created_at).getTime();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    if (tokenAge > SEVEN_DAYS) {
      return new Response(
        JSON.stringify({ success: false, code: "TOKEN_EXPIRED", message: "انتهت صلاحية الرابط، تواصل مع مدربك" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (client.auth_user_id) {
      return new Response(
        JSON.stringify({ success: false, code: "ALREADY_LINKED", message: "هذا الحساب مربوط مسبقاً. سجّل دخولك." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (client.email && client.email.trim().toLowerCase() !== email) {
      return new Response(
        JSON.stringify({ success: false, code: "EMAIL_MISMATCH", message: "البريد الإلكتروني لا يتطابق مع الدعوة" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string | null = null;

    // Try to create user with exact password
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, is_client: true, role: "trainee", source: "invite" },
      app_metadata: { fitni_signup: "invite" },
    });

    if (createErr) {
      if (!isDuplicateUserError(createErr)) {
        console.error("createUser failed:", createErr.message);
        return new Response(
          JSON.stringify({ success: false, code: "AUTH_CREATE_FAILED", message: createErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // User already exists — update their password
      const existingId = await findUserIdByEmail(supabaseAdmin, email);
      if (!existingId) {
        return new Response(
          JSON.stringify({ success: false, code: "USER_EXISTS", message: "هذا البريد مسجل مسبقاً" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = existingId;

      const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(userId);
      const prevApp = (existingAuth?.user?.app_metadata ?? {}) as Record<string, unknown>;
      const prevUserMeta = (existingAuth?.user?.user_metadata ?? {}) as Record<string, unknown>;

      // Update password so signInWithPassword works with the form password
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          ...prevUserMeta,
          full_name: name,
          is_client: true,
          role: "trainee",
          source: "invite",
        },
        app_metadata: { ...prevApp, fitni_signup: "invite" },
      });
      if (updateErr) {
        console.error("updateUserById failed:", updateErr.message);
        return new Response(
          JSON.stringify({ success: false, code: "PASSWORD_SET_FAILED", message: updateErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      userId = created.user?.id ?? null;
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, code: "NO_USER_ID", message: "Auth did not return user id" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { error: confirmErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmErr) console.warn("[register-client-account] email_confirm patch:", confirmErr.message);
    }

    // Check if auth_user_id is linked to another client
    const { data: otherClient } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (otherClient && otherClient.id !== client.id) {
      return new Response(
        JSON.stringify({ success: false, code: "AUTH_LINKED_ELSEWHERE", message: "هذا البريد مرتبط بحساب عميل آخر." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabaseAdmin
      .from("profiles")
      .update({ source: "invite", role: "trainee" })
      .eq("user_id", userId);

    // Link client row
    const { error: linkErr } = await supabaseAdmin
      .from("clients")
      .update({
        auth_user_id: userId,
        invite_token: null,
        payment_pending: true,
        ...(phone ? { phone } : {}),
      })
      .eq("id", client.id);

    if (linkErr) {
      console.error("linkClientRow error:", linkErr);
      return new Response(
        JSON.stringify({ success: false, code: "LINK_FAILED", message: linkErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[register-client-account] success userId=", userId);
    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[register-client-account] unhandled:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
