import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { creditTrainerWalletFromTap } from "../_shared/walletCredit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return jsonResponse({ error: "Unauthorized" }, 401);

    let payload: { listing_id?: string; payment_id?: string };
    try { payload = await req.json(); } catch { return jsonResponse({ error: "Invalid request body" }, 400); }

    const listingId = typeof payload.listing_id === "string" ? payload.listing_id : "";
    const paymentId = typeof payload.payment_id === "string" ? payload.payment_id : undefined;
    if (!listingId) return jsonResponse({ error: "listing_id required" }, 400);

    const userId = claimsData.claims.sub;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: listing, error: listingError } = await supabase
      .from("marketplace_listings")
      .select("id, purchase_count, trainer_id, price, status, program_id, currency")
      .eq("id", listingId).single();

    if (listingError || !listing) return jsonResponse({ error: "Listing not found" }, 404);
    if (listing.status !== "published") return jsonResponse({ error: "Listing not available" }, 400);

    const { data: existingPurchase } = await supabase
      .from("marketplace_purchases").select("id")
      .eq("listing_id", listingId).eq("buyer_id", userId).eq("status", "completed").maybeSingle();

    if (existingPurchase) return jsonResponse({ error: "Already purchased" }, 409);

    // Verify payment for paid listings
    let verifiedAmount = 0;
    if (listing.price > 0) {
      if (!paymentId) return jsonResponse({ error: "payment_id required for paid listings" }, 400);

      const tapSecret = Deno.env.get("TAP_SECRET_KEY");
      if (!tapSecret) return jsonResponse({ error: "Payment configuration error" }, 500);

      const tapRes = await fetch(`https://api.tap.company/v2/charges/${paymentId}`, {
        headers: { Authorization: `Bearer ${tapSecret}` },
      });

      if (!tapRes.ok) return jsonResponse({ error: "Payment verification failed" }, 402);

      const tapPayment = await tapRes.json();
      if (tapPayment.status !== "CAPTURED") return jsonResponse({ error: "Payment not completed" }, 402);
      if (Number(tapPayment.amount) !== Number(listing.price)) return jsonResponse({ error: "Payment amount mismatch" }, 402);
      verifiedAmount = Number(tapPayment.amount);
    }

    // Platform fee on marketplace program sales (recorded on purchase; trainer net via wallet)
    const commissionRate = 0.2;

    // Record the purchase
    const { error: purchaseError } = await supabase.from("marketplace_purchases").insert({
      listing_id: listingId, buyer_id: userId, trainer_id: listing.trainer_id,
      amount: listing.price, currency: listing.currency, status: "completed",
      commission_rate: commissionRate,
    });

    if (purchaseError) {
      if (purchaseError.code === "23505") return jsonResponse({ error: "Already purchased" }, 409);
      console.error("Purchase insert error:", purchaseError);
      return jsonResponse({ error: "Failed to record purchase" }, 500);
    }

    await supabase.from("marketplace_listings")
      .update({ purchase_count: (listing.purchase_count || 0) + 1 }).eq("id", listingId);

    if (verifiedAmount > 0 && paymentId) {
      const wallet = await creditTrainerWalletFromTap(supabase, {
        tapChargeId: paymentId,
        trainerId: listing.trainer_id,
        amount: verifiedAmount,
        kind: "program_sale",
      });
      if (!wallet.ok) {
        await supabase.from("marketplace_purchases").delete()
          .eq("listing_id", listingId).eq("buyer_id", userId);
        await supabase.from("marketplace_listings")
          .update({ purchase_count: listing.purchase_count || 0 }).eq("id", listingId);
        console.error("Wallet credit failed after purchase insert:", wallet.error);
        return jsonResponse({ error: "Failed to credit trainer wallet" }, 500);
      }
    }

    // Clone program to buyer
    let programCloned = false;
    if (listing.program_id) {
      const { data: sourceProgram } = await supabase
        .from("programs").select("id, name, weeks, trainer_id")
        .eq("id", listing.program_id).eq("trainer_id", listing.trainer_id).maybeSingle();

      if (sourceProgram) {
        const { data: sourceDays } = await supabase
          .from("program_days").select("id, day_name, day_order")
          .eq("program_id", sourceProgram.id).order("day_order", { ascending: true });

        const sourceDayIds = (sourceDays || []).map(d => d.id);
        const { data: sourceExercises } = sourceDayIds.length
          ? await supabase.from("program_exercises")
              .select("day_id, name, reps, sets, video_url, weight, exercise_order, rest_seconds, tempo, rpe, notes, is_warmup, superset_group")
              .in("day_id", sourceDayIds).order("exercise_order", { ascending: true })
          : { data: [] as any[] };

        const { data: newProgram, error: newProgramError } = await supabase
          .from("programs").insert({
            name: sourceProgram.name, trainer_id: userId, weeks: sourceProgram.weeks,
          }).select("id").single();

        if (!newProgramError && newProgram) {
          const exercisesByDay = new Map<string, Array<Record<string, unknown>>>();
          for (const exercise of sourceExercises || []) {
            const dayExercises = exercisesByDay.get(exercise.day_id) || [];
            dayExercises.push(exercise);
            exercisesByDay.set(exercise.day_id, dayExercises);
          }
          for (const day of sourceDays || []) {
            const { data: newDay, error: newDayError } = await supabase
              .from("program_days").insert({
                program_id: newProgram.id, day_name: day.day_name, day_order: day.day_order,
              }).select("id").single();
            if (newDayError || !newDay) continue;
            const dayExercises = exercisesByDay.get(day.id) || [];
            if (dayExercises.length > 0) {
              await supabase.from("program_exercises").insert(
                dayExercises.map(e => ({
                  day_id: newDay.id, name: e.name as string, sets: e.sets as number,
                  reps: e.reps as number, weight: e.weight as number,
                  video_url: (e.video_url as string | null) ?? null,
                  exercise_order: e.exercise_order as number,
                  rest_seconds: (e.rest_seconds as number) || 60,
                  tempo: (e.tempo as string | null) ?? null,
                  rpe: (e.rpe as number | null) ?? null,
                  notes: (e.notes as string | null) ?? null,
                  is_warmup: (e.is_warmup as boolean) || false,
                  superset_group: (e.superset_group as string | null) ?? null,
                }))
              );
            }
          }
          programCloned = true;

          // Check if buyer is already a client of this trainer - if not, create lightweight client
          const { data: existingClient } = await supabase
            .from("clients").select("id")
            .eq("auth_user_id", userId).eq("trainer_id", listing.trainer_id).maybeSingle();

          if (!existingClient) {
            // Get buyer info
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            const buyerName = authUser?.user?.user_metadata?.full_name || authUser?.user?.email?.split("@")[0] || "مشتري";

            await supabase.from("clients").insert({
              name: buyerName,
              auth_user_id: userId,
              trainer_id: listing.trainer_id,
              program_id: newProgram.id,
              goal: "برنامج من المتجر",
              client_type: "online",
              email: authUser?.user?.email || null,
            });
          } else {
            // Assign the cloned program to existing client
            await supabase.from("clients")
              .update({ program_id: newProgram.id })
              .eq("id", existingClient.id);
          }
        }
      }
    }

    return jsonResponse({ success: true, program_cloned: programCloned });
  } catch (e) {
    console.error("public-purchase error:", e);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
