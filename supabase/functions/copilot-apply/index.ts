import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { recommendation_id, decision } = await req.json();
    if (!recommendation_id || !decision) throw new Error("recommendation_id and decision are required");
    if (!["accepted", "rejected"].includes(decision)) throw new Error("Invalid decision");

    // Fetch recommendation
    const { data: rec, error: recErr } = await supabaseUser
      .from("copilot_recommendations")
      .select("*")
      .eq("id", recommendation_id)
      .eq("trainer_id", user.id)
      .maybeSingle();
    if (recErr || !rec) throw new Error("Recommendation not found");

    // Update status
    await supabaseUser.from("copilot_recommendations").update({
      status: decision,
      resolved_at: new Date().toISOString(),
    }).eq("id", recommendation_id);

    // If accepted and type is program, create the actual program and meal plan
    if (decision === "accepted" && rec.type === "program") {
      const payload = rec.payload as any;

      if (payload.program) {
        // Create program
        const { data: program, error: progErr } = await supabaseUser
          .from("programs")
          .insert({
            name: payload.program.name || "برنامج AI",
            trainer_id: user.id,
            weeks: payload.program.weeks || 12,
          })
          .select()
          .single();

        if (progErr) throw new Error("Failed to create program: " + progErr.message);

        // Create days and exercises
        for (const day of payload.program.days || []) {
          const { data: dayData, error: dayErr } = await supabaseUser
            .from("program_days")
            .insert({
              program_id: program.id,
              day_name: day.day_name,
              day_order: day.day_order || 0,
            })
            .select()
            .single();

          if (dayErr) continue;

          for (const ex of day.exercises || []) {
            await supabaseUser.from("program_exercises").insert({
              day_id: dayData.id,
              name: ex.name,
              sets: ex.sets || 3,
              reps: ex.reps || 10,
              weight: ex.weight || 0,
              exercise_order: ex.exercise_order || 0,
            });
          }
        }

        // Assign program to client
        await supabaseUser.from("clients").update({
          program_id: program.id,
        }).eq("id", rec.client_id);
      }

      if (payload.meal_plan) {
        // Create meal plan
        const { data: mealPlan, error: mpErr } = await supabaseUser
          .from("meal_plans")
          .insert({
            name: payload.meal_plan.name || "خطة تغذية AI",
            trainer_id: user.id,
            client_id: rec.client_id,
            notes: payload.meal_plan.notes || "",
          })
          .select()
          .single();

        if (!mpErr && mealPlan) {
          for (const meal of payload.meal_plan.meals || []) {
            await supabaseUser.from("meal_items").insert({
              meal_plan_id: mealPlan.id,
              meal_name: meal.meal_name || "وجبة",
              food_name: meal.food_name,
              calories: meal.calories || 0,
              protein: meal.protein || 0,
              carbs: meal.carbs || 0,
              fats: meal.fats || 0,
              quantity: meal.quantity || "",
              item_order: meal.item_order || 0,
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, status: decision }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("copilot-apply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
