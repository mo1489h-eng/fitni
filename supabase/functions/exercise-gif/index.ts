import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPID_HOST = "exercisedb.p.rapidapi.com";

/** Try exercise JSON endpoints; re-stream CDN `gifUrl` bytes. */
async function fetchGifViaExerciseDetail(
  exerciseId: string,
  headers: Record<string, string>,
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  const detailUrls = [
    `https://${RAPID_HOST}/exercises/exercise/${encodeURIComponent(exerciseId)}`,
    `https://${RAPID_HOST}/exercises/${encodeURIComponent(exerciseId)}`,
  ];

  for (const detailUrl of detailUrls) {
    try {
      const detailRes = await fetch(detailUrl, { headers });
      if (!detailRes.ok) continue;

      let data: { gifUrl?: string };
      try {
        data = (await detailRes.json()) as { gifUrl?: string };
      } catch {
        continue;
      }

      const gifUrl = typeof data?.gifUrl === "string" ? data.gifUrl.trim() : "";
      if (!gifUrl) continue;

      const gifRes = await fetch(gifUrl, {
        headers: { "User-Agent": "Fitni-ExerciseGif/1.0" },
      });
      if (!gifRes.ok) continue;

      const buffer = await gifRes.arrayBuffer();
      const contentType = gifRes.headers.get("content-type") || "image/gif";
      return { buffer, contentType };
    } catch {
      continue;
    }
  }
  return null;
}

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

    const headers: Record<string, string> = {
      "X-RapidAPI-Key": rapidApiKey,
      "X-RapidAPI-Host": RAPID_HOST,
    };

    // Documented: /image?exerciseId=&resolution=
    const primaryUrl =
      `https://${RAPID_HOST}/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=360`;
    let response = await fetch(primaryUrl, { headers });

    if (!response.ok) {
      const pathUrl = `https://${RAPID_HOST}/image/${encodeURIComponent(exerciseId)}`;
      response = await fetch(pathUrl, { headers });
    }

    if (!response.ok) {
      const fromDetail = await fetchGifViaExerciseDetail(exerciseId, headers);
      if (fromDetail) {
        return new Response(fromDetail.buffer, {
          headers: {
            ...corsHeaders,
            "Content-Type": fromDetail.contentType,
            "Cache-Control": "public, max-age=86400",
          },
        });
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
