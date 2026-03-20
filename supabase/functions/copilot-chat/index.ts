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

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error("messages array is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch trainer's clients data (increased to 200)
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, goal, weight, height, age, experience, week_number, last_workout_date, subscription_end_date, days_per_week, injuries, program_id, subscription_price, billing_cycle")
      .eq("trainer_id", user.id)
      .order("name")
      .limit(200);

    const clientIds = (clients || []).map(c => c.id);

    // Fetch body scans, programs, meal plans, and meal logs in parallel
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    let recentScans: any[] = [];
    let programs: any[] = [];
    let programDays: any[] = [];
    let mealPlans: any[] = [];
    let mealItems: any[] = [];
    let mealLogs: any[] = [];

    if (clientIds.length > 0) {
      const [scansRes, programsRes, mealPlansRes] = await Promise.all([
        supabase
          .from("body_scans")
          .select("client_id, weight, body_fat, muscle_mass, bmi, scan_date")
          .in("client_id", clientIds)
          .order("scan_date", { ascending: false })
          .limit(200),
        supabase
          .from("programs")
          .select("id, name, weeks, trainer_id")
          .eq("trainer_id", user.id)
          .limit(200),
        supabase
          .from("meal_plans")
          .select("id, name, client_id, notes")
          .eq("trainer_id", user.id)
          .in("client_id", clientIds)
          .limit(200),
      ]);

      recentScans = scansRes.data || [];
      programs = programsRes.data || [];
      mealPlans = mealPlansRes.data || [];

      // Fetch program days for completion calculation
      const programIds = programs.map(p => p.id);
      if (programIds.length > 0) {
        const { data } = await supabase
          .from("program_days")
          .select("id, program_id, day_name")
          .in("program_id", programIds)
          .limit(500);
        programDays = data || [];
      }

      // Fetch meal items for calorie targets
      const mealPlanIds = mealPlans.map(mp => mp.id);
      if (mealPlanIds.length > 0) {
        const { data } = await supabase
          .from("meal_items")
          .select("id, meal_plan_id, calories, protein, carbs, fats")
          .in("meal_plan_id", mealPlanIds)
          .limit(1000);
        mealItems = data || [];
      }

      // Fetch this week's meal logs
      const { data: logsData } = await supabase
        .from("meal_logs")
        .select("client_id, meal_item_id, logged_at")
        .in("client_id", clientIds)
        .gte("logged_at", weekAgoStr)
        .limit(2000);
      mealLogs = logsData || [];
    }

    // Build lookup maps
    const programMap = new Map(programs.map(p => [p.id, p]));
    const clientMealPlans = new Map<string, any[]>();
    for (const mp of mealPlans) {
      if (mp.client_id) {
        if (!clientMealPlans.has(mp.client_id)) clientMealPlans.set(mp.client_id, []);
        clientMealPlans.get(mp.client_id)!.push(mp);
      }
    }

    // Meal items per plan
    const planItems = new Map<string, any[]>();
    for (const mi of mealItems) {
      if (!planItems.has(mi.meal_plan_id)) planItems.set(mi.meal_plan_id, []);
      planItems.get(mi.meal_plan_id)!.push(mi);
    }

    // Meal item calorie lookup
    const mealItemCalories = new Map<string, number>();
    for (const mi of mealItems) {
      mealItemCalories.set(mi.id, mi.calories || 0);
    }

    // Program days count per program
    const programDayCount = new Map<string, number>();
    for (const pd of programDays) {
      programDayCount.set(pd.program_id, (programDayCount.get(pd.program_id) || 0) + 1);
    }

    // Client meal logs this week
    const clientWeekLogs = new Map<string, number[]>();
    for (const log of mealLogs) {
      if (!clientWeekLogs.has(log.client_id)) clientWeekLogs.set(log.client_id, []);
      const cal = mealItemCalories.get(log.meal_item_id) || 0;
      clientWeekLogs.get(log.client_id)!.push(cal);
    }

    // Build client context
    const clientContext = (clients || []).map(c => {
      const latestScan = recentScans.find(s => s.client_id === c.id);
      const daysInactive = c.last_workout_date
        ? Math.floor((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000)
        : null;
      const subEnd = c.subscription_end_date ? new Date(c.subscription_end_date) : null;
      const subExpired = subEnd && subEnd < now;
      const daysUntilExpiry = subEnd ? Math.ceil((subEnd.getTime() - now.getTime()) / 86400000) : null;

      // Program info
      let programInfo = "";
      if (c.program_id && programMap.has(c.program_id)) {
        const prog = programMap.get(c.program_id)!;
        const totalDays = programDayCount.get(prog.id) || 0;
        const completionPct = prog.weeks > 0 ? Math.min(100, Math.round((c.week_number / prog.weeks) * 100)) : 0;
        programInfo = `\n  برنامج: ${prog.name} | الأسبوع ${c.week_number} من ${prog.weeks} | ${totalDays} يوم تدريب | إنجاز: ${completionPct}%`;
      }

      // Nutrition info
      let nutritionInfo = "";
      const plans = clientMealPlans.get(c.id);
      if (plans && plans.length > 0) {
        const plan = plans[0];
        const items = planItems.get(plan.id) || [];
        const dailyTarget = items.reduce((sum: number, i: any) => sum + (i.calories || 0), 0);
        const logs = clientWeekLogs.get(c.id) || [];
        const totalLogged = logs.reduce((s, cal) => s + cal, 0);
        const daysThisWeek = 7;
        const avgLogged = logs.length > 0 ? Math.round(totalLogged / daysThisWeek) : 0;
        const compliance = dailyTarget > 0 ? Math.min(100, Math.round((avgLogged / dailyTarget) * 100)) : 0;
        nutritionInfo = `\n  تغذية: ${plan.name} | مستهدف: ${dailyTarget} كالوري | متوسط الأسبوع: ${avgLogged} كالوري | التزام: ${compliance}%`;
      }

      // Subscription info
      let subInfo = "";
      if (subExpired) {
        subInfo = ` [اشتراك منتهي]`;
      } else if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
        subInfo = ` [ينتهي خلال ${daysUntilExpiry} يوم]`;
      }
      const priceInfo = c.subscription_price > 0 ? ` | ${c.subscription_price} ر.س/${c.billing_cycle === "monthly" ? "شهر" : c.billing_cycle}` : "";

      return `- ${c.name}: هدف=${c.goal || "غير محدد"}, وزن=${c.weight || latestScan?.weight || "؟"}كجم, عمر=${c.age || "؟"}, خبرة=${c.experience || "مبتدئ"}, آخر تمرين=${daysInactive !== null ? `قبل ${daysInactive} يوم` : "غير معروف"}${subInfo}${priceInfo}${c.injuries ? `, إصابات: ${c.injuries}` : ""}${latestScan ? `, دهون=${latestScan.body_fat}%, عضلات=${latestScan.muscle_mass}كجم` : ""}${programInfo}${nutritionInfo}`;
    }).join("\n");

    const totalClients = (clients || []).length;
    const activeClients = (clients || []).filter(c => {
      const d = c.last_workout_date ? Math.floor((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000) : 999;
      return d <= 7;
    }).length;
    const expiringSoon = (clients || []).filter(c => {
      if (!c.subscription_end_date) return false;
      const days = Math.ceil((new Date(c.subscription_end_date).getTime() - now.getTime()) / 86400000);
      return days >= 0 && days <= 7;
    }).length;

    const systemPrompt = `أنت مساعد ذكي متخصص في اللياقة البدنية والتدريب الشخصي.
تعمل مع مدرب شخصي في السعودية ولديك وصول لبيانات عملائه.

ملخص سريع:
- إجمالي العملاء: ${totalClients}
- نشطين هذا الأسبوع: ${activeClients}
- اشتراكات تنتهي قريباً: ${expiringSoon}

بيانات العملاء الحالية:
${clientContext || "لا يوجد عملاء بعد"}

قواعد مهمة:
- أجب دائماً بالعربية
- كن محدداً وعملياً في توصياتك
- اذكر أسماء العملاء عند الإشارة إليهم
- إذا سُئلت عن عملاء غير نشطين، حدد من لم يتمرن منذ أكثر من 5 أيام
- إذا سُئلت عن الاشتراكات، حدد من ينتهي اشتراكه خلال 7 أيام أو أقل
- إذا سُئلت عن التغذية، استخدم نسبة الالتزام ومتوسط السعرات
- إذا سُئلت عن البرامج، اذكر اسم البرنامج ونسبة الإنجاز والأسبوع الحالي
- قدم نصائح مبنية على أساس علمي
- اقترح تعديلات محددة بأرقام (سعرات، أوزان، تكرارات)
- يمكنك توليد برامج تدريب كاملة إذا طُلب منك
- استخدم أطعمة خليجية محلية في اقتراحات التغذية`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "رصيد غير كافٍ" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("copilot-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
