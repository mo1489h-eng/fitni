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

    // Fetch trainer's clients data for context
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, goal, weight, height, age, experience, week_number, last_workout_date, subscription_end_date, days_per_week, injuries")
      .eq("trainer_id", user.id)
      .order("name")
      .limit(50);

    // Fetch recent body scans
    const clientIds = (clients || []).map(c => c.id);
    let recentScans: any[] = [];
    if (clientIds.length > 0) {
      const { data } = await supabase
        .from("body_scans")
        .select("client_id, weight, body_fat, muscle_mass, bmi, scan_date")
        .in("client_id", clientIds)
        .order("scan_date", { ascending: false })
        .limit(50);
      recentScans = data || [];
    }

    // Build client context
    const clientContext = (clients || []).map(c => {
      const latestScan = recentScans.find(s => s.client_id === c.id);
      const daysInactive = c.last_workout_date
        ? Math.floor((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000)
        : null;
      const subExpired = c.subscription_end_date && new Date(c.subscription_end_date) < new Date();
      return `- ${c.name}: هدف=${c.goal || "غير محدد"}, وزن=${c.weight || latestScan?.weight || "؟"}كجم, عمر=${c.age || "؟"}, أسبوع=${c.week_number}, خبرة=${c.experience || "مبتدئ"}, آخر تمرين=${daysInactive !== null ? `قبل ${daysInactive} يوم` : "غير معروف"}${subExpired ? " [اشتراك منتهي]" : ""}${c.injuries ? `, إصابات: ${c.injuries}` : ""}${latestScan ? `, دهون=${latestScan.body_fat}%, عضلات=${latestScan.muscle_mass}كجم` : ""}`;
    }).join("\n");

    const systemPrompt = `أنت مساعد ذكي متخصص في اللياقة البدنية والتدريب الشخصي.
تعمل مع مدرب شخصي في السعودية ولديك وصول لبيانات عملائه.

بيانات العملاء الحالية:
${clientContext || "لا يوجد عملاء بعد"}

قواعد مهمة:
- أجب دائماً بالعربية
- كن محدداً وعملياً في توصياتك
- اذكر أسماء العملاء عند الإشارة إليهم
- إذا سُئلت عن عملاء غير نشطين، حدد من لم يتمرن منذ أكثر من 5 أيام
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
