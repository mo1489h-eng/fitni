import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const PROMPT_FRONT = `Generate a detailed anatomical SVG of a human body 
showing muscle groups. ViewBox: "0 0 400 500"

Requirements:
- Realistic human body silhouette (front view)
- White/light gray body base (#F5F5F5)
- Dark outline (#333333) for body silhouette
- Each muscle group as a SEPARATE named path with id attribute
- Muscle fill: #CC2200 (red, like anatomy textbooks)
- Muscle stroke: #990000 darker red outline

Muscle paths required with these exact IDs:
- id="chest-left" and id="chest-right" (pectoralis major)
- id="shoulder-left" and id="shoulder-right" (deltoid)  
- id="bicep-left" and id="bicep-right"
- id="forearm-left" and id="forearm-right"
- id="abs-1" through id="abs-6" (rectus abdominis blocks)
- id="oblique-left" and id="oblique-right"
- id="quad-left" and id="quad-right" (quadriceps)
- id="calf-left" and id="calf-right"

Body proportions:
- Head: circle at top center, radius ~35px
- Shoulders width: ~280px
- Waist width: ~180px  
- Total height: ~480px
- Arms hanging at sides
- Legs straight, slightly apart

Style:
- Clean white background
- Body outline: 2px stroke #333
- Muscles clearly visible and anatomically positioned
- Separation lines between muscle groups
- Professional medical illustration style

Return ONLY valid SVG code starting with <svg and 
ending with </svg>. No markdown, no explanation.`;

const PROMPT_BACK = `Same as above but BACK VIEW with these IDs:
- id="trap-upper" (trapezius upper)
- id="trap-lower" (trapezius lower)  
- id="lat-left" and id="lat-right" (latissimus dorsi)
- id="shoulder-back-left" and id="shoulder-back-right"
- id="tricep-left" and id="tricep-right"
- id="lower-back-left" and id="lower-back-right"
- id="glute-left" and id="glute-right"
- id="hamstring-left" and id="hamstring-right"
- id="calf-back-left" and id="calf-back-right"

Return ONLY valid SVG code.`;

function jsonErr(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractSvg(text: string): string | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:svg)?\s*([\s\S]*?)```/i);
  const candidate = (fence?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("<svg");
  const end = candidate.lastIndexOf("</svg>");
  if (start === -1 || end === -1 || end <= start) return null;
  return candidate.slice(start, end + 6).trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonErr("Method not allowed", 405);
  }

  let view: "front" | "back" = "front";
  try {
    const body = await req.json();
    if (body?.view === "back") view = "back";
  } catch {
    /* empty body → front */
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonErr("No auth", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !anonKey) {
    return jsonErr("Server misconfigured", 500);
  }

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await supabaseClient.auth.getUser();
  if (userErr || !user) {
    return jsonErr("Unauthorized", 401);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return jsonErr("ANTHROPIC_API_KEY is not configured for this project", 503);
  }

  const userPrompt = view === "front" ? PROMPT_FRONT : PROMPT_BACK;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 16384,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const raw = await anthropicRes.text();
  if (!anthropicRes.ok) {
    console.error("anthropic error", anthropicRes.status, raw.slice(0, 500));
    return jsonErr("Failed to generate muscle diagram", 502);
  }

  let body: { content?: Array<{ type?: string; text?: string }> };
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonErr("Invalid response from model provider", 502);
  }

  const text = body.content?.find((b) => b.type === "text")?.text ?? "";
  const svg = extractSvg(text);
  if (!svg || !svg.includes("<path")) {
    return jsonErr("Model did not return a usable SVG", 502);
  }

  return new Response(JSON.stringify({ svg, view }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
