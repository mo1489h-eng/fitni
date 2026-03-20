import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { client_id } = await req.json();
    if (!client_id) throw new Error("client_id is required");

    // Fetch client
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .eq("trainer_id", user.id)
      .maybeSingle();
    if (clientErr || !client) throw new Error("Client not found");

    // Fetch body scans (last 2 months)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const { data: scans } = await supabase
      .from("body_scans")
      .select("*")
      .eq("client_id", client_id)
      .gte("scan_date", twoMonthsAgo.toISOString())
      .order("scan_date", { ascending: true });

    // Fetch measurements
    const { data: measurements } = await supabase
      .from("measurements")
      .select("*")
      .eq("client_id", client_id)
      .gte("recorded_at", twoMonthsAgo.toISOString().split("T")[0])
      .order("recorded_at", { ascending: true });

    // Fetch sessions this month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const { data: sessions } = await supabase
      .from("trainer_sessions")
      .select("*")
      .eq("client_id", client_id)
      .eq("trainer_id", user.id)
      .gte("session_date", oneMonthAgo.toISOString().split("T")[0]);

    // Fetch meal logs
    const { data: mealLogs } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("client_id", client_id)
      .gte("logged_at", oneMonthAgo.toISOString().split("T")[0]);

    // Fetch moods
    const { data: moods } = await supabase
      .from("client_moods")
      .select("*")
      .eq("client_id", client_id)
      .gte("mood_date", oneMonthAgo.toISOString().split("T")[0]);

    // Fetch current program
    let program = null;
    if (client.program_id) {
      const { data } = await supabase
        .from("programs")
        .select("name, weeks, program_days(day_name, program_exercises(name))")
        .eq("id", client.program_id)
        .maybeSingle();
      program = data;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const firstScan = scans && scans.length > 0 ? scans[0] : null;
    const lastScan = scans && scans.length > 0 ? scans[scans.length - 1] : null;
    const firstWeight = measurements && measurements.length > 0 ? measurements[0].weight : client.weight;
    const lastWeight = measurements && measurements.length > 0 ? measurements[measurements.length - 1].weight : client.weight;

    const sessionsCount = sessions?.length || 0;
    const expectedSessions = (client.days_per_week || 4) * 4;
    const consistencyPct = expectedSessions > 0 ? Math.round((sessionsCount / expectedSessions) * 100) : 0;
    const mealLogsCount = mealLogs?.length || 0;
    const moodSummary = moods && moods.length > 0
      ? moods.reduce((acc: Record<string, number>, m: any) => { acc[m.mood] = (acc[m.mood] || 0) + 1; return acc; }, {})
      : {};

    const prompt = `أنت خبير لياقة بدنية. حلل بيانات الشهر الماضي لهذا العميل وأنشئ تقريراً شاملاً.

بيانات العميل:
- الاسم: ${client.name}
- الهدف: ${client.goal}
- الأسبوع: ${client.week_number}
- البرنامج: ${program?.name || "غير محدد"}

التقدم الجسدي:
- الوزن: ${firstWeight || "؟"} → ${lastWeight || "؟"} كجم
${firstScan && lastScan ? `- الدهون: ${firstScan.body_fat}% → ${lastScan.body_fat}%
- العضلات: ${firstScan.muscle_mass} → ${lastScan.muscle_mass} كجم
- BMI: ${firstScan.bmi} → ${lastScan.bmi}` : "- لا توجد بيانات سكان جسم"}

الالتزام:
- الجلسات المكتملة: ${sessionsCount} من ${expectedSessions} متوقعة (${consistencyPct}%)
- سجلات الوجبات: ${mealLogsCount} وجبة مسجلة

المزاج: ${Object.entries(moodSummary).map(([k, v]) => `${k}: ${v}`).join(", ") || "لا توجد بيانات"}

أنشئ تقريراً بصيغة JSON:
{
  "performance_score": (0-100),
  "score_color": "green|yellow|red",
  "summary": "ملخص عام للشهر في 2-3 جمل",
  "physical_progress": {
    "weight_change": number,
    "body_fat_change": number|null,
    "muscle_change": number|null,
    "analysis": "تحليل التقدم الجسدي"
  },
  "training_consistency": {
    "completed": number,
    "expected": number,
    "percentage": number,
    "best_week": "وصف أفضل أسبوع",
    "analysis": "تحليل الالتزام"
  },
  "nutrition": {
    "meals_logged": number,
    "analysis": "تحليل التغذية"
  },
  "achievements": ["إنجاز 1", "إنجاز 2"],
  "next_month_goals": [
    { "goal": "هدف محدد", "details": "تفاصيل" }
  ],
  "motivational_message": "رسالة تحفيزية مخصصة للعميل"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت خبير لياقة ومدرب محترف. أجب بالعربية. الرد JSON فقط." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "رصيد غير كافٍ" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse:", rawContent);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify({
      report: parsed,
      client_name: client.name,
      month: new Date().toLocaleDateString("ar-SA", { month: "long", year: "numeric" }),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("copilot-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
