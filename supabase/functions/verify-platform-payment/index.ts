import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { creditTrainerWalletFromTap } from "../_shared/walletCredit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseMeta(meta: unknown): Record<string, string> {
  if (!meta || typeof meta !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    out[String(k)] = typeof v === "string" ? v : String(v);
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const payment_id = typeof body.payment_id === "string" ? body.payment_id : "";

    if (!payment_id) {
      return new Response(JSON.stringify({ error: "Missing payment_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tapSecret = Deno.env.get("TAP_SECRET_KEY");
    if (!tapSecret) {
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tapRes = await fetch(`https://api.tap.company/v2/charges/${payment_id}`, {
      headers: { Authorization: `Bearer ${tapSecret}` },
    });

    if (!tapRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to verify payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await tapRes.json();

    if (payment.status !== "CAPTURED") {
      return new Response(
        JSON.stringify({ error: "Payment not completed", status: payment.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const meta = parseMeta(payment.metadata);
    const trainer_id = meta.trainer_id || meta.trainerId;
    const rawType = (meta.type || meta.coachbase_payment_kind || "").toLowerCase();

    if (!trainer_id) {
      return new Response(JSON.stringify({ error: "Missing trainer_id in charge metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let kind: "program_sale" | "subscription";
    if (rawType === "program" || rawType === "program_sale") {
      kind = "program_sale";
    } else if (rawType === "subscription") {
      kind = "subscription";
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid or missing payment type in metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid charge amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const result = await creditTrainerWalletFromTap(supabase, {
      tapChargeId: payment_id,
      trainerId: trainer_id,
      amount,
      kind,
    });

    if (!result.ok) {
      console.error("verify-platform-payment wallet credit failed:", result.error);
      return new Response(JSON.stringify({ error: "Failed to record earnings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        idempotent: result.idempotent === true,
        trainer_id,
        kind,
        reference_id: meta.reference_id || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("verify-platform-payment:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
