import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Popular ExerciseDB names -> Arabic (subset; extend over time). */
const NAME_AR: Record<string, string> = {
  "barbell bench press": "بنش بريس بار",
  "dumbbell bench press": "بنش بريس دمبل",
  "incline barbell bench press": "بنش مائل بار",
  "incline dumbbell bench press": "بنش مائل دمبل",
  "lat pulldown": "سحب علوي",
  "pull-up": "عقلة",
  "pull up": "عقلة",
  "chin-up": "عقلة ضيقة",
  "barbell squat": "سكوات بار",
  "leg press": "ليج بريس",
  "deadlift": "ديدليفت",
  "romanian deadlift": "رومانيان ديدليفت",
  "barbell bent over row": "تجديف بار",
  "seated cable row": "تجديف جالس",
  "dumbbell shoulder press": "ضغط أكتاف دمبل",
  "overhead press": "ضغط فوق الرأس",
  "lateral raise": "رفع جانبي",
  "barbell curl": "كيرل بار",
  "dumbbell curl": "كيرل دمبل",
  "triceps pushdown": "ترايسبس بوش داون",
  "push-up": "ضغط",
  "front squat": "فرونت سكوات",
  "hack squat": "هاك سكوات",
  "bulgarian split squat": "سبلت سكوات بلغاري",
  "walking lunge": "مشي طعنات",
  "leg extension": "تمديد ركبة",
  "lying leg curl": "كيرل رجل نائم",
  "face pull": "فيس بول",
  "cable crossover": "كروس أوفر",
  "dumbbell fly": "فلاي دمبل",
  "chest dip": "ديبس صدر",
  "t-bar row": "تي بار رو",
  "hip thrust": "هيب ثرست",
  "standing calf raise": "بطة واقف",
  "hammer curl": "هامر كيرل",
  "skull crusher": "سكال كراشر",
  "preacher curl": "بريتشر كيرل",
  "farmers walk": "حمل مزارع",
  "farmer carry": "حمل مزارع",
  "plank": "بلانك",
  "hanging leg raise": "رفع رجلين معلق",
  "kettlebell swing": "سوينغ كيتلبل",
  "jump rope": "حبل قفز",
  "burpee": "بيربي",
};

function arabicForName(en: string): string {
  const k = en.toLowerCase().replace(/\s+/g, " ").trim();
  if (NAME_AR[k]) return NAME_AR[k];
  for (const [key, val] of Object.entries(NAME_AR)) {
    if (k.includes(key) || key.includes(k)) return val;
  }
  return en;
}

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
    }>;

    if (!Array.isArray(list)) {
      return new Response(JSON.stringify({ error: "Invalid ExerciseDB response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = list.map((ex) => ({
      external_id: ex.id,
      name_en: ex.name,
      name_ar: arabicForName(ex.name),
      body_part: ex.bodyPart,
      target: ex.target ?? "",
      equipment: ex.equipment ?? "",
      secondary_muscles: ex.secondaryMuscles ?? [],
      instructions: ex.instructions ?? [],
      synced_at: new Date().toISOString(),
    }));

    const { error: upErr } = await admin.from("exercisedb_cache").upsert(rows, {
      onConflict: "external_id",
    });
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
