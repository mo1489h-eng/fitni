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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { session_id, prompt_context } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    const { data: session, error: sErr } = await supabase
      .from("workout_sessions")
      .select("id, client_id, total_volume, duration_minutes, program_day_id")
      .eq("id", session_id)
      .single();
    if (sErr || !session) throw new Error("Session not found");

    const { data: client } = await supabase
      .from("clients")
      .select("id, auth_user_id, trainer_id")
      .eq("id", session.client_id)
      .single();

    const isClient = client?.auth_user_id === user.id;
    const isTrainer = client?.trainer_id === user.id;
    if (!isClient && !isTrainer) throw new Error("Forbidden");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ctx = typeof prompt_context === "string" ? prompt_context : "";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "أنت مدرب لياقة عربي محترف. اكتب دائماً بالعربية الفصحى المبسطة. ردود قصيرة وواضحة.",
          },
          {
            role: "user",
            content:
              ctx ||
              `لخص أداء الجلسة بلطف وقدّم توصية واحدة للجلسة القادمة. بيانات الجلسة: الحجم الكلي ${session.total_volume ?? 0} كجم، المدة ${session.duration_minutes ?? 0} دقيقة.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("workout-insight AI error:", aiResponse.status, errText);
      throw new Error("AI request failed");
    }

    const json = await aiResponse.json();
    const text = json?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ insight: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
