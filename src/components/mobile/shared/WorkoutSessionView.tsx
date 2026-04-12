import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildWorkoutPlanFromDay,
  totalSetsInPlan,
  type PlanExercise,
} from "@/lib/workoutDayPlan";
import { playRestCompleteBeep, vibrateRestComplete } from "@/lib/workoutFeedback";
import { ChevronRight, Check, Timer, X, Trophy, Dumbbell, Radio } from "lucide-react";

const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

type Phase = "work" | "rest" | "summary";

type Props = {
  clientId: string;
  onClose: () => void;
  /** Pre-built plan (trainer) — if omitted, load via portalToken */
  plan?: PlanExercise[] | null;
  programDayId?: string;
  portalToken?: string | null;
  /** Trainer-led session: notes field + live activity strip */
  variant?: "client" | "trainer";
};

const ACCENT = "#22C55E";
const BG = "#050505";

export default function WorkoutSessionView({
  clientId,
  onClose,
  plan: planProp,
  programDayId: programDayIdProp,
  portalToken,
  variant = "client",
}: Props) {
  const [plan, setPlan] = useState<PlanExercise[] | null>(planProp ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!planProp?.length);

  const [phase, setPhase] = useState<Phase>("work");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setWithinExercise, setSetWithinExercise] = useState(1);
  const [restRemaining, setRestRemaining] = useState(0);
  const [actualWeight, setActualWeight] = useState("");
  const [actualReps, setActualReps] = useState("");
  const [volumeTotal, setVolumeTotal] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [setNote, setSetNote] = useState("");
  const [liveInsertCount, setLiveInsertCount] = useState(0);
  const startMsRef = useRef<number>(Date.now());
  const volumeRef = useRef(0);
  const completedRef = useRef(0);
  const isTrainer = variant === "trainer";

  const totalSets = useMemo(() => (plan ? totalSetsInPlan(plan) : 0), [plan]);
  const progressPct = totalSets > 0 ? Math.min(100, Math.round((completedSets / totalSets) * 100)) : 0;

  const currentExercise = plan?.[exerciseIndex] ?? null;

  useEffect(() => {
    if (planProp?.length) {
      setPlan(planProp);
      setLoading(false);
      return;
    }
    if (!portalToken) {
      setLoadError("لا يوجد رمز بوابة");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_portal_program", { p_token: portalToken });
        if (error) throw error;
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        if (!parsed?.days?.length) {
          setLoadError("لا يوجد برنامج أو يوم تمرين");
          setLoading(false);
          return;
        }
        const todayName = WEEKDAYS[new Date().getDay()];
        const day = parsed.days.find((d: { day_name: string }) =>
          (d.day_name || "").includes(todayName)
        );
        if (!day?.exercises?.length) {
          setLoadError("لا يوجد تمارين مجدولة ليوم اليوم في البرنامج");
          setLoading(false);
          return;
        }
        const p = buildWorkoutPlanFromDay({ id: day.id, exercises: day.exercises });
        if (cancelled) return;
        setPlan(p);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portalToken, planProp]);

  useEffect(() => {
    if (!isTrainer) return;
    const ch = supabase
      .channel(`workout-logs-live-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workout_logs",
          filter: `client_id=eq.${clientId}`,
        },
        () => setLiveInsertCount((n) => n + 1)
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [clientId, isTrainer]);

  useEffect(() => {
    if (!currentExercise) return;
    setActualWeight(String(currentExercise.weight ?? 0));
    setActualReps(String(currentExercise.reps ?? 0));
  }, [currentExercise, exerciseIndex, setWithinExercise]);

  useEffect(() => {
    if (isTrainer) setSetNote("");
  }, [exerciseIndex, isTrainer]);

  const programDayIdForSession = programDayIdProp ?? currentExercise?.programDayId;

  useEffect(() => {
    if (!plan?.length || !programDayIdForSession || sessionId) return;
    (async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          client_id: clientId,
          program_day_id: programDayIdForSession,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (!error && data?.id) setSessionId(data.id);
    })();
  }, [plan, clientId, programDayIdForSession, sessionId]);

  useEffect(() => {
    if (phase !== "rest" || restRemaining <= 0) return;
    const t = window.setTimeout(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          playRestCompleteBeep();
          vibrateRestComplete();
          setPhase("work");
          setSetWithinExercise((s) => s + 1);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [phase, restRemaining]);

  const finalizeSessionWithTotals = useCallback(
    async (vol: number, sets: number) => {
      if (!sessionId) {
        setPhase("summary");
        return;
      }
      const durationMin = Math.max(1, Math.round((Date.now() - startMsRef.current) / 60000));
      setSaving(true);
      await supabase
        .from("workout_sessions")
        .update({
          completed_at: new Date().toISOString(),
          duration_minutes: durationMin,
          total_volume: vol,
          total_sets: sets,
        })
        .eq("id", sessionId);
      setSaving(false);
      setPhase("summary");
    },
    [sessionId]
  );

  const logSetAndAdvance = async () => {
    if (!plan?.length || !currentExercise) return;
    const w = parseFloat(actualWeight) || 0;
    const r = parseInt(actualReps, 10) || 0;
    const vol = w * r;
    const nextVol = volumeRef.current + vol;
    const nextCompleted = completedRef.current + 1;
    volumeRef.current = nextVol;
    completedRef.current = nextCompleted;
    setVolumeTotal(nextVol);
    setCompletedSets(nextCompleted);

    const noteTrim = setNote.trim();
    await supabase.from("workout_logs").insert({
      client_id: clientId,
      program_day_id: currentExercise.programDayId,
      exercise_id: currentExercise.exerciseId,
      set_number: setWithinExercise,
      planned_reps: currentExercise.reps,
      planned_weight: currentExercise.weight,
      actual_reps: r,
      actual_weight: w,
      completed: true,
      ...(noteTrim ? { notes: noteTrim } : {}),
    });
    if (isTrainer) setSetNote("");

    const ex = currentExercise;
    const isLastSetOfExercise = setWithinExercise >= ex.sets;
    const isLastExercise = exerciseIndex >= plan.length - 1;

    if (!isLastSetOfExercise) {
      setPhase("rest");
      setRestRemaining(ex.restSeconds);
      return;
    }

    if (isLastExercise) {
      await finalizeSessionWithTotals(nextVol, nextCompleted);
      return;
    }

    setExerciseIndex((i) => i + 1);
    setSetWithinExercise(1);
  };

  const handleExit = () => {
    if (phase === "summary" || completedRef.current === 0) {
      onClose();
      return;
    }
    if (window.confirm("إنهاء التمرين وحفظ ما تم إنجازه؟")) {
      void finalizeSessionWithTotals(volumeRef.current, completedRef.current).then(() => onClose());
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: BG }}>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: ACCENT }} />
        <p className="mt-4 text-sm" style={{ color: "#888" }}>
          جاري تحميل التمرين…
        </p>
      </div>
    );
  }

  if (loadError || !plan?.length) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6" style={{ background: BG }}>
        <p className="text-center text-sm text-white">{loadError || "لا يوجد تمارين"}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-xl px-6 py-3 text-sm font-bold text-white"
          style={{ background: "#222" }}
        >
          إغلاق
        </button>
      </div>
    );
  }

  if (phase === "summary") {
    const mins = Math.max(1, Math.round((Date.now() - startMsRef.current) / 60000));
    return (
      <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: BG }} dir="rtl">
        <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
          <button type="button" onClick={onClose} className="p-2" style={{ color: ACCENT }}>
            <ChevronRight className="h-6 w-6" />
          </button>
          <span className="text-sm font-medium text-white">اكتمل التمرين</span>
          <span className="w-10" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "rgba(34,197,94,0.15)" }}
          >
            <Trophy className="h-10 w-10" style={{ color: ACCENT }} strokeWidth={1.5} />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">أحسنت!</h2>
          <p className="mb-8 text-center text-sm" style={{ color: "#888" }}>
            ملخص جلستك
          </p>
          <div className="w-full max-w-sm space-y-4">
            <div className="rounded-2xl p-5" style={{ background: "#111" }}>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "#666" }}>
                الحجم الكلي
              </p>
              <p className="text-3xl font-bold text-white">{Math.round(volumeTotal)}</p>
              <p className="text-xs" style={{ color: "#666" }}>
                كجم × تكرار
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: "#111" }}>
                <p className="text-[10px]" style={{ color: "#666" }}>
                  الوقت
                </p>
                <p className="text-xl font-bold text-white">{mins} د</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "#111" }}>
                <p className="text-[10px]" style={{ color: "#666" }}>
                  المجموعات
                </p>
                <p className="text-xl font-bold text-white">{completedSets}</p>
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "#111" }}>
              <p className="text-[10px]" style={{ color: "#666" }}>
                تمارين في الجلسة
              </p>
              <p className="text-lg font-bold text-white">{plan.length}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="mt-10 w-full max-w-sm rounded-2xl py-4 text-base font-bold text-black"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #16A34A)` }}
          >
            تم
          </button>
        </div>
      </div>
    );
  }

  if (phase === "rest") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6" style={{ background: BG }} dir="rtl">
        <button type="button" onClick={handleExit} className="absolute right-4 top-[max(12px,env(safe-area-inset-top))] p-2" style={{ color: "#666" }}>
          <X className="h-6 w-6" />
        </button>
        <Timer className="mb-4 h-12 w-12" style={{ color: ACCENT }} strokeWidth={1.25} />
        <p className="mb-2 text-sm font-medium" style={{ color: "#888" }}>
          راحة
        </p>
        <p className="text-7xl font-black tabular-nums text-white">{restRemaining}</p>
        <p className="mt-2 text-sm" style={{ color: "#666" }}>
          ثانية
        </p>
        <button
          type="button"
          onClick={() => {
            setRestRemaining(0);
            playRestCompleteBeep();
            setPhase("work");
            setSetWithinExercise((s) => s + 1);
          }}
          className="mt-10 text-sm font-medium"
          style={{ color: ACCENT }}
        >
          تخطي الراحة
        </button>
      </div>
    );
  }

  const ex = currentExercise!;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: BG }} dir="rtl">
      <header className="shrink-0 px-4 pt-[max(8px,env(safe-area-inset-top))] pb-3">
        {isTrainer && (
          <div
            className="mb-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" style={{ color: ACCENT }} />
            <span style={{ color: "#888" }}>مباشر</span>
            <span className="tabular-nums font-semibold" style={{ color: ACCENT }}>
              {liveInsertCount} تحديث
            </span>
          </div>
        )}
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={handleExit} className="flex items-center gap-1 text-sm" style={{ color: ACCENT }}>
            <ChevronRight className="h-5 w-5" />
            خروج
          </button>
          <span className="text-xs font-medium" style={{ color: "#666" }}>
            {exerciseIndex + 1} / {plan.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#1a1a1a" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: ACCENT }} />
        </div>
        <p className="mt-2 text-center text-[11px]" style={{ color: "#555" }}>
          {progressPct}% مكتمل
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(34,197,94,0.12)" }}
          >
            <Dumbbell className="h-6 w-6" style={{ color: ACCENT }} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#666" }}>
              {ex.isWarmup ? "إحماء" : "تمرين"}
            </p>
            <h1 className="text-xl font-black leading-tight text-white">{ex.name}</h1>
            <p className="mt-1 text-sm" style={{ color: "#888" }}>
              المجموعة {setWithinExercise} من {ex.sets}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl p-4" style={{ background: "#111" }}>
          <div>
            <p className="text-[10px]" style={{ color: "#666" }}>
              المجموعات
            </p>
            <p className="text-lg font-bold text-white">{ex.sets}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "#666" }}>
              التكرار
            </p>
            <p className="text-lg font-bold text-white">{ex.reps}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "#666" }}>
              الوزن (كجم)
            </p>
            <p className="text-lg font-bold text-white">{ex.weight || "—"}</p>
          </div>
        </div>

        {isTrainer && (
          <div className="mb-4">
            <label className="mb-1 block text-[10px] font-medium" style={{ color: "#666" }}>
              ملاحظة المدرب (اختياري)
            </label>
            <textarea
              value={setNote}
              onChange={(e) => setSetNote(e.target.value)}
              rows={2}
              placeholder="تقنية، تعديل، ملاحظة للمجموعة…"
              className="w-full resize-none rounded-xl border-0 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600"
              style={{ background: "#161616" }}
            />
          </div>
        )}
        <p className="mb-2 text-xs font-medium" style={{ color: "#888" }}>
          سجّل ما أنجزته
        </p>
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px]" style={{ color: "#666" }}>
              الوزن الفعلي
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={actualWeight}
              onChange={(e) => setActualWeight(e.target.value)}
              className="w-full rounded-xl border-0 px-4 py-4 text-lg font-bold text-white outline-none"
              style={{ background: "#161616" }}
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px]" style={{ color: "#666" }}>
              التكرار الفعلي
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={actualReps}
              onChange={(e) => setActualReps(e.target.value)}
              className="w-full rounded-xl border-0 px-4 py-4 text-lg font-bold text-white outline-none"
              style={{ background: "#161616" }}
              dir="ltr"
            />
          </div>
        </div>

        <div className="mt-auto">
          <button
            type="button"
            onClick={() => void logSetAndAdvance()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-5 text-base font-black text-black active:scale-[0.99]"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #16A34A)`, boxShadow: "0 12px 40px rgba(34,197,94,0.35)" }}
          >
            <Check className="h-5 w-5" strokeWidth={2.5} />
            إكمال المجموعة
          </button>
        </div>
      </main>
    </div>
  );
}
