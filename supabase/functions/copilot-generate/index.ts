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

    // Fetch latest body scan
    const { data: scans } = await supabase
      .from("body_scans")
      .select("*")
      .eq("client_id", client_id)
      .order("scan_date", { ascending: false })
      .limit(1);
    const scan = scans?.[0];

    // Fetch latest measurements
    const { data: measurements } = await supabase
      .from("measurements")
      .select("*")
      .eq("client_id", client_id)
      .order("recorded_at", { ascending: false })
      .limit(5);

    // Fetch existing program if any
    let existingProgram = null;
    if (client.program_id) {
      const { data } = await supabase
        .from("programs")
        .select("*, program_days(*, program_exercises(*))")
        .eq("id", client.program_id)
        .maybeSingle();
      existingProgram = data;
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

    const clientProfile = buildClientProfile(client, scan, measurements || []);

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "generate_program") {
      ({ systemPrompt, userPrompt } = buildProgramPrompt(clientProfile, existingProgram));
    } else if (action === "weekly_evaluation") {
      ({ systemPrompt, userPrompt } = buildEvaluationPrompt(clientProfile, client, existingProgram, existingMealPlan, measurements || []));
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Helpers ──

function buildClientProfile(client: any, scan: any, measurements: any[]) {
  return {
    name: client.name,
    goal: client.goal,
    weight: client.weight || scan?.weight || measurements?.[0]?.weight || "unknown",
    height: client.height || scan?.height || "unknown",
    age: client.age || scan?.age || "unknown",
    gender: scan?.gender || "unknown",
    bodyFat: scan?.body_fat || "unknown",
    bmi: scan?.bmi || "unknown",
    activityLevel: scan?.activity_level || "unknown",
    tdee: scan?.tdee || "unknown",
    weekNumber: client.week_number,
    experience: client.experience || "مبتدئ",
    daysPerWeek: client.days_per_week || 4,
    injuries: client.injuries || null,
    equipment: client.preferred_equipment || null,
  };
}

function getPeriodizationType(experience: string): string {
  if (experience === "مبتدئ") return "linear";
  if (experience === "متوسط") return "undulating";
  return "block";
}

function buildProgramPrompt(profile: any, existingProgram: any) {
  const periodization = getPeriodizationType(profile.experience);
  const periodizationLabel = periodization === "linear" ? "خطي (Linear)" : periodization === "undulating" ? "متموج (Undulating)" : "كتلي (Block)";

  const goalContext = profile.goal.includes("خسارة") || profile.goal.includes("نزول") || profile.goal.includes("تنشيف")
    ? "الهدف خسارة دهون — عجز سعراتي معتدل (300-500 سعرة تحت TDEE) وتمارين مركبة مكثفة مع كارديو. حجم تدريبي عالي (15-20 سيت/جلسة)، شدة متوسطة-عالية."
    : profile.goal.includes("تضخيم") || profile.goal.includes("بناء") || profile.goal.includes("عضل")
    ? "الهدف بناء عضلات — فائض سعراتي (300-500 فوق TDEE) وتمارين ثقيلة مع progressive overload. حجم تدريبي متوسط (12-16 سيت/جلسة)، شدة عالية."
    : "الهدف لياقة عامة — برنامج متوازن بين مقاومة وكارديو مع سعرات صيانة. حجم متوسط، شدة متوسطة.";

  const systemPrompt = `أنت مدرب لياقة بدنية محترف وخبير تغذية متخصص في المنطقة الخليجية. تعمل بناءً على مبادئ علمية من:
- Secrets of Successful Program Design (NSCA)
- RPE-based training و autoregulation
- Movement patterns: Push/Pull/Hinge/Squat/Carry balance

قواعد البرمجة العلمية:
1. التدرج في الحمل (Progressive Overload): زيادة الوزن أو التكرارات أسبوعياً بنسبة 2-5%
2. نمط التدوير (Periodization): استخدم ${periodizationLabel} بناءً على مستوى المتدرب
3. أسبوع تخفيف (Deload): كل أسبوع 4 يكون deload بتقليل الحجم 40% والشدة 10%
4. توازن الحركات: نسبة Push:Pull = 1:1 تقريباً
5. توزيع الحجم: 10-20 سيت/عضلة/أسبوع حسب المستوى
6. RPE: استخدم RPE لكل تمرين (6-10) لضبط الشدة
7. Tempo: أضف tempo للتمارين المركبة (eccentric-pause-concentric-pause)
8. راحة: 60-90ث للعزل، 120-180ث للمركبة
9. إحماء: أضف 2-3 تمارين إحماء لكل يوم

أجب دائماً بالعربية. الرد JSON فقط بدون أي نص إضافي:
{
  "program": {
    "name": "اسم يعكس الهدف",
    "weeks": 12,
    "periodization": "${periodization}",
    "days": [
      {
        "day_name": "اسم اليوم (مثلاً: صدر + ترايسبس)",
        "day_order": 0,
        "movement_balance": "push/pull/legs/full",
        "warmup": [
          { "name": "تمرين إحماء", "sets": 2, "reps": 15, "weight": 0, "rest_seconds": 30, "tempo": "", "rpe": null, "notes": "إحماء", "is_warmup": true }
        ],
        "exercises": [
          { "name": "اسم التمرين", "sets": 3, "reps": 12, "weight": 0, "rest_seconds": 90, "tempo": "3-1-1-0", "rpe": 7, "notes": "", "is_warmup": false, "exercise_order": 0, "superset_group": null }
        ]
      }
    ],
    "weekly_progression": {
      "week1": "تأسيس - RPE 6-7",
      "week2": "زيادة حجم 5%",
      "week3": "زيادة شدة - RPE 8-9",
      "week4": "Deload - تقليل 40% حجم"
    }
  },
  "meal_plan": {
    "name": "اسم خطة التغذية",
    "notes": "ملاحظات: إجمالي السعرات اليومية وتوزيع الماكروز",
    "meals": [
      { "meal_name": "الفطور", "food_name": "اسم الطعام", "calories": 300, "protein": 25, "carbs": 30, "fats": 10, "quantity": "الكمية", "item_order": 0 }
    ]
  },
  "summary": "ملخص علمي: لماذا هذا البرنامج مناسب + نوع التدوير المستخدم + خطة التدرج"
}`;

  const userPrompt = `أنشئ برنامج تدريب وخطة تغذية مخصصة علمياً لهذا العميل:

📋 بيانات العميل:
- الاسم: ${profile.name}
- الهدف: ${profile.goal}
- الوزن: ${profile.weight} كجم
- الطول: ${profile.height} سم
- العمر: ${profile.age}
- الجنس: ${profile.gender === "male" ? "ذكر" : profile.gender === "female" ? "أنثى" : "غير محدد"}
- نسبة الدهون: ${profile.bodyFat}%
- BMI: ${profile.bmi}
- مستوى النشاط: ${profile.activityLevel}
- TDEE: ${profile.tdee} سعرة
- الأسبوع الحالي: ${profile.weekNumber}
- مستوى الخبرة: ${profile.experience}
- أيام التدريب في الأسبوع: ${profile.daysPerWeek}
${profile.injuries ? `- إصابات أو قيود: ${profile.injuries}` : ""}
${profile.equipment ? `- الأدوات المتوفرة: ${profile.equipment}` : ""}

🎯 توجيه الهدف:
${goalContext}

📐 نوع التدوير المطلوب: ${periodizationLabel}

${existingProgram ? `📌 البرنامج الحالي: ${existingProgram.name} (${existingProgram.weeks} أسابيع) — أنشئ برنامج محدث وأفضل` : "لا يوجد برنامج حالي — أنشئ برنامج من الصفر"}

متطلبات علمية:
1. أنشئ ${profile.daysPerWeek} أيام تدريب مع تقسيم عضلي متوازن Push/Pull
2. أضف 2-3 تمارين إحماء لكل يوم (is_warmup: true)
3. استخدم RPE مناسب لمستوى ${profile.experience}
4. أضف tempo للتمارين المركبة الرئيسية
5. اضبط أوقات الراحة (60-90ث عزل، 120-180ث مركبة)
6. الأسبوع 4 = Deload (ذكر ذلك في weekly_progression)
7. اقترح أوزان مبدئية مناسبة
${profile.injuries ? `⚠️ تجنب التمارين التي تؤثر على: ${profile.injuries}` : ""}
${profile.equipment ? `🏋️ استخدم فقط: ${profile.equipment}` : ""}
8. أضف 5-7 وجبات يومية مع الماكروز بناءً على TDEE والهدف
9. استخدم أطعمة خليجية محلية`;

  return { systemPrompt, userPrompt };
}

function buildEvaluationPrompt(profile: any, client: any, existingProgram: any, existingMealPlan: any, measurements: any[]) {
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

${profile.weekNumber % 4 === 0 ? "⚠️ هذا أسبوع Deload — يجب تقليل الحجم 40% والشدة" : ""}
${profile.weekNumber % 4 === 3 ? "📌 الأسبوع القادم Deload — جهز المتدرب نفسياً" : ""}

${existingProgram ? `البرنامج: ${existingProgram.name}` : "لا يوجد برنامج"}
${existingMealPlan ? `خطة التغذية: ${existingMealPlan.name}` : "لا توجد خطة تغذية"}

قدم 2-5 توصيات عملية بناءً على البيانات مع أسباب علمية.`;

  return { systemPrompt, userPrompt };
}
