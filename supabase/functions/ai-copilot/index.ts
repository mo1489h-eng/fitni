import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CopilotRole = "trainer" | "client";
type CopilotContext =
  | "post_workout"
  | "pre_workout"
  | "general"
  | "program_review"
  | "workout_builder";

type ChatMessage = { role: "user" | "assistant"; content: string };

function jsonErr(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveUserRole(
  admin: SupabaseClient,
  userId: string
): Promise<{ role: CopilotRole; trainerId: string | null; clientRowId: string | null }> {
  const { data: profile } = await admin.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (profile) return { role: "trainer", trainerId: userId, clientRowId: null };

  const { data: client } = await admin.from("clients").select("id").eq("auth_user_id", userId).maybeSingle();
  if (client?.id) return { role: "client", trainerId: null, clientRowId: client.id };

  return { role: "trainer", trainerId: null, clientRowId: null };
}

function hoursAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

function buildTrainerSystemPrompt(
  trainerName: string,
  bundle: string,
  context: CopilotContext | undefined
): string {
  const ctxLine =
    context === "post_workout"
      ? "سياق المحادثة: تحليل بعد انتهاء تمرين — ركّز على الملخص والتوصيات العملية."
      : context === "program_review"
        ? "سياق المحادثة: مراجعة برنامج — ركّز على التدرج والتعديلات."
        : "";

  return `أنت "CoachBase AI Assistant" — المساعد الذكي الرسمي لمنصة CoachBase للتدريب الشخصي في المملكة العربية السعودية.

## هويتك
- عالم تدريب وبيانات — تتحدث العربية الخليجية بوضوح وودٍّ
- تستخدم فقط البيانات أدناه — لا تخترع أرقاماً أو أسماء
- إجابات دقيقة، عملية، قابلة للتنفيذ
- ابدأ بالإجابة المباشرة، ثم ادعم بالأرقام من السجل، ثم توصية واحدة في النهاية

## المدرب
الاسم: ${trainerName}
${ctxLine}

## بيانات المنصة (ملخص)
${bundle}

## قواعد
- إذا لم تتوفر بيانة، قل ذلك صراحة
- لا تذكر أنك نموذج لغوي خارجي — أنت CoachBase AI Assistant
`;
}

function buildClientSystemPrompt(
  clientName: string,
  bundle: string,
  context: CopilotContext | undefined
): string {
  const ctxLine =
    context === "post_workout"
      ? "سياق المحادثة: المتدرب أنهى للتو تمريناً — شجّعه وحلل الأداء بناءً على البيانات."
      : "";

  return `أنت "CoachBase AI Assistant" — المساعد الذكي لمنصة CoachBase.

## هويتك
- مدرب ومحلل بيانات — عربي خليجي واضح
- تستخدم فقط البيانات أدناه
- شجيعٌ لكن صادق بالأرقام

## المتدرب
${clientName}
${ctxLine}

## بياناته
${bundle}

## قواعد
- لا تخترع أرقاماً
- توصية عملية واحدة عند الانتهاء من الإجابة المباشرة
`;
}

async function fetchTrainerBundle(
  admin: SupabaseClient,
  trainerId: string,
  selectedClientId: string | undefined
): Promise<string> {
  const { data: trainer } = await admin
    .from("profiles")
    .select("full_name, subscription_plan, created_at")
    .eq("user_id", trainerId)
    .maybeSingle();

  const { data: clients } = await admin
    .from("clients")
    .select(
      "id, name, goal, phone, subscription_end_date, week_number, created_at, last_active_at, last_workout_date"
    )
    .eq("trainer_id", trainerId)
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(80);

  const now = Date.now();
  const lines: string[] = [];
  lines.push(`المدرب: ${trainer?.full_name ?? "—"} | الخطة: ${trainer?.subscription_plan ?? "—"}`);

  const atRisk: string[] = [];
  const expiring: string[] = [];

  for (const c of clients ?? []) {
    const last = c.last_workout_date || c.last_active_at;
    const h = hoursAgo(last);
    const days = h == null ? null : Math.floor(h / 24);
    if (days != null && days >= 3) atRisk.push(`${c.name} (${days} يوم بدون تمرين مسجل)`);

    const sub = c.subscription_end_date ? new Date(c.subscription_end_date).getTime() : null;
    if (sub != null) {
      const dLeft = Math.ceil((sub - now) / 86400000);
      if (dLeft >= 0 && dLeft <= 7) expiring.push(`${c.name} (${dLeft} يوم حتى انتهاء الاشتراك)`);
    }
  }

  lines.push(
    `\nعملاء (${(clients ?? []).length}):`,
    (clients ?? [])
      .slice(0, 25)
      .map((c) => {
        const h = hoursAgo(c.last_workout_date || c.last_active_at);
        const lastStr = h == null ? "لا يوجد" : `${Math.floor(h)} ساعة مضت`;
        return `- ${c.name}: الهدف "${c.goal ?? "—"}" | آخر نشاط مسجل: ${lastStr} | أسبوع ${c.week_number ?? "—"}`;
      })
      .join("\n")
  );

  if (atRisk.length) lines.push(`\n⚠️ لم يتدربوا 3+ أيام (تقريباً من آخر تمرين): ${atRisk.join("، ")}`);
  if (expiring.length) lines.push(`\n📅 اشتراكات تنتهي خلال 7 أيام: ${expiring.join("، ")}`);

  if (selectedClientId) {
    const owns = (clients ?? []).some((c) => c.id === selectedClientId);
    if (!owns) {
      lines.push("\n(العميل المحدد غير موجود ضمن قائمة هذا المدرب — تجاهل التفاصيل الخاصة)");
    } else {
      const { data: sessions } = await admin
        .from("workout_sessions")
        .select(
          `
          started_at, completed_at, total_volume,
          workout_session_exercises (
            weight_used, reps_completed, set_number,
            program_exercises ( name, reps, weight, exercise_library ( muscle_group ) )
          )
        `
        )
        .eq("client_id", selectedClientId)
        .order("started_at", { ascending: false })
        .limit(10);

      const cRow = (clients ?? []).find((c) => c.id === selectedClientId);
      lines.push(`\n## عميل محدد: ${cRow?.name ?? "—"}`);
      lines.push(`الهدف: ${cRow?.goal ?? "—"}`);

      let i = 1;
      for (const s of sessions ?? []) {
        const vol = s.total_volume ?? 0;
        const d = s.started_at ? new Date(s.started_at).toLocaleDateString("ar-SA") : "—";
        lines.push(`تمرين ${i}: ${d} — الحجم الكلي ${vol} كجم`);
        const ex = (s.workout_session_exercises as unknown[]) ?? [];
        const top = ex.slice(0, 6);
        for (const row of top) {
          const r = row as {
            weight_used: number | null;
            reps_completed: number | null;
            program_exercises: {
              name: string;
              exercise_library: { muscle_group: string | null } | null;
            } | null;
          };
          const pe = r.program_exercises;
          const mg = pe?.exercise_library?.muscle_group ?? "—";
          lines.push(
            `  - ${pe?.name ?? "تمرين"}: ${r.weight_used ?? "—"} كجم × ${r.reps_completed ?? "—"} (${mg})`
          );
        }
        i++;
        if (i > 4) break;
      }
    }
  }

  return lines.join("\n");
}

async function fetchClientBundle(admin: SupabaseClient, clientId: string): Promise<string> {
  const { data: client } = await admin
    .from("clients")
    .select(
      `
      name, goal, week_number, subscription_end_date, last_workout_date, program_id,
      programs (
        name, weeks,
        program_days (
          day_order, day_name,
          program_exercises (
            name, sets, reps, weight, rest_seconds,
            exercise_library ( description, muscle_group, video_url )
          )
        )
      )
    `
    )
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return "لا توجد بيانات عميل.";

  const { data: recent } = await admin
    .from("workout_sessions")
    .select(
      `
      started_at, completed_at, total_volume,
      workout_session_exercises (
        weight_used, reps_completed, set_number,
        program_exercises ( name, reps, weight, exercise_library ( muscle_group ) )
      )
    `
    )
    .eq("client_id", clientId)
    .order("started_at", { ascending: false })
    .limit(5);

  const lines: string[] = [];
  lines.push(`الاسم: ${client.name}`);
  lines.push(`الهدف: ${client.goal} | الأسبوع ${client.week_number}`);
  lines.push(`آخر تمرين مسجل: ${client.last_workout_date ?? "—"}`);

  lines.push("\nآخر الجلسات:");
  let i = 1;
  for (const s of recent ?? []) {
    const d = s.started_at ? new Date(s.started_at).toLocaleDateString("ar-SA") : "—";
    lines.push(`${i}. ${d} — الحجم ${s.total_volume ?? 0} كجم`);
    i++;
  }

  const prog = client.programs as { name?: string; program_days?: unknown[] } | null;
  if (prog?.name) {
    lines.push(`\nالبرنامج الحالي: ${prog.name}`);
    const days = prog.program_days ?? [];
    lines.push(`عدد أيام التمرين في البرنامج: ${days.length}`);
  }

  return lines.join("\n");
}

function parseOpenAIStreamChunk(line: string): string {
  const t = line.trim();
  if (!t.startsWith("data:")) return "";
  const payload = t.slice(5).trim();
  if (payload === "[DONE]") return "";
  try {
    const j = JSON.parse(payload) as {
      choices?: { delta?: { content?: string } }[];
    };
    return j.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonErr("مطلوب تسجيل الدخول", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData.user) return jsonErr("غير مصرّح", 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as {
      role?: CopilotRole;
      message?: string;
      clientId?: string;
      conversationId?: string;
      context?: CopilotContext;
    };

    const message = (body.message ?? "").trim();
    if (!message) return jsonErr("الرسالة فارغة");

    /** Workout builder: JSON program refactor via Gemini (server-side key only). */
    if (body.context === "workout_builder") {
      const resolved = await resolveUserRole(admin, userId);
      if (!resolved.trainerId) {
        return jsonErr("هذه الميزة للمدربين فقط", 403);
      }
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiKey) {
        return jsonErr("خدمة الذكاء غير مهيأة", 503);
      }
      const model = "gemini-1.5-flash";
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const gemRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });
      if (!gemRes.ok) {
        const t = await gemRes.text();
        console.error("ai-copilot workout_builder gemini", gemRes.status, t);
        return jsonErr("تعذّر الاتصال بالذكاء الاصطناعي. حاول لاحقاً.", 502);
      }
      const gemJson = (await gemRes.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text =
        gemJson.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text.trim()) {
        return jsonErr("رد الذكاء فارغ", 502);
      }
      return new Response(JSON.stringify({ reply: text.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolved = await resolveUserRole(admin, userId);
    const effectiveRole: CopilotRole | null = resolved.trainerId
      ? "trainer"
      : resolved.clientRowId
        ? "client"
        : null;
    if (!effectiveRole) return jsonErr("لم يُعثر على حساب مدرب أو متدرب", 403);

    let scopeClientId: string | null = null;
    if (effectiveRole === "trainer") {
      scopeClientId = body.clientId ?? null;
      if (scopeClientId) {
        const { data: ok } = await admin
          .from("clients")
          .select("id")
          .eq("id", scopeClientId)
          .eq("trainer_id", userId)
          .maybeSingle();
        if (!ok) return jsonErr("العميل غير موجود أو غير تابع لك", 403);
      }
    } else {
      scopeClientId = resolved.clientRowId;
      if (!scopeClientId) return jsonErr("لم يُعثر على ملف المتدرب", 403);
    }

    const ctx = body.context ?? "general";

    let systemPrompt = "";
    if (effectiveRole === "trainer") {
      const bundle = await fetchTrainerBundle(admin, userId, scopeClientId ?? undefined);
      const { data: tr } = await admin.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
      systemPrompt = buildTrainerSystemPrompt(tr?.full_name ?? "المدرب", bundle, ctx);
    } else {
      const bundle = await fetchClientBundle(admin, scopeClientId!);
      const { data: cl } = await admin.from("clients").select("name").eq("id", scopeClientId!).maybeSingle();
      systemPrompt = buildClientSystemPrompt(cl?.name ?? "المتدرب", bundle, ctx);
    }

    let conversationId = body.conversationId ?? null;
    if (!conversationId) {
      let existingQuery = admin
        .from("copilot_conversations")
        .select("id, messages")
        .eq("user_id", userId)
        .eq("role", effectiveRole);
      existingQuery = scopeClientId ? existingQuery.eq("client_id", scopeClientId) : existingQuery.is("client_id", null);
      const { data: existing } = await existingQuery.maybeSingle();

      if (existing?.id) {
        conversationId = existing.id;
      } else {
        const { data: inserted, error: insErr } = await admin
          .from("copilot_conversations")
          .insert({
            user_id: userId,
            role: effectiveRole,
            client_id: scopeClientId,
            messages: [] as unknown as ChatMessage[],
          })
          .select("id")
          .single();
        if (insErr) {
          console.error("copilot insert", insErr);
          return jsonErr("تعذّر حفظ المحادثة", 500);
        }
        conversationId = inserted!.id as string;
      }
    }

    const { data: convRow } = await admin
      .from("copilot_conversations")
      .select("id, messages")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!convRow) return jsonErr("المحادثة غير موجودة", 404);

    const prev = (Array.isArray(convRow.messages) ? convRow.messages : []) as ChatMessage[];
    const trimmed = prev.slice(-10);
    const userMsg: ChatMessage = { role: "user", content: message };
    const nextAfterUser = [...trimmed, userMsg];

    await admin
      .from("copilot_conversations")
      .update({
        messages: nextAfterUser as unknown as Record<string, unknown>[],
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    const openAiMessages = nextAfterUser.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonErr("خدمة الذكاء غير مهيأة", 503);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...openAiMessages],
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.9,
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const t = await aiRes.text();
      console.error("ai-copilot upstream", aiRes.status, t);
      return jsonErr("تعذّر الاتصال بالذكاء الاصطناعي. حاول لاحقاً.", 502);
    }

    const reader = aiRes.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let assistantAcc = "";

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          if (buf.trim()) {
            for (const line of buf.split("\n")) {
              assistantAcc += parseOpenAIStreamChunk(line);
            }
            buf = "";
          }
          const assistantMsg: ChatMessage = { role: "assistant", content: assistantAcc };
          const finalMsgs = [...nextAfterUser, assistantMsg].slice(-50);
          await admin
            .from("copilot_conversations")
            .update({
              messages: finalMsgs as unknown as Record<string, unknown>[],
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
          controller.close();
          return;
        }
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const line of parts) {
          assistantAcc += parseOpenAIStreamChunk(line);
        }
        controller.enqueue(value);
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Copilot-Conversation-Id": conversationId!,
      },
    });
  } catch (e) {
    console.error("ai-copilot", e);
    return jsonErr(e instanceof Error ? e.message : "خطأ غير متوقع", 500);
  }
});
