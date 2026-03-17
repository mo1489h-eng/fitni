import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { listing_id, payment_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: "listing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get listing details to validate amount
    const { data: listing, error: listingError } = await supabase
      .from("marketplace_listings")
      .select("purchase_count, trainer_id, price, status")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (listing.status !== "published") {
      return new Response(JSON.stringify({ error: "Listing not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency check - prevent duplicate purchases
    const { data: existingPurchase } = await supabase
      .from("marketplace_purchases")
      .select("id")
      .eq("listing_id", listing_id)
      .eq("buyer_id", userId)
      .eq("status", "completed")
      .maybeSingle();

    if (existingPurchase) {
      return new Response(JSON.stringify({ error: "Already purchased" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For paid listings, verify payment with Moyasar
    if (listing.price > 0) {
      if (!payment_id) {
        return new Response(JSON.stringify({ error: "payment_id required for paid listings" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const moyasarSecret = Deno.env.get("MOYASAR_SECRET_KEY");
      if (!moyasarSecret) {
        return new Response(JSON.stringify({ error: "Payment configuration error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify payment with Moyasar API
      const moyasarRes = await fetch(`https://api.moyasar.com/v1/payments/${payment_id}`, {
        headers: {
          Authorization: `Basic ${btoa(moyasarSecret + ":")}`,
        },
      });

      if (!moyasarRes.ok) {
        return new Response(JSON.stringify({ error: "Payment verification failed" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const moyasarPayment = await moyasarRes.json();

      // Verify payment status and amount (Moyasar amounts are in halalas = price * 100)
      if (moyasarPayment.status !== "paid") {
        return new Response(JSON.stringify({ error: "Payment not completed" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expectedAmount = listing.price * 100;
      if (moyasarPayment.amount < expectedAmount) {
        return new Response(JSON.stringify({ error: "Payment amount mismatch" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Increment purchase count
    await supabase
      .from("marketplace_listings")
      .update({ purchase_count: (listing.purchase_count || 0) + 1 })
      .eq("id", listing_id);

    // Record purchase with actual buyer_id and validated amount
    await supabase.from("marketplace_purchases").insert({
      listing_id,
      buyer_id: userId,
      trainer_id: listing.trainer_id,
      amount: listing.price,
      status: "completed",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
