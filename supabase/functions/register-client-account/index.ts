/**
 * Creates or reuses an auth user, sets the password from the registration form via admin API,
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

/** Find auth user id by email (pagination). */
async function findUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  const maxPages = 50;
  while (page <= maxPages) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[register-client-account] listUsers:", error.message);
      return null;
    }
    const users = data?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (users.length < perPage) return null;
    page += 1;
  }
  return null;
}

/** Apply the exact password from the form so signInWithPassword works immediately. */
async function setUserPasswordAndMetadata(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  password: string,
  name: string
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: { full_name: name, is_client: true },
  });
  return { error };
}

async function linkClientRow(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  userId: string,
  phone: string | undefined
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase
    .from("clients")
    .update({
      auth_user_id: userId,
      invite_token: null,
      ...(phone ? { phone } : {}),
    })
    .eq("id", clientId)
    .is("auth_user_id", null);

  return { error };
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, email, invite_token, auth_user_id")
      .eq("invite_token", invite_token)
      .maybeSingle();

    if (clientErr || !client) {
      console.error("[register-client-account] client lookup:", clientErr?.message);
      return new Response(
        JSON.stringify({ success: false, code: "INVALID_INVITE", message: "Invalid invite token" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (client.auth_user_id) {
      return new Response(
        JSON.stringify({ success: false, code: "ALREADY_LINKED", message: "Account already linked" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (client.email && client.email.trim().toLowerCase() !== email) {
      return new Response(
        JSON.stringify({ success: false, code: "EMAIL_MISMATCH", message: "Email must match the invited email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string | null = null;

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, is_client: true },
    });

    if (createErr) {
      if (!isDuplicateUserError(createErr)) {
        console.error("[register-client-account] createUser:", createErr);
        return new Response(
          JSON.stringify({ success: false, code: "AUTH_CREATE_FAILED", message: createErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const existingId = await findUserIdByEmail(supabase, email);
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
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, code: "NO_USER_ID", message: "Auth did not return user id" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const pwdRes = await setUserPasswordAndMetadata(supabase, userId, password, name);
    if (pwdRes.error) {
      console.error("[register-client-account] updateUserById (password):", pwdRes.error);
      return new Response(
        JSON.stringify({
          success: false,
          code: "PASSWORD_SET_FAILED",
          message: pwdRes.error.message ?? "Could not set password",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: otherClient } = await supabase
      .from("clients")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (otherClient && otherClient.id !== client.id) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "AUTH_LINKED_ELSEWHERE",
          message: "هذا البريد مرتبط بحساب عميل آخر. سجّل الدخول أو استخدم بريداً آخر.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const linkRes = await linkClientRow(supabase, client.id, userId, phone);
    if (linkRes.error) {
      console.error("[register-client-account] link client:", linkRes.error);
      return new Response(
        JSON.stringify({ success: false, code: "LINK_FAILED", message: linkRes.error.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[register-client-account]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
