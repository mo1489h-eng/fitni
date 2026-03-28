import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { amount, currency, description, customer, redirect_url, metadata, destinations } = await req.json();

    if (!amount || !redirect_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tapSecret = Deno.env.get("TAP_SECRET_KEY");
    if (!tapSecret) {
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chargeBody: Record<string, unknown> = {
      amount,
      currency: currency || "SAR",
      description: description || "CoachBase Payment",
      source: { id: "src_all" },
      redirect: { url: redirect_url },
      metadata: metadata || {},
    };

    if (customer) {
      chargeBody.customer = {
        first_name: customer.name || "Customer",
        email: customer.email || "",
        phone: customer.phone ? {
          country_code: "966",
          number: customer.phone.replace(/^0/, "").replace(/^\+966/, ""),
        } : undefined,
      };
    }

    if (destinations && destinations.length > 0) {
      chargeBody.destinations = { destination: destinations };
    }

    const chargeRef = crypto.randomUUID();
    chargeBody.reference = { transaction: chargeRef, order: chargeRef };

    const tapRes = await fetch("https://api.tap.company/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tapSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargeBody),
    });

    const tapData = await tapRes.json();

    if (!tapRes.ok) {
      console.error("Tap API error:", tapData);
      return new Response(JSON.stringify({ error: "Failed to create charge", details: tapData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      charge_id: tapData.id,
      redirect_url: tapData.transaction?.url,
      status: tapData.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
