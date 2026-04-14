import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPID_HOST = "exercisedb.p.rapidapi.com";
const BATCH_SIZE = 200;
const MAX_EXERCISES = 1400;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

    if (!supabaseUrl || !serviceKey || !rapidApiKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured — missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or RAPIDAPI_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);
    let totalSynced = 0;
    let offset = 0;

    while (offset < MAX_EXERCISES) {
      const apiUrl = `https://${RAPID_HOST}/exercises?limit=${BATCH_SIZE}&offset=${offset}`;
      console.log(`[exercise-library-sync] Fetching offset=${offset}, limit=${BATCH_SIZE}`);

      const res = await fetch(apiUrl, {
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": RAPID_HOST,
        },
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`[exercise-library-sync] ExerciseDB API error ${res.status}: ${errText.slice(0, 200)}`);
        // If we already have some data, return partial success
        if (totalSynced > 0) break;
        return new Response(
          JSON.stringify({ error: `ExerciseDB API error: ${res.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) {
        console.log(`[exercise-library-sync] No more exercises at offset=${offset}`);
        break;
      }

      const rows = list.map((ex: Record<string, unknown>) => ({
        id: String(ex.id ?? ""),
        name: typeof ex.name === "string" ? ex.name : "",
        body_part: typeof ex.bodyPart === "string" ? ex.bodyPart : "",
        equipment: typeof ex.equipment === "string" ? ex.equipment : "",
        gif_url: typeof ex.gifUrl === "string" && (ex.gifUrl as string).trim() ? (ex.gifUrl as string).trim() : null,
        target: typeof ex.target === "string" ? ex.target : "",
        secondary_muscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
        instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
        created_at: new Date().toISOString(),
      })).filter((r: { id: string }) => r.id.length > 0);

      if (rows.length === 0) break;

      const { error: upErr } = await admin.from("exercisedb_cache").upsert(rows, {
        onConflict: "id",
      });

      if (upErr) {
        console.error(`[exercise-library-sync] Upsert error at offset=${offset}:`, upErr.message);
        if (totalSynced > 0) break;
        return new Response(
          JSON.stringify({ error: upErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      totalSynced += rows.length;
      console.log(`[exercise-library-sync] Synced ${rows.length} exercises (total: ${totalSynced})`);

      if (list.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    const { count } = await admin
      .from("exercisedb_cache")
      .select("*", { head: true, count: "exact" });

    console.log(`[exercise-library-sync] Complete. Total synced: ${totalSynced}, DB total: ${count}`);

    return new Response(
      JSON.stringify({ ok: true, count: totalSynced, total: count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync failed";
    console.error("[exercise-library-sync] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
