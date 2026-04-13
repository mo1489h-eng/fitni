import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      return new Response(JSON.stringify({ error: "RAPIDAPI_KEY not configured in Edge Function secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      "X-RapidAPI-Key": rapidApiKey,
      "X-RapidAPI-Host": RAPID_HOST,
    };

    // Official image streaming API (query params): exerciseId + resolution
    // https://edb-docs.up.railway.app/docs/image-service/image
    const primaryUrl =
      `https://${RAPID_HOST}/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=360`;
    let response = await fetch(primaryUrl, { headers });

    // Fallback: path form used by some stacks
    if (!response.ok) {
      const pathUrl = `https://${RAPID_HOST}/image/${encodeURIComponent(exerciseId)}`;
      response = await fetch(pathUrl, { headers });
    }

    // Fallback: exercise detail returns `gifUrl` (CDN URL) — fetch and re-stream
    if (!response.ok) {
      const detailUrl = `https://${RAPID_HOST}/exercises/exercise/${encodeURIComponent(exerciseId)}`;
      const detailRes = await fetch(detailUrl, { headers });
      if (detailRes.ok) {
        const data = (await detailRes.json()) as { gifUrl?: string };
        const gifUrl = typeof data?.gifUrl === "string" ? data.gifUrl.trim() : "";
        if (gifUrl) {
          const gifRes = await fetch(gifUrl, {
            headers: { "User-Agent": "Fitni-ExerciseGif/1.0" },
          });
          if (gifRes.ok) {
            const buf = await gifRes.arrayBuffer();
            const ct = gifRes.headers.get("content-type") || "image/gif";
            return new Response(buf, {
              headers: {
                ...corsHeaders,
                "Content-Type": ct,
                "Cache-Control": "public, max-age=86400",
              },
            });
          }
        }
      }
      const errText = await response.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error: `ExerciseDB image error: ${response.status}`,
          detail: errText.slice(0, 200),
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
