import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const rapid = Deno.env.get("RAPIDAPI_KEY");
    if (!supabaseUrl || !anon || !service || !rapid) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSb = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userSb.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, service);
    const { data: prof } = await admin.from("profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
    if (!prof) {
      return new Response(JSON.stringify({ error: "Trainers only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://exercisedb.p.rapidapi.com/exercises?limit=200&offset=0", {
      headers: {
        "X-RapidAPI-Key": rapid,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `ExerciseDB ${res.status}: ${t}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const list = (await res.json()) as Array<{
      id: string;
      name: string;
      bodyPart: string;
      target: string;
      equipment: string;
      secondaryMuscles?: string[];
      instructions?: string[];
      gifUrl?: string;
    }>;

    if (!Array.isArray(list)) {
      return new Response(JSON.stringify({ error: "Invalid ExerciseDB response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = list.map((ex) => ({
      id: ex.id,
      name: ex.name,
      body_part: ex.bodyPart,
      equipment: ex.equipment ?? "",
      gif_url: typeof ex.gifUrl === "string" && ex.gifUrl.trim() ? ex.gifUrl.trim() : null,
      target: ex.target ?? "",
      secondary_muscles: ex.secondaryMuscles ?? [],
      instructions: ex.instructions ?? [],
      created_at: new Date().toISOString(),
    }));

    const { count: countBefore } = await admin
      .from("exercisedb_cache")
      .select("*", { head: true, count: "exact" });
    console.log("[exercise-library-sync] RapidAPI rows:", list.length, "| exercisedb_cache rows before upsert:", countBefore ?? "unknown");

    const { error: upErr } = await admin.from("exercisedb_cache").upsert(rows, {
      onConflict: "id",
    });
    if (upErr) {
      console.error("[exercise-library-sync] upsert failed:", upErr.message, upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: countAfter } = await admin
      .from("exercisedb_cache")
      .select("*", { head: true, count: "exact" });
    console.log(
      "[exercise-library-sync] upsert wrote",
      rows.length,
      "rows; exercisedb_cache total row count after:",
      countAfter ?? "unknown",
    );

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
