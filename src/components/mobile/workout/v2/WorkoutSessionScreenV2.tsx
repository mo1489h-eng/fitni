import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
import ExerciseSetsCard from "./ExerciseSetsCard";
import RestTimerOverlay from "./RestTimerOverlay";
import { setKey, useWorkoutSession } from "../WorkoutSessionContext";
import { hapticImpact } from "../haptics";

const BG = "#0a0a0a";
const BORDER = "#252525";
const GREEN = "#16a34a";

function formatMmSs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function WorkoutSessionScreenV2() {
  const {
    plan,
    programName,
    exerciseIndex,
    completed,
    elapsedMs,
    goNextExercise,
    goPrevExercise,
    jumpToExercise,
    finalizeAndExit,
    finalizeWorkout,
  } = useWorkoutSession();

  const [exitOpen, setExitOpen] = useState(false);

  const ex = plan[exerciseIndex];
  const total = plan.length;

  const isExerciseDone = useMemo(() => {
    return plan.map((p) => {
      for (let n = 1; n <= p.sets; n++) {
        if (!completed[setKey(p.exerciseId, n)]) return false;
      }
      return true;
    });
  }, [plan, completed]);

  const headerTitle = useMemo(() => {
    if (!ex) return programName || "التمرين";
    return programName || "تمرين اليوم";
  }, [ex, programName]);

  useEffect(() => {
    if (!ex) return;
    void hapticImpact("light");
  }, [ex?.exerciseId]);

  if (!ex) return null;

  const isLastEx = exerciseIndex >= total - 1;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: BG }} dir="rtl">
      <header
        className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-3"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <button
          type="button"
          onClick={() => setExitOpen(true)}
          className="flex h-[40px] items-center gap-1.5 rounded-[12px] px-3 text-[13px] font-bold text-white transition active:scale-95"
          style={{ background: "#1a1a1a", border: `1px solid ${BORDER}` }}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
          إنهاء
        </button>

        <p className="truncate px-2 text-center text-[14px] font-bold text-white">{headerTitle}</p>

        <div
          className="flex h-[40px] items-center justify-center rounded-[12px] px-3 tabular-nums"
          style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, minWidth: 88 }}
        >
          <span className="text-[15px] font-black text-white">{formatMmSs(elapsedMs)}</span>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-3"
          style={{ background: `linear-gradient(${BG}, transparent)` }}
        />
        <div className="h-full overflow-y-auto px-3 pb-[128px] pt-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={ex.exerciseId}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) goPrevExercise();
                else if (info.offset.x < -80) goNextExercise();
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ExerciseSetsCard exercise={ex} exerciseIndex={exerciseIndex} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-[10] flex flex-col gap-2 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-3"
        style={{
          background: "linear-gradient(to top, rgba(10,10,10,1) 64%, rgba(10,10,10,0))",
        }}
      >
        <div className="flex items-center justify-center gap-1.5">
          {plan.map((p, i) => {
            const done = isExerciseDone[i];
            const active = i === exerciseIndex;
            return (
              <button
                key={p.exerciseId}
                type="button"
                aria-label={`الانتقال للتمرين ${i + 1}`}
                onClick={() => {
                  void hapticImpact("light");
                  jumpToExercise(i);
                }}
                className="rounded-full transition-all"
                style={{
                  width: active ? 22 : 8,
                  height: 8,
                  background: active ? GREEN : done ? "rgba(22,163,74,0.55)" : "#2a2a2a",
                }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrevExercise}
            disabled={exerciseIndex === 0}
            className="flex h-[52px] items-center gap-1 rounded-[12px] px-4 text-[13px] font-bold text-white transition active:scale-95 disabled:opacity-30"
            style={{ background: "#141414", border: `1px solid ${BORDER}` }}
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </button>

          <span className="text-[13px] font-bold text-white/65 tabular-nums">
            {exerciseIndex + 1} / {total}
          </span>

          <button
            type="button"
            onClick={() => {
              if (isLastEx) {
                void finalizeWorkout();
                return;
              }
              goNextExercise();
            }}
            className="flex h-[52px] items-center gap-1 rounded-[12px] px-4 text-[13px] font-bold text-white transition active:scale-95"
            style={{
              background: isLastEx ? GREEN : "#141414",
              border: `1px solid ${isLastEx ? GREEN : BORDER}`,
            }}
          >
            {isLastEx ? "إنهاء" : "التالي"}
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </nav>

      <RestTimerOverlay />

      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent className="border-[#252525] bg-[#141414] text-right text-white" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">إنهاء التمرين؟</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              سيُحفظ تقدمك وسيُغلق التمرين.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel className="border-0 bg-[#1c1c1c] text-white">إلغاء</AlertDialogCancel>
            <AlertDialogAction className="border-0 bg-[#16a34a] text-white" onClick={() => void finalizeAndExit()}>
              إنهاء وحفظ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
