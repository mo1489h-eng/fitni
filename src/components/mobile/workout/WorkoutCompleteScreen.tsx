import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Home, Share2, Save } from "lucide-react";
import { useWorkoutSession, setKey } from "./WorkoutSessionContext";
import { totalSetsInPlan } from "@/lib/workoutDayPlan";
import { useCopilot } from "../copilot/useCopilot";
import { CB } from "./designTokens";

function formatMmSs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function WorkoutCompleteScreen() {
  const {
    plan,
    programName,
    completed,
    elapsedMs,
    totalVolume,
    totalSetsLogged,
    sessionId,
    clientId,
    finalizeWorkout,
    finalizeAndExit,
  } = useWorkoutSession();

  const { openCopilot } = useCopilot();
  const copilotAutoSent = useRef(false);

  const [persisted, setPersisted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || persisted) return;
    void (async () => {
      try {
        await finalizeWorkout();
        setPersisted(true);
      } catch (e) {
        setSaveError((e as Error).message);
      }
    })();
  }, [sessionId, persisted, finalizeWorkout]);

  const exercisesPlanned = plan.length;
  const exercisesDone = useMemo(() => {
    return plan.filter((ex) => {
      for (let s = 1; s <= ex.sets; s++) {
        if (!completed[setKey(ex.exerciseId, s)]) return false;
      }
      return true;
    }).length;
  }, [plan, completed]);

  const totalSetsPlanned = totalSetsInPlan(plan);

  const { data: prList = [] } = useQuery({
    queryKey: ["workout-prs", sessionId, clientId, persisted, completed, plan],
    queryFn: async () => {
      if (!sessionId || !clientId || !persisted) return [];
      const { data: s } = await supabase.from("workout_sessions").select("started_at").eq("id", sessionId).single();
      const started = s?.started_at;
      if (!started) return [];
      const prs: { name: string; weight: number }[] = [];
      for (const ex of plan) {
        let curMax = 0;
        for (let sn = 1; sn <= ex.sets; sn++) {
          const c = completed[setKey(ex.exerciseId, sn)];
          if (c) curMax = Math.max(curMax, c.weight);
        }
        if (curMax <= 0) continue;
        const { data: hist } = await supabase
          .from("workout_logs")
          .select("actual_weight")
          .eq("client_id", clientId)
          .eq("exercise_id", ex.exerciseId)
          .lt("logged_at", started);
        const prevMax = Math.max(0, ...(hist || []).map((h) => Number(h.actual_weight) || 0));
        if (curMax > prevMax) prs.push({ name: ex.name, weight: curMax });
      }
      return prs;
    },
    enabled: !!sessionId && !!clientId && persisted && plan.length > 0,
  });

  const prSummary =
    prList.length > 0 ? prList.map((p) => `${p.name}: ${p.weight} كجم`).join("، ") : "لا يوجد سجلات سابقة للمقارنة";

  const { data: clientNameRow } = useQuery({
    queryKey: ["workout-complete-client-name", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase.from("clients").select("name").eq("id", clientId).maybeSingle();
      return data?.name ?? null;
    },
    enabled: !!clientId && persisted,
  });

  useEffect(() => {
    if (!persisted || copilotAutoSent.current || !clientId) return;
    copilotAutoSent.current = true;
    const nm = clientNameRow ?? "المتدرب";
    const prs = prList.map((p) => `${p.name} (${p.weight} كجم)`);
    const autoMessage = `حلل أداء ${nm} في تمرين ${programName || "اليوم"} للتو. الحجم: ${Math.round(totalVolume)} كجم. ${prs.length > 0 ? "سجل رقماً قياسياً جديداً في: " + prs.join("، ") : ""}`;
    openCopilot({ context: "post_workout", autoMessage });
  }, [persisted, clientId, clientNameRow, programName, totalVolume, prList, openCopilot]);

  const { data: insight } = useQuery({
    queryKey: ["workout-insight", sessionId, persisted, prSummary],
    queryFn: async () => {
      if (!sessionId) return "";
      const prompt = `المتدرب أكمل تمرين ${programName || "اليوم"}. رفع ${Math.round(totalVolume)} كجم تقريباً في ${Math.max(1, Math.round(elapsedMs / 60000))} دقيقة. ${prSummary}. اكتب رسالة تحفيزية قصيرة باللغة العربية وأضف توصية واحدة للجلسة القادمة.`;
      const { data, error } = await supabase.functions.invoke<{ insight?: string; error?: string }>("workout-insight", {
        body: { session_id: sessionId, prompt_context: prompt },
      });
      if (error) throw error;
      if (data && "error" in data && data.error) throw new Error(data.error);
      return data?.insight ?? "";
    },
    enabled: !!sessionId && persisted,
    retry: 1,
  });

  const shareText = useMemo(() => {
    return `أكملت تمرين CoachBase — ${programName || "تمرين"}\n⏱ ${formatMmSs(elapsedMs)}\n🏋️ الحجم: ${Math.round(totalVolume)} كجم\n✅ ${exercisesDone}/${exercisesPlanned} تمارين`;
  }, [programName, elapsedMs, totalVolume, exercisesDone, exercisesPlanned]);

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "CoachBase", text: shareText });
      } catch {
        await navigator.clipboard.writeText(shareText);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  };

  const onSaveAgain = async () => {
    try {
      await finalizeWorkout();
      setSaveError(null);
      setPersisted(true);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto" style={{ background: CB.bg }} dir="rtl">
      <div className="px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="mb-6 flex flex-col items-center">
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "rgba(79,111,82,0.15)" }}
          >
            <Trophy className="h-10 w-10" style={{ color: CB.accent }} strokeWidth={1.5} />
          </div>
          <h1 className="text-[32px] font-black text-white">أحسنت!</h1>
          <p className="mt-1 text-[16px]" style={{ color: CB.muted }}>
            {programName || "اكتمل التمرين"}
          </p>
        </div>

        {saveError && (
          <p className="mb-4 rounded-[12px] p-3 text-[12px] text-red-400" style={{ background: CB.card }}>
            {saveError}
          </p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3">
          {[
            { icon: "⏱", label: "الوقت", value: formatMmSs(elapsedMs) },
            { icon: "🏋️", label: "الحجم", value: `${Math.round(totalVolume)} كجم` },
            { icon: "✅", label: "تمارين", value: `${exercisesDone}/${exercisesPlanned}` },
            { icon: "🔥", label: "مجموعات", value: `${totalSetsLogged}/${totalSetsPlanned}` },
          ].map((c) => (
            <div key={c.label} className="rounded-[12px] p-4" style={{ background: CB.card, boxShadow: CB.shadow }}>
              <p className="mb-1 text-2xl">{c.icon}</p>
              <p className="text-[12px]" style={{ color: CB.caption }}>
                {c.label}
              </p>
              <p className="text-[16px] font-bold text-white">{c.value}</p>
            </div>
          ))}
        </div>

        {prList.length > 0 && (
          <div className="mb-6 rounded-[12px] border p-4" style={{ borderColor: "rgba(245,158,11,0.4)", background: CB.card }}>
            <p className="mb-2 text-[12px] font-bold" style={{ color: "#F59E0B" }}>
              🏆 سجل شخصي جديد!
            </p>
            <ul className="space-y-1 text-[14px] text-white">
              {prList.map((p) => (
                <li key={p.name}>
                  {p.name} — {p.weight} كجم
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className="mb-8 rounded-[16px] p-4"
          style={{
            background: CB.card2,
            border: "1px solid rgba(79,111,82,0.35)",
            boxShadow: "inset 0 0 0 1px rgba(124,58,237,0.25)",
          }}
        >
          <p className="mb-2 text-[12px] font-semibold" style={{ color: CB.accent }}>
            رؤية المدرب (AI)
          </p>
          <p className="text-[16px] leading-relaxed text-white">
            {insight || (!persisted ? "جاري حفظ الجلسة…" : "جاري توليد الرسالة…")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void onSaveAgain()}
            className="flex items-center justify-center gap-2 rounded-[12px] py-4 text-[16px] font-bold text-black transition active:scale-95"
            style={{ background: CB.gradient }}
          >
            <Save className="h-4 w-4" />
            حفظ التمرين
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            className="flex items-center justify-center gap-2 rounded-[12px] border py-4 text-[16px] font-bold text-white transition active:scale-95"
            style={{ borderColor: "rgba(255,255,255,0.12)", background: CB.card }}
          >
            <Share2 className="h-4 w-4" />
            مشاركة
          </button>
          <button
            type="button"
            onClick={() => void finalizeAndExit()}
            className="flex items-center justify-center gap-2 rounded-[12px] py-4 text-[16px] font-bold transition active:scale-95"
            style={{ background: CB.card2, color: CB.muted }}
          >
            <Home className="h-4 w-4" />
            الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}
