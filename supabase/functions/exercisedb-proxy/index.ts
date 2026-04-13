import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RAPID_HOST = 'exercisedb.p.rapidapi.com';

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
      const gifUrl = typeof data?.gifUrl === 'string' ? data.gifUrl.trim() : '';
      if (!gifUrl) continue;
      const gifRes = await fetch(gifUrl, { headers: { 'User-Agent': 'Fitni-ExerciseGif/1.0' } });
      if (!gifRes.ok) continue;
      const buffer = await gifRes.arrayBuffer();
      const contentType = gifRes.headers.get('content-type') || 'image/gif';
      return { buffer, contentType };
    } catch {
      continue;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
    if (!RAPIDAPI_KEY) {
      return new Response(JSON.stringify({ error: 'RAPIDAPI_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'exercises';

    // ── Image proxy route ──
    if (endpoint === 'image') {
      const exerciseId = url.searchParams.get('exerciseId');
      if (!exerciseId) {
        return new Response(JSON.stringify({ error: 'Missing exerciseId' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rapidHeaders: Record<string, string> = {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPID_HOST,
      };

      // Documented image API: ?exerciseId=&resolution= (see ExerciseDB docs)
      const primaryUrl =
        `https://${RAPID_HOST}/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=360`;
      let imgResponse = await fetch(primaryUrl, { headers: rapidHeaders });
      if (!imgResponse.ok) {
        const pathUrl = `https://${RAPID_HOST}/image/${encodeURIComponent(exerciseId)}`;
        imgResponse = await fetch(pathUrl, { headers: rapidHeaders });
      }

      if (!imgResponse.ok) {
        const fromDetail = await fetchGifViaExerciseDetail(exerciseId, rapidHeaders);
        if (fromDetail) {
          return new Response(fromDetail.buffer, {
            headers: {
              ...corsHeaders,
              'Content-Type': fromDetail.contentType,
              'Cache-Control': 'public, max-age=86400, s-maxage=604800',
            },
          });
        }
        return new Response(JSON.stringify({ error: `Image fetch failed: ${imgResponse.status}` }), {
          status: imgResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const contentType = imgResponse.headers.get('content-type') || 'image/gif';
      const body = await imgResponse.arrayBuffer();

      return new Response(body, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      });
    }

    // ── Data routes ──
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';
    const bodyPart = url.searchParams.get('bodyPart') || '';
    const target = url.searchParams.get('target') || '';
    const name = url.searchParams.get('name') || '';

    let apiUrl = 'https://exercisedb.p.rapidapi.com';

    if (endpoint === 'exercises') {
      apiUrl += `/exercises?limit=${limit}&offset=${offset}`;
    } else if (endpoint === 'bodyPartList') {
      apiUrl += '/exercises/bodyPartList';
    } else if (endpoint === 'byBodyPart' && bodyPart) {
      apiUrl += `/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}&offset=${offset}`;
    } else if (endpoint === 'byTarget' && target) {
      apiUrl += `/exercises/target/${encodeURIComponent(target)}?limit=${limit}&offset=${offset}`;
    } else if (endpoint === 'byName' && name) {
      apiUrl += `/exercises/name/${encodeURIComponent(name)}?limit=${limit}&offset=${offset}`;
    } else if (endpoint === 'targetList') {
      apiUrl += '/exercises/targetList';
    } else if (endpoint === 'equipmentList') {
      apiUrl += '/exercises/equipmentList';
    } else {
      apiUrl += `/exercises?limit=${limit}&offset=${offset}`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `ExerciseDB API error [${response.status}]: ${text}` }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
