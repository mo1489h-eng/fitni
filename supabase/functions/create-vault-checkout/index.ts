import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function publicOrigin(bodyOrigin: unknown): string {
  const trimmed = typeof bodyOrigin === "string" ? bodyOrigin.trim().replace(/\/$/, "") : "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return (Deno.env.get("PUBLIC_APP_URL") ?? "https://coachbase.health").replace(/\/$/, "");
}

const MIN_VAULT_PRICE = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const tapSecret = Deno.env.get("TAP_SECRET_KEY");
    if (!tapSecret) {
      return new Response(JSON.stringify({ error: "TAP not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const unit_id = body.unit_id as string | undefined;
    const portal_token = (body.portal_token as string | undefined)?.trim();
    const return_base = (body.return_base as string | undefined) === "trainee" ? "trainee" : "portal";
    const siteOrigin = publicOrigin(body.site_origin);

    if (!unit_id || !portal_token) {
      return new Response(JSON.stringify({ error: "unit_id و portal_token مطلوبان" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: clientRow, error: clientErr } = await supabaseUser
      .from("clients")
      .select("id, trainer_id, auth_user_id")
      .eq("portal_token", portal_token)
      .maybeSingle();

    if (clientErr || !clientRow?.auth_user_id || clientRow.auth_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "رمز البوابة غير صالح لهذا الحساب" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: unit, error: unitErr } = await supabaseUser
      .from("vault_units")
      .select("id, trainer_id, price, is_free, audience, title")
      .eq("id", unit_id)
      .maybeSingle();

    if (unitErr || !unit) {
      return new Response(JSON.stringify({ error: "الوحدة غير موجودة" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trainerId = unit.trainer_id as string;
    const audience = String(unit.audience ?? "my_clients");
    const clientTrainerId = clientRow.trainer_id as string;

    const canAccess =
      trainerId === clientTrainerId ||
      audience === "platform";

    if (!canAccess) {
      return new Response(JSON.stringify({ error: "لا يمكنك شراء هذه الوحدة" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (unit.is_free === true || Number(unit.price) <= 0) {
      return new Response(JSON.stringify({ error: "هذه الوحدة مجانية" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = Number(unit.price);
    if (!Number.isFinite(amount) || amount < MIN_VAULT_PRICE) {
      return new Response(JSON.stringify({ error: `الحد الأدنى للسعر ${MIN_VAULT_PRICE} ر.س` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingBuy } = await supabaseUser
      .from("vault_purchases")
      .select("id")
      .eq("unit_id", unit_id)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (existingBuy) {
      return new Response(JSON.stringify({ error: "تم شراء هذه الوحدة مسبقاً" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = (user.email ?? "").trim();
    if (!email) {
      return new Response(JSON.stringify({ error: "أضف بريداً إلكترونياً لحسابك لإتمام الدفع" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectBase =
      `${siteOrigin}/payment/callback?type=vault_purchase&portal_token=${encodeURIComponent(portal_token)}&return_base=${return_base}`;
    const chargeRef = crypto.randomUUID();
    const meta: Record<string, string> = {
      type: "vault_purchase",
      unit_id,
      trainer_id: trainerId,
      buyer_id: user.id,
      amount: String(amount),
    };

    const tapRes = await fetch("https://api.tap.company/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tapSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "SAR",
        description: `مكتبة تعليمية — ${(unit.title as string).slice(0, 80)}`,
        source: { id: "src_all" },
        redirect: { url: redirectBase },
        metadata: meta,
        reference: { transaction: chargeRef, order: chargeRef },
        customer: {
          first_name: "Trainee",
          email,
        },
      }),
    });

    const tapData = await tapRes.json();
    if (!tapRes.ok) {
      console.error("[create-vault-checkout] Tap:", tapData);
      return new Response(JSON.stringify({ error: "تعذّر إنشاء عملية الدفع", details: tapData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentUrl = tapData.transaction?.url as string | undefined;
    if (!paymentUrl) {
      return new Response(JSON.stringify({ error: "لم يُرجَع رابط الدفع" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, tap_payment_url: paymentUrl, charge_id: tapData.id as string }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[create-vault-checkout]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
