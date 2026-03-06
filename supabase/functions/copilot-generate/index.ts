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

    // Build AI prompt based on action
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const clientProfile = {
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

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "generate_program") {
      systemPrompt = `أنت مدرب لياقة بدنية محترف وخبير تغذية متخصص في المنطقة الخليجية. مهمتك إنشاء برامج تدريب وتغذية مخصصة 100% لاحتياج كل عميل.

قواعد مهمة:
- البرنامج يجب أن يكون مبني بالكامل على هدف العميل (خسارة دهون / بناء عضل / لياقة عامة / تضخيم)
- إذا الهدف خسارة دهون: ركّز على تمارين مركبة + كارديو + عجز سعراتي
- إذا الهدف بناء عضل: ركّز على تمارين ثقيلة + progressive overload + فائض سعراتي
- إذا الهدف لياقة: مزيج متوازن من مقاومة وكارديو
- راعِ عمر العميل ومستوى نشاطه في اختيار التمارين والأوزان
- استخدم أطعمة خليجية محلية (كبسة، مندي، شاورما، فول، تمر، جبنة بيضاء، خبز عربي) بجانب أطعمة صحية عامة
- السعرات يجب أن تتناسب مع TDEE والهدف
- اسم البرنامج يجب أن يعكس هدف العميل

أجب دائماً بالعربية. الرد JSON فقط بدون أي نص إضافي:
{
  "program": {
    "name": "اسم يعكس الهدف",
    "weeks": 12,
    "days": [
      {
        "day_name": "اسم اليوم (مثلاً: صدر + ترايسبس)",
        "day_order": 0,
        "exercises": [
          { "name": "اسم التمرين", "sets": 3, "reps": 12, "weight": 0, "exercise_order": 0 }
        ]
      }
    ]
  },
  "meal_plan": {
    "name": "اسم خطة التغذية",
    "notes": "ملاحظات: إجمالي السعرات اليومية وتوزيع الماكروز",
    "meals": [
      { "meal_name": "الفطور", "food_name": "اسم الطعام", "calories": 300, "protein": 25, "carbs": 30, "fats": 10, "quantity": "الكمية", "item_order": 0 }
    ]
  },
  "summary": "ملخص: لماذا هذا البرنامج مناسب لهذا العميل تحديداً"
}`;

      const goalContext = clientProfile.goal.includes("خسارة") || clientProfile.goal.includes("نزول") || clientProfile.goal.includes("تنشيف")
        ? "الهدف خسارة دهون — ركز على عجز سعراتي معتدل (300-500 سعرة تحت TDEE) وتمارين مركبة مكثفة مع كارديو."
        : clientProfile.goal.includes("تضخيم") || clientProfile.goal.includes("بناء") || clientProfile.goal.includes("عضل")
        ? "الهدف بناء عضلات — ركز على فائض سعراتي (300-500 فوق TDEE) وتمارين ثقيلة مع progressive overload."
        : "الهدف لياقة عامة — برنامج متوازن بين مقاومة وكارديو مع سعرات صيانة.";

      userPrompt = `أنشئ برنامج تدريب وخطة تغذية مخصصة بالكامل لهذا العميل:

📋 بيانات العميل:
- الاسم: ${clientProfile.name}
- الهدف: ${clientProfile.goal}
- الوزن: ${clientProfile.weight} كجم
- الطول: ${clientProfile.height} سم
- العمر: ${clientProfile.age}
- الجنس: ${clientProfile.gender === "male" ? "ذكر" : clientProfile.gender === "female" ? "أنثى" : "غير محدد"}
- نسبة الدهون: ${clientProfile.bodyFat}%
- BMI: ${clientProfile.bmi}
- مستوى النشاط: ${clientProfile.activityLevel}
- TDEE: ${clientProfile.tdee} سعرة
- الأسبوع الحالي: ${clientProfile.weekNumber}
- مستوى الخبرة: ${clientProfile.experience}
- أيام التدريب في الأسبوع: ${clientProfile.daysPerWeek}
${clientProfile.injuries ? `- إصابات أو قيود: ${clientProfile.injuries}` : ""}
${clientProfile.equipment ? `- الأدوات المتوفرة: ${clientProfile.equipment}` : ""}

🎯 توجيه الهدف:
${goalContext}

${existingProgram ? `📌 البرنامج الحالي: ${existingProgram.name} (${existingProgram.weeks} أسابيع) — أنشئ برنامج محدث وأفضل` : "لا يوجد برنامج حالي — أنشئ برنامج من الصفر"}

أنشئ ${clientProfile.daysPerWeek} أيام تدريب مع تقسيم عضلي مناسب للهدف والمستوى.
${clientProfile.injuries ? `⚠️ تجنب التمارين التي تؤثر على: ${clientProfile.injuries}` : ""}
${clientProfile.equipment ? `🏋️ استخدم فقط: ${clientProfile.equipment}` : ""}
أضف 5-7 وجبات يومية مع الماكروز المحسوبة بدقة بناءً على TDEE والهدف.
اقترح أوزان مبدئية مناسبة لمستوى ${clientProfile.experience}.`;

    } else if (action === "weekly_evaluation") {
      systemPrompt = `أنت مدرب لياقة محترف. حلل تقدم العميل وقدم توصيات محددة.
أجب بالعربية. الرد يجب أن يكون JSON فقط:
{
  "recommendations": [
    {
      "type": "adjust_calories|swap_exercise|motivational|adjust_weight|rest_day",
      "title": "عنوان التوصية",
      "description": "وصف مفصل",
      "action_label": "نص الزر",
      "priority": "high|medium|low"
    }
  ],
  "summary": "ملخص تقييم الأسبوع"
}`;

      const weightTrend = measurements && measurements.length >= 2
        ? Number(measurements[0].weight) - Number(measurements[1].weight)
        : 0;

      userPrompt = `قيّم تقدم هذا العميل هذا الأسبوع:
- الاسم: ${clientProfile.name}
- الهدف: ${clientProfile.goal}
- الوزن الحالي: ${clientProfile.weight} كجم
- تغير الوزن: ${weightTrend > 0 ? "+" : ""}${weightTrend.toFixed(1)} كجم
- الأسبوع: ${clientProfile.weekNumber}
- TDEE: ${clientProfile.tdee}
- آخر تمرين: ${client.last_workout_date}
- نسبة الدهون: ${clientProfile.bodyFat}%

${existingProgram ? `البرنامج: ${existingProgram.name}` : "لا يوجد برنامج"}
${existingMealPlan ? `خطة التغذية: ${existingMealPlan.name}` : "لا توجد خطة تغذية"}

قدم 2-4 توصيات عملية بناءً على البيانات.`;
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

    // Parse JSON from response (handle markdown code blocks)
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
