import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!supabaseUrl || !anon || !service || !geminiKey) {
      return new Response(JSON.stringify({ error: "Service not configured" }), {
        status: 503,
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

    const body = (await req.json()) as {
      exercise_name_en?: string;
      exercise_name_ar?: string;
      reason?: string;
    };
    const reason = (body.reason ?? "قيود عمومية").trim();
    const nameEn = (body.exercise_name_en ?? "").trim();
    const nameAr = (body.exercise_name_ar ?? "").trim();
    if (!nameEn && !nameAr) {
      return new Response(JSON.stringify({ error: "أدخل اسم التمرين" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, service);
    const { data: lib, error: libErr } = await admin
      .from("exercisedb_cache")
      .select("external_id, name_en, name_ar, body_part, equipment")
      .limit(120);

    if (libErr || !lib?.length) {
      return new Response(
        JSON.stringify({
          error:
            "مكتبة التمارين غير مهيأة بعد. افتح قائمة التمارين مرة واحدة لمزامنة المكتبة، أو انتظر تهيئة الخادم.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const exclude = nameEn.toLowerCase();
    const candidates = lib.filter(
      (r) =>
        !r.name_en.toLowerCase().includes(exclude) &&
        r.name_en.toLowerCase() !== exclude,
    );
    const pool = (candidates.length >= 10 ? candidates : lib).slice(0, 80);

    const model = "gemini-1.5-flash";
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const listText = pool
      .map((x) => `- id:${x.external_id} | ${x.name_en} | ${x.name_ar} | ${x.body_part} | ${x.equipment}`)
      .join("\n");

    const prompt = `أنت مدرب قوة. التمرين الحالي: "${nameEn}" (${nameAr}). سبب الاستبدال: ${reason}.
من القائمة التالية فقط — اختر 3 تمارين بديلة مناسبة (لا تختر التمرين نفسه أو شبيهاً جداً له).
أعد JSON فقط بهذا الشكل بدون شرح:
{"alternatives":[{"external_id":"...","reason_ar":"سبب قصير بالعربي"}]}

القائمة:
${listText}`;

    const gemRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!gemRes.ok) {
      const t = await gemRes.text();
      console.error("gemini alternatives", gemRes.status, t);
      return new Response(JSON.stringify({ error: "تعذّر الاتصال بالذكاء الاصطناعي" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gemJson = (await gemRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      gemJson.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

    let parsed: { alternatives?: { external_id: string; reason_ar: string }[] };
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      return new Response(JSON.stringify({ error: "رد الذكاء غير صالح" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = new Set(pool.map((p) => p.external_id));
    const alts = (parsed.alternatives ?? [])
      .filter((a) => a.external_id && ids.has(a.external_id))
      .slice(0, 3)
      .map((a) => {
        const row = pool.find((r) => r.external_id === a.external_id)!;
        return {
          external_id: a.external_id,
          name_en: row.name_en,
          name_ar: row.name_ar,
          body_part: row.body_part,
          equipment: row.equipment,
          reason_ar: a.reason_ar ?? "",
        };
      });

    return new Response(JSON.stringify({ alternatives: alts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
