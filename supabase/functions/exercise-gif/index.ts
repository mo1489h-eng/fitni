import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPID_HOST = "exercisedb.p.rapidapi.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const exerciseId = url.searchParams.get("id");
    if (!exerciseId) {
      return new Response(JSON.stringify({ error: "Missing id parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Step 1: Check exercisedb_cache for gif_url
    if (supabaseUrl && serviceKey) {
      try {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: cached } = await admin
          .from("exercisedb_cache")
          .select("gif_url")
          .eq("id", exerciseId)
          .maybeSingle();

        if (cached?.gif_url) {
          const gifRes = await fetch(cached.gif_url, {
            headers: { "User-Agent": "CoachBase-ExerciseGif/1.0" },
          });
          if (gifRes.ok) {
            const buffer = await gifRes.arrayBuffer();
            const contentType = gifRes.headers.get("content-type") || "image/gif";
            return new Response(buffer, {
              headers: {
                ...corsHeaders,
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400",
              },
            });
          }
          // If cached URL fails, fall through to API
          console.warn(`[exercise-gif] Cached gif_url failed for ${exerciseId}, falling back to API`);
        }
      } catch (e) {
        console.warn(`[exercise-gif] Cache lookup error:`, e instanceof Error ? e.message : e);
        // Fall through to API
      }
    }

    // Step 2: Fall back to RapidAPI
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      return new Response(JSON.stringify({ error: "RAPIDAPI_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      "X-RapidAPI-Key": rapidApiKey,
      "X-RapidAPI-Host": RAPID_HOST,
    };

    // Try image endpoint first
    const primaryUrl = `https://${RAPID_HOST}/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=360`;
    let response = await fetch(primaryUrl, { headers });

    if (!response.ok) {
      const pathUrl = `https://${RAPID_HOST}/image/${encodeURIComponent(exerciseId)}`;
      response = await fetch(pathUrl, { headers });
    }

    // Try exercise detail endpoint to get gifUrl
    if (!response.ok) {
      const detailUrls = [
        `https://${RAPID_HOST}/exercises/exercise/${encodeURIComponent(exerciseId)}`,
        `https://${RAPID_HOST}/exercises/${encodeURIComponent(exerciseId)}`,
      ];

      for (const detailUrl of detailUrls) {
        try {
          const detailRes = await fetch(detailUrl, { headers });
          if (!detailRes.ok) continue;

          const data = await detailRes.json() as { gifUrl?: string };
          const gifUrl = typeof data?.gifUrl === "string" ? data.gifUrl.trim() : "";
          if (!gifUrl) continue;

          const gifRes = await fetch(gifUrl, {
            headers: { "User-Agent": "CoachBase-ExerciseGif/1.0" },
          });
          if (!gifRes.ok) continue;

          const buffer = await gifRes.arrayBuffer();
          const contentType = gifRes.headers.get("content-type") || "image/gif";

          // Cache the gif_url for next time
          if (supabaseUrl && serviceKey) {
            try {
              const admin = createClient(supabaseUrl, serviceKey);
              await admin.from("exercisedb_cache").upsert(
                [{ id: exerciseId, gif_url: gifUrl }],
                { onConflict: "id" },
              );
            } catch { /* best effort */ }
          }

          return new Response(buffer, {
            headers: {
              ...corsHeaders,
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400",
            },
          });
        } catch {
          continue;
        }
      }

      const errText = await response.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `ExerciseDB image error: ${response.status}`, detail: errText.slice(0, 200) }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/gif";

    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
