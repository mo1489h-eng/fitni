import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, List, Info, Dumbbell } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { countExercisesFullyDone, setKey, useWorkoutSession } from "./WorkoutSessionContext";
import { muscleChipColor } from "./muscleColors";
import { hapticSuccess } from "./haptics";
import { totalSetsInPlan, type PlanExercise } from "@/lib/workoutDayPlan";
import { resolveExerciseMuscleGroups } from "@/lib/exerciseMuscleMapping";
import { ExerciseGifImage } from "@/components/program/ExerciseGifImage";
import { CustomKeypad } from "./CustomKeypad";
import SmartRestTimer from "./SmartRestTimer";
import { useExerciseGifUrl } from "./useExerciseGifResolver";
import { useWorkoutStore } from "@/store/workout-store";

const OLED = "#000000";

function MuscleRiskStrip({ plan }: { plan: PlanExercise[] }) {
  const fatigueState = useWorkoutStore((s) => s.muscleFatigueState);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const show = useMemo(() => {
    const derived = useWorkoutStore.getState().getDerivedFatigueLevels();
    for (const ex of plan) {
      const { primary, secondary } = resolveExerciseMuscleGroups({ muscleGroup: ex.muscleGroup, name: ex.name });
      if ((derived[primary] ?? 0) >= 0.72) return true;
      for (const s of secondary) {
        if ((derived[s] ?? 0) >= 0.75) return true;
      }
    }
    return false;
  }, [plan, fatigueState, tick]);

  if (!show) return null;
  return (
    <div
      className="mb-3 rounded-2xl border border-amber-500/30 px-3 py-2.5 text-center text-[11px] leading-relaxed"
      style={{ background: "rgba(245,158,11,0.08)", color: "rgba(254,243,199,0.95)" }}
    >
      <span className="font-bold">عضلة تحت ضغط:</span> جدول اليوم يضرب عضلات ما زالت تحت إجهاد عالٍ — راقب الحجم أو خفّف التكرار.
    </div>
  );
}

function formatMmSs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/**
 * Active Workout Mode — premium full-screen session: GIF, logging grid, custom keypad, RPE, coach notes.
 */
