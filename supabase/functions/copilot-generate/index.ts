import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildClientProfile,
  buildProgramPrompt,
  collectMissingProgramFields,
} from "../_shared/copilotProgramGeneration.ts";

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

    const { client_id, action } = await req.json();
    if (!client_id) throw new Error("client_id is required");

    // Fetch client data
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .eq("trainer_id", user.id)
      .maybeSingle();
    if (clientErr || !client) throw new Error("Client not found or access denied");

    const clientRow = client as Record<string, unknown>;

    // Fetch latest body scan
    const { data: scans } = await supabase
      .from("body_scans")
      .select("*")
      .eq("client_id", client_id)
      .order("scan_date", { ascending: false })
      .limit(1);
    const scan = scans?.[0] as Record<string, unknown> | undefined;

    // Fetch latest measurements
    const { data: measurements } = await supabase
      .from("measurements")
      .select("*")
      .eq("client_id", client_id)
      .order("recorded_at", { ascending: false })
      .limit(5);
    const measurementRows = (measurements || []) as Record<string, unknown>[];

    // Fetch existing program if any
    let existingProgram: Record<string, unknown> | null = null;
    if (client.program_id) {
      const { data } = await supabase
        .from("programs")
        .select("*, program_days(*, program_exercises(*))")
        .eq("id", client.program_id)
        .maybeSingle();
      existingProgram = data as Record<string, unknown> | null;
    }

    // Fetch existing meal plan
    const { data: mealPlans } = await supabase
      .from("meal_plans")
      .select("*, meal_items(*)")
      .eq("client_id", client_id)
      .limit(1);
    const existingMealPlan = mealPlans?.[0];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (action === "generate_program") {
      const missing = collectMissingProgramFields(clientRow, scan, measurementRows);
      if (missing.length > 0) {
        const labels = missing.map((m) => m.labelAr).join("، ");
        return new Response(
          JSON.stringify({
            error:
              `بيانات العميل غير مكتملة. أضف أو حدّث في ملف العميل قبل توليد البرنامج: ${labels}`,
            missing_fields: missing.map((m) => m.key),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const clientProfile = buildClientProfile(clientRow, scan, measurementRows, existingProgram);

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "generate_program") {
      ({ systemPrompt, userPrompt } = buildProgramPrompt(
        clientProfile as Record<string, unknown>,
        existingProgram,
      ));
    } else if (action === "weekly_evaluation") {
      ({ systemPrompt, userPrompt } = buildEvaluationPrompt(
        clientProfile as Record<string, unknown>,
        client,
        existingProgram,
        existingMealPlan,
        measurementRows,
      ));
    } else {
      throw new Error("Invalid action. Use 'generate_program' or 'weekly_evaluation'");
    }

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "رصيد غير كافٍ" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse AI response");
    }

    // Store recommendation
    const recType = action === "generate_program" ? "program" : "evaluation";
    const title = action === "generate_program"
      ? `برنامج مقترح: ${parsed.program?.name || "برنامج جديد"}`
      : `تقييم الأسبوع ${client.week_number}`;

    const { data: rec, error: recErr } = await supabase
      .from("copilot_recommendations")
      .insert({
        trainer_id: user.id,
        client_id: client_id,
        type: recType,
        title: title,
        summary: parsed.summary || "",
        payload: parsed,
        status: "pending",
      })
      .select()
      .single();

    if (recErr) {
      console.error("Failed to store recommendation:", recErr);
      throw new Error("Failed to store recommendation");
    }

    return new Response(JSON.stringify({ recommendation: rec }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("copilot-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function buildEvaluationPrompt(
  profile: Record<string, unknown>,
  client: Record<string, unknown>,
  existingProgram: Record<string, unknown> | null,
  existingMealPlan: Record<string, unknown> | undefined,
  measurements: Record<string, unknown>[],
) {
  const weightTrend = measurements && measurements.length >= 2
    ? Number(measurements[0].weight) - Number(measurements[1].weight)
    : 0;

  const systemPrompt = `أنت مدرب لياقة محترف يعمل بمبادئ NSCA وRPE-based training. حلل تقدم العميل وقدم توصيات علمية محددة.
راعِ: Progressive Overload، Deload timing، Push/Pull balance، وAutoregulation.
أجب بالعربية. الرد يجب أن يكون JSON فقط:
{
  "recommendations": [
    {
      "type": "adjust_calories|swap_exercise|motivational|adjust_weight|rest_day|deload|increase_volume|decrease_volume",
      "title": "عنوان التوصية",
      "description": "وصف مفصل مع السبب العلمي",
      "action_label": "نص الزر",
      "priority": "high|medium|low"
    }
  ],
  "periodization_note": "ملاحظة عن مرحلة التدوير الحالية وما يجب فعله",
  "summary": "ملخص تقييم الأسبوع"
}`;

  const userPrompt = `قيّم تقدم هذا العميل هذا الأسبوع:
- الاسم: ${profile.name}
- الهدف: ${profile.goal}
- الوزن الحالي: ${profile.weight} كجم
- تغير الوزن: ${weightTrend > 0 ? "+" : ""}${weightTrend.toFixed(1)} كجم
- الأسبوع: ${profile.weekNumber}
- TDEE: ${profile.tdee}
- آخر تمرين: ${client.last_workout_date}
- نسبة الدهون: ${profile.bodyFat}%
- مستوى الخبرة: ${profile.experience}

${Number(profile.weekNumber) % 4 === 0 ? "⚠️ هذا أسبوع Deload — يجب تقليل الحجم 40% والشدة" : ""}
${Number(profile.weekNumber) % 4 === 3 ? "📌 الأسبوع القادم Deload — جهز المتدرب نفسياً" : ""}

${existingProgram ? `البرنامج: ${existingProgram.name}` : "لا يوجد برنامج"}
${existingMealPlan ? `خطة التغذية: ${existingMealPlan.name}` : "لا توجد خطة تغذية"}

قدم 2-5 توصيات عملية بناءً على البيانات مع أسباب علمية.`;

  return { systemPrompt, userPrompt };
}
