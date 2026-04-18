import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronDown, ChevronUp, Dumbbell, List, Check } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { countExercisesFullyDone, setKey, useWorkoutSession } from "./WorkoutSessionContext";
import { muscleChipColor } from "./muscleColors";
import { CB } from "./designTokens";
import { hapticSuccess } from "./haptics";
import { totalSetsInPlan } from "@/lib/workoutDayPlan";

function formatMmSs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function WorkoutSessionScreen() {
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
  } = useWorkoutSession();

  const [exitOpen, setExitOpen] = useState(false);
  const [instOpen, setInstOpen] = useState(false);
  const [altOpen, setAltOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const touchStartX = useRef<number | null>(null);

  const ex = plan[exerciseIndex];
  const totalEx = plan.length;
  const exercisesDone = countExercisesFullyDone(plan, completed);
  const totalSets = totalSetsInPlan(plan);
  const setsDone = Object.keys(completed).length;
  const progressPct = totalEx > 0 ? exercisesDone / totalEx : 0;

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

  const { data: alternates = [] } = useQuery({
    queryKey: ["exercise-alternates", ex?.exerciseId, ex?.muscleGroup],
    queryFn: async () => {
      if (!ex?.muscleGroup) return [];
      const { data, error } = await supabase
        .from("program_exercises")
        .select("id, name, exercise_library ( muscle_group )")
        .neq("id", ex.exerciseId);
      if (error) return [];
      return (data || []).filter((row: { exercise_library?: { muscle_group?: string } | null }) => {
        const mg = row.exercise_library?.muscle_group || "";
        return mg && ex.muscleGroup && mg === ex.muscleGroup;
      });
    },
    enabled: altOpen && !!ex,
  });

  const syncInputs = useCallback(() => {
    if (!ex) return;
    setWeight(String(ex.weight ?? 0));
    setReps(String(ex.reps ?? 0));
  }, [ex]);

  useEffect(() => {
    syncInputs();
  }, [ex?.exerciseId, setWithinExercise, syncInputs]);

  const onCompletePress = async () => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    await hapticSuccess();
    await completeSet(w, r, { rpe: 7 });
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx > 70) goPrevExercise();
    if (dx < -70) goNextExercise();
  };

  if (!ex) return null;

  const muscleColor = muscleChipColor(ex.muscleGroup);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: CB.bg }} dir="rtl">
      <header
        className="shrink-0 px-4 pb-3 pt-[max(8px,env(safe-area-inset-top))]"
        style={{ boxShadow: CB.shadow }}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] transition active:scale-95"
            style={{ background: CB.card2 }}
            aria-label="إغلاق"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <p className="max-w-[55%] truncate text-center text-base font-bold text-white">{programName || "التمرين"}</p>
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#1a1a1a" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke={CB.accent}
                strokeWidth="3"
                strokeDasharray={94.2}
                strokeDashoffset={94.2 * (1 - progressPct)}
                className="transition-all duration-300"
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ fontSize: 10 }}
            >
              {exercisesDone}/{totalEx}
            </span>
          </div>
        </div>
        <p className="text-center text-xs tabular-nums" style={{ color: CB.muted }}>
          {formatMmSs(elapsedMs)}
        </p>
      </header>

      <main
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))]"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={onTouchEnd}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <span
            className="rounded-[999px] px-3 py-1 text-xs font-semibold text-white"
            style={{ background: `${muscleColor}33`, color: muscleColor }}
          >
            {ex.muscleGroup}
          </span>
          {ex.isWarmup && (
            <span className="rounded-[999px] px-3 py-1 text-xs font-semibold" style={{ background: "#334155", color: "#94A3B8" }}>
              إحماء
            </span>
          )}
        </div>

        <h1 className="mb-2 text-[28px] font-bold leading-tight text-white">{ex.name}</h1>
        <p className="mb-4 text-sm" style={{ color: CB.muted }}>
          المجموعة {setWithinExercise} من {ex.sets}
        </p>

        <div className="mb-4 flex gap-1">
          {Array.from({ length: ex.sets }, (_, i) => {
            const n = i + 1;
            const done = !!completed[setKey(ex.exerciseId, n)];
            return (
              <span
                key={n}
                className="h-2 flex-1 rounded-full transition-colors"
                style={{ background: done ? CB.accent : "#2a2a2a" }}
              />
            );
          })}
        </div>

        <div className="mb-6 space-y-2">
          {Array.from({ length: ex.sets }, (_, i) => {
            const n = i + 1;
            const done = completed[setKey(ex.exerciseId, n)];
            return (
              <div
                key={n}
                className="flex items-center justify-between rounded-[12px] px-3 py-2 text-[16px] transition-colors"
                style={{
                  background: done ? "rgba(79,111,82,0.12)" : CB.card2,
                }}
              >
                <span className="font-bold text-white">مجموعة {n}</span>
                {done ? (
                  <span className="line-through opacity-80" style={{ color: CB.muted }}>
                    {done.weight} × {done.reps}
                  </span>
                ) : (
                  <span style={{ color: CB.caption }}>—</span>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="mb-6 flex min-h-[160px] flex-col items-center justify-center rounded-[16px] p-6 transition-transform"
          style={{ background: CB.card, border: `1px solid ${muscleColor}33` }}
        >
          <Dumbbell className="mb-2 h-12 w-12" style={{ color: muscleColor }} strokeWidth={1.25} />
          <p className="text-center text-xs" style={{ color: CB.caption }}>
            {ex.muscleGroup}
          </p>
        </div>

        {ex.instructionsAr && (
          <div className="mb-4 overflow-hidden rounded-[12px]" style={{ background: CB.card2 }}>
            <button
              type="button"
              onClick={() => setInstOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-white transition active:scale-95"
            >
              التعليمات
              {instOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {instOpen && (
              <p className="border-t border-white/5 px-4 pb-3 pt-0 text-sm leading-relaxed" style={{ color: CB.muted }}>
                {ex.instructionsAr}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setAltOpen((v) => !v)}
          className="mb-6 w-full rounded-[12px] border py-3 text-sm font-bold transition active:scale-95"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: CB.accent }}
        >
          تمرين بديل
        </button>
        {altOpen && (
          <div className="mb-6 rounded-[12px] p-3" style={{ background: CB.card }}>
            {alternates.length === 0 ? (
              <p className="text-center text-xs" style={{ color: CB.muted }}>
                لا توجد تمارين بديلة لنفس المجموعة
              </p>
            ) : (
              <ul className="space-y-2">
                {alternates.map((a: { id: string; name: string }) => (
                  <li key={a.id} className="text-sm text-white">
                    {a.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {awaitingNextExercise && exerciseIndex < totalEx - 1 ? (
          <button
            type="button"
            onClick={() => goNextExercise()}
            className="mb-6 w-full rounded-[16px] py-5 text-[16px] font-black text-black transition active:scale-95"
            style={{ background: CB.gradient, boxShadow: "0 12px 40px rgba(79,111,82,0.35)" }}
          >
            التمرين التالي
          </button>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-black"
                style={{ background: CB.accent }}
              >
                {setWithinExercise}
              </span>
              <div className="grid flex-1 grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px]" style={{ color: CB.caption }}>
                    الوزن (كجم)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full rounded-[12px] border-0 px-4 py-3 text-[16px] font-bold text-white outline-none transition active:scale-95"
                    style={{ background: CB.card2 }}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px]" style={{ color: CB.caption }}>
                    التكرار
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full rounded-[12px] border-0 px-4 py-3 text-[16px] font-bold text-white outline-none transition active:scale-95"
                    style={{ background: CB.card2 }}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {lastSet && (
              <p className="mb-6 text-[12px]" style={{ color: CB.muted }}>
                السابق: {lastSet.actual_weight} × {lastSet.actual_reps}
              </p>
            )}

            <button
              type="button"
              onClick={() => void onCompletePress()}
              className="group mb-6 flex w-full items-center justify-center gap-2 rounded-[16px] py-5 text-[16px] font-black text-black transition active:scale-95"
              style={{ background: CB.gradient, boxShadow: "0 12px 40px rgba(79,111,82,0.35)" }}
            >
              <Check className="h-6 w-6 transition-transform group-active:scale-110" strokeWidth={2.5} />
              إكمال المجموعة
            </button>
          </>
        )}

        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 rounded-[12px] px-4 py-3 text-sm font-bold text-white transition active:scale-95"
            style={{ background: CB.card }}
          >
            <List className="h-4 w-4" />
            قائمة التمارين
          </button>
          <p className="text-xs" style={{ color: CB.muted }}>
            {setsDone}/{totalSets} مجموعات
          </p>
        </div>
      </main>

      {drawerOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[120] bg-black/70"
          aria-label="إغلاق"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      {drawerOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[121] max-h-[55vh] overflow-y-auto rounded-t-[16px] p-4"
          style={{ background: CB.card, boxShadow: CB.shadow }}
          dir="rtl"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
          <p className="mb-3 text-base font-bold text-white">التمارين</p>
          <ul className="space-y-2">
            {plan.map((p, i) => {
              const done = countExercisesFullyDone([p], completed) === 1;
              return (
                <li
                  key={p.exerciseId}
                  className="flex items-center justify-between rounded-[12px] px-3 py-2 text-sm"
                  style={{ background: i === exerciseIndex ? CB.card2 : "transparent" }}
                >
                  <span className={done ? "text-white line-through opacity-60" : "text-white"}>{p.name}</span>
                  {done && <Check className="h-4 w-4" style={{ color: CB.accent }} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent className="border-0 text-right" style={{ background: CB.card }} dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">هل تريد إنهاء التمرين؟</AlertDialogTitle>
            <AlertDialogDescription style={{ color: CB.muted }}>
              سيتم حفظ التقدم الحالي إن وُجد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel className="border-0 bg-card text-foreground">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onClose()}
              className="border-0 text-black"
              style={{ background: CB.gradient }}
            >
              إنهاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
