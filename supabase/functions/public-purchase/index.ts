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
    const { listing_id, amount } = await req.json();
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

    // Increment purchase count
    const { data: listing } = await supabase
      .from("marketplace_listings")
      .select("purchase_count, trainer_id")
      .eq("id", listing_id)
      .single();

    if (listing) {
      await supabase
        .from("marketplace_listings")
        .update({ purchase_count: (listing.purchase_count || 0) + 1 })
        .eq("id", listing_id);

      // Record anonymous purchase
      await supabase.from("marketplace_purchases").insert({
        listing_id,
        buyer_id: listing.trainer_id, // placeholder for anonymous
        trainer_id: listing.trainer_id,
        amount: amount || 0,
        status: "completed",
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