export default function WorkoutSession() {
  const {
    plan,
    programName,
    exerciseIndex,
    setWithinExercise,
    completed,
    elapsedMs,
    clientId,
    completeSet,
    onClose,
    setDrawerOpen,
    drawerOpen,
    goNextExercise,
    goPrevExercise,
    awaitingNextExercise,
    phase,
  } = useWorkoutSession();

  const [exitOpen, setExitOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [keypadField, setKeypadField] = useState<"weight" | "reps">("weight");
  const [rpe, setRpe] = useState(7);
  const [infoOpen, setInfoOpen] = useState(false);
  const [inputsLockedFromHistory, setInputsLockedFromHistory] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const ex = plan[exerciseIndex];
  const totalEx = plan.length;
  const exercisesDone = countExercisesFullyDone(plan, completed);
  const totalSets = totalSetsInPlan(plan);
  const setsDone = Object.keys(completed).length;
  const progressPct = totalEx > 0 ? exercisesDone / totalEx : 0;

  const { data: gifSrc = "", isLoading: gifLoading } = useExerciseGifUrl(ex?.name, !!ex);

  const { data: lastSet } = useQuery({
    queryKey: ["last-logged-set", clientId, ex?.exerciseId],
    queryFn: async () => {
      if (!ex) return null;
      const wse = await supabase
        .from("workout_session_exercises")
        .select("weight_used, reps_completed, completed_at, session_id")
        .eq("exercise_id", ex.exerciseId)
        .order("completed_at", { ascending: false })
        .limit(25);
      if (!wse.error && wse.data?.length) {
        const ids = [...new Set(wse.data.map((r) => r.session_id))];
        const { data: sess } = await supabase
          .from("workout_sessions")
          .select("id, client_id, completed_at")
          .in("id", ids)
          .eq("client_id", clientId)
          .not("completed_at", "is", null);
        const ok = new Set((sess || []).map((s) => s.id));
        const row = wse.data.find((r) => ok.has(r.session_id));
        if (row && row.weight_used != null) {
          return {
            actual_weight: row.weight_used,
            actual_reps: row.reps_completed,
            logged_at: row.completed_at,
          };
        }
      }
      const { data, error } = await supabase
        .from("workout_logs")
        .select("actual_weight, actual_reps, logged_at")
        .eq("client_id", clientId)
        .eq("exercise_id", ex.exerciseId)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      if (!data?.actual_weight && !data?.actual_reps) return null;
      return data;
    },
    enabled: !!clientId && !!ex?.exerciseId,
  });

  const syncInputs = useCallback(() => {
    if (!ex) return;
    setWeight(String(ex.weight ?? 0));
    setReps(String(ex.reps ?? 0));
    setInputsLockedFromHistory(false);
  }, [ex]);

  useEffect(() => {
    syncInputs();
  }, [ex?.exerciseId, setWithinExercise, syncInputs]);

  /** Predictive pre-fill from last session — dimmed until user edits via keypad */
  useEffect(() => {
    if (!lastSet?.actual_weight && !lastSet?.actual_reps) return;
    setWeight(String(lastSet.actual_weight ?? ""));
    setReps(String(lastSet.actual_reps ?? ""));
    setInputsLockedFromHistory(true);
  }, [lastSet?.logged_at, ex?.exerciseId]);

  const onCompletePress = async () => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    const isLastSet = ex && setWithinExercise >= ex.sets;
    if (isLastSet && ex) {
      useWorkoutStore.getState().setRpeForExercise(ex.exerciseId, rpe);
    }
    await hapticSuccess();
    await completeSet(w, r, { rpe });
    setInputsLockedFromHistory(false);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    setTouchStartX(null);
    if (dx > 70) goPrevExercise();
    if (dx < -70) goNextExercise();
  };

  if (!ex) return null;

  if (phase === "rest") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: OLED }} dir="rtl">
        <div className="shrink-0 px-4 pt-[max(8px,env(safe-area-inset-top))] pb-2 text-center">
          <p className="text-xs text-white/40">{programName}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-white/70">{ex.name}</p>
        </div>
        <div className="min-h-0 flex-1" />
        <SmartRestTimer />
      </div>
    );
  }

  const muscleColor = muscleChipColor(ex.muscleGroup);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: OLED }}
      dir="rtl"
      onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
      onTouchEnd={onTouchEnd}
    >
      <header className="shrink-0 px-4 pb-2 pt-[max(8px,env(safe-area-inset-top))]">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-95"
            style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)" }}
            aria-label="إغلاق"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <p className="max-w-[50%] truncate text-center text-[15px] font-bold tracking-tight text-white">
            {programName || "التمرين"}
          </p>
          <div className="relative h-11 w-11">
            <svg className="h-11 w-11 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#1f1f1f" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#22C55E"
                strokeWidth="3"
                strokeDasharray={94.2}
                strokeDashoffset={94.2 * (1 - progressPct)}
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">
              {exercisesDone}/{totalEx}
            </span>
          </div>
        </div>
        <p className="text-center text-[11px] tabular-nums text-white/35">{formatMmSs(elapsedMs)}</p>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-28">
        <MuscleRiskStrip plan={plan} />
        <AnimatePresence mode="wait">
          <motion.div
            key={ex.exerciseId}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{ background: `${muscleColor}22`, color: muscleColor }}
              >
                {ex.muscleGroup}
              </span>
              {ex.instructionsAr ? (
                <button
                  type="button"
                  onClick={() => setInfoOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition active:scale-95"
                  style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}
                  aria-label="معلومات"
                >
                  <Info className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <h1 className="mb-1 text-[26px] font-bold leading-tight tracking-tight text-white">{ex.name}</h1>
            <p className="mb-3 text-[13px] text-white/40">
              المجموعة {setWithinExercise} من {ex.sets}
            </p>

            <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#050505]">
              {!gifLoading && gifSrc ? (
                <ExerciseGifImage
                  src={gifSrc}
                  alt={ex.name}
                  className="h-full w-full"
                  objectFit="contain"
                  loading="eager"
                  errorFallback={
                    <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-[#0a0a0a]">
                      <Dumbbell className="h-16 w-16 text-white/15" strokeWidth={1} />
                    </div>
                  }
                />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center">
                  <Dumbbell className="h-16 w-16 animate-pulse text-white/10" strokeWidth={1} />
                </div>
              )}
            </div>

            {/* Logging table */}
            <div className="mb-4 overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0a0a]">
              <div className="grid grid-cols-4 gap-0 border-b border-white/[0.06] px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
                <span className="text-right">مجموعة</span>
                <span className="text-center">سابق</span>
                <span className="text-center col-span-2">الحالي</span>
              </div>
              {Array.from({ length: ex.sets }, (_, i) => {
                const n = i + 1;
                const done = completed[setKey(ex.exerciseId, n)];
                const active = n === setWithinExercise;
                const prevW = lastSet?.actual_weight;
                const prevR = lastSet?.actual_reps;
                return (
                  <div
                    key={n}
                    className="grid grid-cols-4 items-center gap-0 border-b border-white/[0.04] px-2 py-2.5 text-sm last:border-0"
                    style={{
                      background: active ? "rgba(34,197,94,0.06)" : "transparent",
                    }}
                  >
                    <span className="font-bold text-white">{n}</span>
                    <span className="text-center text-white/35">
                      {prevW != null && prevR != null ? `${prevW}×${prevR}` : "—"}
                    </span>
                    <span className="col-span-2 text-center font-semibold text-white">
                      {done ? `${done.weight}×${done.reps}` : active ? "…" : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* RPE — after exercise intensity; high RPE adds rest via store */}
            <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#0a0a0a] px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-white/50">مجهود (RPE)</span>
                <span className="text-lg font-black tabular-nums text-emerald-400">{rpe}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-l from-red-600 via-amber-400 to-emerald-500"
                style={{ accentColor: "#22c55e" }}
              />
              <p className="mt-1 text-[10px] text-white/30">بعد 8 يُقترح +30 ث راحة تلقائياً</p>
            </div>

            {awaitingNextExercise && exerciseIndex < totalEx - 1 ? (
              <button
                type="button"
                onClick={() => goNextExercise()}
                className="mb-4 w-full rounded-2xl py-4 text-[15px] font-black text-black transition active:scale-[0.99]"
                style={{ background: "linear-gradient(135deg,#22C55E,#16A34A)", boxShadow: "0 12px 40px rgba(34,197,94,0.3)" }}
              >
                التمرين التالي
              </button>
            ) : (
              <>
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border px-3 py-3 text-left transition active:scale-[0.99]"
                    style={{
                      borderColor: keypadField === "weight" ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.08)",
                      background: "#0d0d0d",
                      opacity: inputsLockedFromHistory ? 0.65 : 1,
                    }}
                    onClick={() => {
                      setInputsLockedFromHistory(false);
                      setKeypadField("weight");
                    }}
                  >
                    <p className="text-[10px] font-bold text-white/35">وزن kg</p>
                    <p className="text-xl font-black tabular-nums text-white">{weight || "—"}</p>
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border px-3 py-3 text-left transition active:scale-[0.99]"
                    style={{
                      borderColor: keypadField === "reps" ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.08)",
                      background: "#0d0d0d",
                      opacity: inputsLockedFromHistory ? 0.65 : 1,
                    }}
                    onClick={() => {
                      setInputsLockedFromHistory(false);
                      setKeypadField("reps");
                    }}
                  >
                    <p className="text-[10px] font-bold text-white/35">تكرار</p>
                    <p className="text-xl font-black tabular-nums text-white">{reps || "—"}</p>
                  </button>
                </div>

                <CustomKeypad
                  field={keypadField}
                  value={keypadField === "weight" ? weight : reps}
                  onChange={keypadField === "weight" ? setWeight : setReps}
                  className="mb-4"
                />

                <button
                  type="button"
                  onClick={() => void onCompletePress()}
                  className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-black text-black transition active:scale-[0.99]"
                  style={{ background: "linear-gradient(135deg,#22C55E,#16A34A)", boxShadow: "0 12px 40px rgba(34,197,94,0.3)" }}
                >
                  <Check className="h-6 w-6" strokeWidth={2.5} />
                  إكمال المجموعة
                </button>
              </>
            )}

            <div className="flex items-center justify-between pb-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-white transition active:scale-95"
                style={{ background: "#111" }}
              >
                <List className="h-4 w-4" />
                القائمة
              </button>
              <p className="text-[11px] text-white/35">
                {setsDone}/{totalSets} مجموعات
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {drawerOpen && (
        <button type="button" className="fixed inset-0 z-[120] bg-black/75" aria-label="إغلاق" onClick={() => setDrawerOpen(false)} />
      )}
      {drawerOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[121] max-h-[55vh] overflow-y-auto rounded-t-2xl border border-white/[0.08] p-4"
          style={{ background: "#0a0a0a" }}
          dir="rtl"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
          <p className="mb-3 text-base font-bold text-white">التمارين</p>
          <ul className="space-y-1">
            {plan.map((p, i) => {
              const done = countExercisesFullyDone([p], completed) === 1;
              return (
                <li
                  key={p.exerciseId}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm"
                  style={{ background: i === exerciseIndex ? "#141414" : "transparent" }}
                >
                  <span className={done ? "text-white/40 line-through" : "text-white"}>{p.name}</span>
                  {done && <Check className="h-4 w-4 text-emerald-500" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" className="border-white/[0.08] bg-[#0a0a0a] text-white" dir="rtl">
          <SheetHeader>
            <SheetTitle className="text-right text-base">تعليمات المدرب</SheetTitle>
          </SheetHeader>
          <p className="mt-3 whitespace-pre-wrap text-right text-sm leading-relaxed text-white/70">{ex.instructionsAr || "—"}</p>
        </SheetContent>
      </Sheet>

      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent className="border-white/[0.08] bg-[#111] text-right text-white" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إنهاء التمرين؟</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              يُحفظ تقدمك محلياً وعلى الخادم عند الاتصال.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel className="border-0 bg-[#1a1a1a] text-white">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => onClose()} className="border-0 bg-emerald-500 text-black">
              إنهاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
