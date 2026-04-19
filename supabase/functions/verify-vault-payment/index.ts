/**
 * After Tap redirect: verify CAPTURED, record vault_purchases, credit trainer (90% net, 10% commission).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { creditTrainerWalletFromTap } from "../_shared/walletCredit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function amountMatches(a: number, b: number): boolean {
  return Math.abs(Number(a) - Number(b)) < 0.02;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tapSecret = Deno.env.get("TAP_SECRET_KEY")!;

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payment_id } = await req.json();
    if (!payment_id || typeof payment_id !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Missing payment_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabaseAdmin
      .from("vault_purchases")
      .select("id, unit_id")
      .eq("tap_charge_id", payment_id)
      .maybeSingle();

    if (existing?.id) {
      return new Response(JSON.stringify({ success: true, idempotent: true, unit_id: existing.unit_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tapRes = await fetch(`https://api.tap.company/v2/charges/${payment_id}`, {
      headers: { Authorization: `Bearer ${tapSecret}` },
    });
    if (!tapRes.ok) {
      return new Response(JSON.stringify({ success: false, error: "Failed to verify payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await tapRes.json();
    if (payment.status !== "CAPTURED") {
      return new Response(
        JSON.stringify({ success: false, error: "Payment not completed", status: payment.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const meta = (payment.metadata ?? {}) as Record<string, string>;
    if (String(meta.type || "") !== "vault_purchase") {
      return new Response(JSON.stringify({ success: false, error: "Invalid payment type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buyerId = String(meta.buyer_id || "").trim();
    const trainerId = String(meta.trainer_id || "").trim();
    const unitId = String(meta.unit_id || "").trim();
    if (!buyerId || !trainerId || !unitId || buyerId !== user.id) {
      return new Response(JSON.stringify({ success: false, error: "Metadata mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tapAmount = Number(payment.amount);
    const metaAmount = Number(meta.amount);
    if (!amountMatches(tapAmount, metaAmount)) {
      return new Response(JSON.stringify({ success: false, error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: unit, error: unitErr } = await supabaseAdmin
      .from("vault_units")
      .select("id, price, is_free, trainer_id")
      .eq("id", unitId)
      .maybeSingle();

    if (unitErr || !unit || (unit.trainer_id as string) !== trainerId) {
      return new Response(JSON.stringify({ success: false, error: "Unit not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (unit.is_free === true || Number(unit.price) <= 0) {
      return new Response(JSON.stringify({ success: false, error: "Unit is free" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!amountMatches(tapAmount, Number(unit.price))) {
      return new Response(JSON.stringify({ success: false, error: "Amount does not match unit price" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await supabaseAdmin.from("vault_purchases").insert({
      unit_id: unitId,
      buyer_id: buyerId,
      trainer_id: trainerId,
      amount: tapAmount,
      tap_charge_id: payment_id,
    });

    if (insErr) {
      if ((insErr as { code?: string }).code === "23505") {
        return new Response(JSON.stringify({ success: true, idempotent: true, unit_id: unitId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[verify-vault-payment] insert:", insErr);
      return new Response(JSON.stringify({ success: false, error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wallet = await creditTrainerWalletFromTap(supabaseAdmin, {
      tapChargeId: payment_id,
      trainerId,
      amount: tapAmount,
      kind: "vault_sale",
    });
    if (!wallet.ok) {
      console.error("[verify-vault-payment] wallet:", wallet.error);
    }

    return new Response(JSON.stringify({ success: true, unit_id: unitId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[verify-vault-payment]", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
