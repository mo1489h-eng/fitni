/**
 * Creates or reuses an auth user, sets the password from the registration form via admin API,
 * then links clients.auth_user_id. Called from /client-register with a valid invite_token.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the Edge Function environment (Dashboard → Edge Functions → Secrets).
 * Admin auth APIs do not work with the anon key.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function maskSecret(value: string | undefined): string {
  if (!value || value.length < 12) return value ? "[too_short]" : "[missing]";
  return `${value.slice(0, 8)}…${value.slice(-4)} (len=${value.length})`;
}

/** Decode JWT payload `role` without verifying signature (logging only). */
function jwtRoleFromKey(key: string | undefined): string | null {
  if (!key) return null;
  try {
    const parts = key.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function logAuthError(context: string, err: unknown): void {
  const e = err as {
    message?: string;
    status?: number;
    name?: string;
    code?: string;
  };
  try {
    if (err !== null && typeof err === "object") {
      console.error(
        `[register-client-account] ${context} — full error object:`,
        JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2)
      );
    } else {
      console.error(`[register-client-account] ${context} —`, err);
    }
  } catch {
    console.error(`[register-client-account] ${context} — (stringify failed)`, String(err));
  }
  console.error(`[register-client-account] ${context} — fields:`, {
    message: e?.message,
    status: e?.status,
    name: e?.name,
    code: e?.code,
  });
}

function isDuplicateUserError(err: { message?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return m.includes("already") || m.includes("registered") || m.includes("exists") || m.includes("duplicate");
}

/** Find auth user id by email (pagination). */
async function findUserIdByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  console.log("[register-client-account] findUserIdByEmail: start, email=", email);
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  const maxPages = 50;
  while (page <= maxPages) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      logAuthError(`listUsers page ${page}`, error);
      return null;
    }
    const users = data?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === target);
    if (hit?.id) {
      console.log("[register-client-account] findUserIdByEmail: found user id=", hit.id);
      return hit.id;
    }
    if (users.length < perPage) return null;
    page += 1;
  }
  return null;
}

/** Apply the exact password from the form so signInWithPassword works immediately. */
async function setUserPasswordAndMetadata(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  password: string,
  name: string
): Promise<{ error: { message: string } | null }> {
  console.log("[register-client-account] setUserPasswordAndMetadata: userId=", userId);
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: { full_name: name, is_client: true },
  });
  if (error) logAuthError("updateUserById", error);
  return { error };
}

async function linkClientRow(
  supabaseAdmin: ReturnType<typeof createClient>,
  clientId: string,
  userId: string,
  phone: string | undefined
): Promise<{ error: { message: string } | null }> {
  console.log("[register-client-account] linkClientRow: clientId=", clientId, "userId=", userId);
  const { error } = await supabaseAdmin
    .from("clients")
    .update({
      auth_user_id: userId,
      invite_token: null,
      ...(phone ? { phone } : {}),
    })
    .eq("id", clientId)
    .is("auth_user_id", null);

  if (error) console.error("[register-client-account] linkClientRow DB error:", error);
  return { error };
}

