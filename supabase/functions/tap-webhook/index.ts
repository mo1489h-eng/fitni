import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const event = await req.json();
    console.log("Tap webhook event:", JSON.stringify(event));

    const chargeId = event?.id;
    const status = event?.status;

    if (!chargeId || !status) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify charge with Tap API
    const tapSecret = Deno.env.get("TAP_SECRET_KEY");
    if (!tapSecret) {
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch(`https://api.tap.company/v2/charges/${chargeId}`, {
      headers: { Authorization: `Bearer ${tapSecret}` },
    });
    const charge = await verifyRes.json();

    if (charge.status !== "CAPTURED") {
      console.log("Charge not captured:", charge.status);
      return new Response(JSON.stringify({ received: true, status: charge.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Charge is captured — handle based on metadata
    const metadata = charge.metadata || {};
    const type = metadata.type;

    console.log("Webhook processing type:", type, "charge:", chargeId);

    // Webhook is a backup — primary verification happens on redirect callback
    return new Response(JSON.stringify({ received: true, processed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