serve(async (req) => {
  console.log("[register-client-account] === invoked ===", { method: req.method, url: req.url });

  if (req.method === "OPTIONS") {
    console.log("[register-client-account] OPTIONS preflight, returning CORS");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[register-client-account] parsing JSON body");
    const body = await req.json();
    const invite_token = body.invite_token as string | undefined;
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    const password = body.password as string | undefined;
    const name = (body.name as string | undefined)?.trim() ?? "";
    const phone = (body.phone as string | undefined)?.trim();

    console.log("[register-client-account] body (no password):", {
      invite_token: invite_token ? `${invite_token.slice(0, 6)}…` : undefined,
      email,
      name,
      phone,
      passwordLen: password?.length ?? 0,
    });

    if (!invite_token || !email || !password) {
      console.warn("[register-client-account] validation: MISSING_FIELDS");
      return new Response(
        JSON.stringify({ success: false, code: "MISSING_FIELDS", message: "Missing invite_token, email, or password" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      console.warn("[register-client-account] validation: WEAK_PASSWORD");
      return new Response(
        JSON.stringify({ success: false, code: "WEAK_PASSWORD", message: "Password must be at least 6 characters" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("[register-client-account] env:", {
      SUPABASE_URL: supabaseUrl ?? "[missing]",
      SUPABASE_SERVICE_ROLE_KEY: maskSecret(serviceRoleKey),
      jwtRoleFromServiceKey: jwtRoleFromKey(serviceRoleKey),
    });

    if (!supabaseUrl?.trim()) {
      console.error("[register-client-account] FATAL: SUPABASE_URL is missing");
      return new Response(
        JSON.stringify({ success: false, code: "SERVER_CONFIG", message: "Server misconfigured: SUPABASE_URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!serviceRoleKey?.trim()) {
      console.error("[register-client-account] FATAL: SUPABASE_SERVICE_ROLE_KEY is missing — admin auth APIs will not work");
      return new Response(
        JSON.stringify({
          success: false,
          code: "SERVER_CONFIG",
          message: "Server misconfigured: set SUPABASE_SERVICE_ROLE_KEY for this Edge Function",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const role = jwtRoleFromKey(serviceRoleKey);
    if (role && role !== "service_role") {
      console.error(
        "[register-client-account] FATAL: SUPABASE_SERVICE_ROLE_KEY JWT role is",
        role,
        "— expected service_role. Do not use the anon key for admin operations."
      );
      return new Response(
        JSON.stringify({
          success: false,
          code: "SERVER_CONFIG",
          message: "Invalid server key: SUPABASE_SERVICE_ROLE_KEY must be the service_role key, not anon",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!role) {
      console.warn("[register-client-account] could not decode JWT role from key; proceeding if createUser succeeds");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log("[register-client-account] supabaseAdmin client created with service role (persistSession: false)");

    console.log("[register-client-account] looking up client by invite_token");
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("id, email, invite_token, auth_user_id")
      .eq("invite_token", invite_token)
      .maybeSingle();

    if (clientErr || !client) {
      console.error("[register-client-account] client lookup failed:", clientErr?.message, "client=", client);
      return new Response(
        JSON.stringify({ success: false, code: "INVALID_INVITE", message: "Invalid invite token" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[register-client-account] client row:", { id: client.id, hasEmail: !!client.email, auth_user_id: client.auth_user_id });

    if (client.auth_user_id) {
      console.warn("[register-client-account] ALREADY_LINKED");
      return new Response(
        JSON.stringify({ success: false, code: "ALREADY_LINKED", message: "Account already linked" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (client.email && client.email.trim().toLowerCase() !== email) {
      console.warn("[register-client-account] EMAIL_MISMATCH");
      return new Response(
        JSON.stringify({ success: false, code: "EMAIL_MISMATCH", message: "Email must match the invited email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string | null = null;

    console.log("[register-client-account] calling auth.admin.createUser for email=", email);
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, is_client: true },
    });

    if (createErr) {
      logAuthError("auth.admin.createUser", createErr);
      if (!isDuplicateUserError(createErr)) {
        return new Response(
          JSON.stringify({ success: false, code: "AUTH_CREATE_FAILED", message: createErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[register-client-account] duplicate user path — resolving existing user id");
      const existingId = await findUserIdByEmail(supabaseAdmin, email);
      if (!existingId) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "USER_EXISTS",
            message: createErr.message ?? "User already registered",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = existingId;
    } else {
      userId = created.user?.id ?? null;
      console.log("[register-client-account] createUser success:", { userId, userEmail: created.user?.email });
      if (!userId) {
        console.error("[register-client-account] createUser returned no user id; data=", JSON.stringify(created));
        return new Response(
          JSON.stringify({ success: false, code: "NO_USER_ID", message: "Auth did not return user id" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const pwdRes = await setUserPasswordAndMetadata(supabaseAdmin, userId, password, name);
    if (pwdRes.error) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "PASSWORD_SET_FAILED",
          message: pwdRes.error.message ?? "Could not set password",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[register-client-account] password/metadata set OK");

    console.log("[register-client-account] checking if auth_user_id linked elsewhere");
    const { data: otherClient } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (otherClient && otherClient.id !== client.id) {
      console.warn("[register-client-account] AUTH_LINKED_ELSEWHERE");
      return new Response(
        JSON.stringify({
          success: false,
          code: "AUTH_LINKED_ELSEWHERE",
          message: "هذا البريد مرتبط بحساب عميل آخر. سجّل الدخول أو استخدم بريداً آخر.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const linkRes = await linkClientRow(supabaseAdmin, client.id, userId, phone);
    if (linkRes.error) {
      return new Response(
        JSON.stringify({ success: false, code: "LINK_FAILED", message: linkRes.error.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[register-client-account] === success === userId=", userId);
    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[register-client-account] unhandled exception:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
