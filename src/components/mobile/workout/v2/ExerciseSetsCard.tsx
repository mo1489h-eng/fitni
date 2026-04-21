import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Dumbbell, Info, Plus, Trash2, Trophy } from "lucide-react";
import StepperInput from "./StepperInput";
import { hapticImpact, hapticSuccess } from "../haptics";
import { setKey, useWorkoutSession } from "../WorkoutSessionContext";
import { useExerciseHistory } from "./useExerciseHistory";
import { useExerciseGifUrl } from "../useExerciseGifResolver";
import { ExerciseGifImage } from "@/components/program/ExerciseGifImage";
import { muscleChipColor } from "../muscleColors";
import type { PlanExercise } from "@/lib/workoutDayPlan";
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

type Props = {
  exercise: PlanExercise;
  exerciseIndex: number;
};

const GREEN = "#16a34a";
const GREEN_SOFT = "rgba(34, 197, 94, 0.12)";
const GOLD = "#f59e0b";
const BORDER = "#252525";
const CARD = "#141414";
const GIF_BG = "#0d0d0d";

function formatWeight(w: number): string {
  if (!w || w <= 0) return "";
  return Number.isInteger(w) ? String(w) : String(w);
}

function GifHero({ exercise }: { exercise: PlanExercise }) {
  const { data: gifSrc = "", isLoading, isFetched } = useExerciseGifUrl(exercise.name, true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [gifSrc]);

  const showSkeleton = isLoading && !gifSrc;
  const showFallback = isFetched && !gifSrc;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 240, background: GIF_BG, borderRadius: 16, border: `1px solid ${BORDER}` }}
    >
      <AnimatePresence mode="sync">
        {showSkeleton ? (
          <motion.div
            key={`skeleton-${exercise.exerciseId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          >
            <motion.div
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2"
            >
              <Dumbbell className="h-12 w-12 text-white/20" strokeWidth={1.25} />
              <span className="text-[12px] font-medium text-white/35">جاري التحميل…</span>
            </motion.div>
          </motion.div>
        ) : showFallback ? (
          <motion.div
            key={`fallback-${exercise.exerciseId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <GifFallback exercise={exercise} />
          </motion.div>
        ) : (
          <motion.div
            key={`gif-${exercise.exerciseId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: loaded ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <ExerciseGifImage
              src={gifSrc}
              alt={exercise.name}
              className="h-full w-full"
              objectFit="contain"
              loading="eager"
              errorFallback={<GifFallback exercise={exercise} />}
            />
            <img
              src={gifSrc}
              alt=""
              aria-hidden
              style={{ display: "none" }}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GifFallback({ exercise }: { exercise: PlanExercise }) {
  const color = muscleChipColor(exercise.muscleGroup);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: `${color}22` }}
      >
        <Dumbbell className="h-7 w-7" style={{ color }} strokeWidth={1.5} />
      </div>
      <p className="text-[16px] font-bold text-white">{exercise.name}</p>
      <span
        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: `${color}22`, color }}
      >
        {exercise.muscleGroup}
      </span>
    </div>
  );
}

export default function ExerciseSetsCard({ exercise, exerciseIndex }: Props) {
  const {
    clientId,
    completed,
    completeSetAt,
    deleteCompletedSet,
    addBonusSet,
    setWithinExercise,
    exerciseIndex: currentExIdx,
    highlightedSetKey,
  } = useWorkoutSession();

  const { data: history } = useExerciseHistory(clientId, exercise.exerciseId);
  const [drafts, setDrafts] = useState<Record<number, { w: string; r: string }>>({});
  const [confirmDeleteSet, setConfirmDeleteSet] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const muscleColor = muscleChipColor(exercise.muscleGroup);

  useEffect(() => {
    setDrafts({});
  }, [exercise.exerciseId]);

  const placeholderWeight = useMemo(() => {
    if (history?.latest?.actualWeight) return formatWeight(history.latest.actualWeight);
    return formatWeight(exercise.weight);
  }, [history, exercise.weight]);

  const placeholderReps = useMemo(() => {
    if (history?.latest?.actualReps) return String(history.latest.actualReps);
    return exercise.reps > 0 ? String(exercise.reps) : "";
  }, [history, exercise.reps]);

  const getDraft = useCallback(
    (n: number) => {
      const existing = drafts[n];
      if (existing) return existing;
      const done = completed[setKey(exercise.exerciseId, n)];
      if (done) return { w: formatWeight(done.weight), r: String(done.reps) };
      return { w: "", r: "" };
    },
    [drafts, completed, exercise.exerciseId]
  );

  const setDraft = (n: number, patch: Partial<{ w: string; r: string }>) =>
    setDrafts((prev) => ({ ...prev, [n]: { ...getDraft(n), ...patch } }));

  const onToggleSet = async (n: number) => {
    const k = setKey(exercise.exerciseId, n);
    const done = completed[k];
    if (done) {
      void hapticImpact("light");
      await deleteCompletedSet(exerciseIndex, n);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[n];
        return next;
      });
      return;
    }
    const draft = getDraft(n);
    const w = parseFloat(draft.w || placeholderWeight || "0") || 0;
    const r = parseInt(draft.r || placeholderReps || "0", 10) || 0;
    if (r <= 0) {
      void hapticImpact("light");
      return;
    }
    void hapticSuccess();
    await completeSetAt(exerciseIndex, n, w, r);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <GifHero exercise={exercise} />

        <div className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] font-black leading-tight text-white">{exercise.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              <span
                className="rounded-full px-2.5 py-1 font-semibold"
                style={{ background: `${muscleColor}22`, color: muscleColor }}
              >
                {exercise.muscleGroup}
              </span>
              <span className="text-white/45">•</span>
              <span className="text-white/60">
                {exercise.sets} {exercise.sets === 1 ? "سيت" : "سيتات"}
              </span>
              {history?.bestWeight ? (
                <>
                  <span className="text-white/45">•</span>
                  <span className="flex items-center gap-1 text-white/60">
                    <Trophy className="h-3 w-3" style={{ color: GOLD }} />
                    {history.bestWeight} كغ
                  </span>
                </>
              ) : null}
            </div>
          </div>
          {exercise.instructionsAr ? (
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
              aria-label="تعليمات المدرب"
            >
              <Info className="h-4 w-4 text-white/70" />
            </button>
          ) : null}
        </div>

        <div
          className="overflow-hidden rounded-[16px]"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/45">
            <span style={{ width: 36 }} className="text-center">
              السيت
            </span>
            <span className="flex-1 text-center">الوزن كغ</span>
            <span className="flex-1 text-center">تكرارات</span>
            <span style={{ width: 48 }} className="text-center">
              ✓
            </span>
          </div>

          <div className="flex flex-col gap-1.5 px-2 pb-2">
            {Array.from({ length: exercise.sets }, (_, i) => {
              const n = i + 1;
              const k = setKey(exercise.exerciseId, n);
              const done = completed[k];
              const isActive = exerciseIndex === currentExIdx && n === setWithinExercise && !done;
              const flash = highlightedSetKey === `${exercise.exerciseId}:${n}`;
              const draft = getDraft(n);
              const isPr =
                !!done?.isPr ||
                (!!done && history?.bestWeight != null && done.weight > history.bestWeight && done.weight > 0);

              return (
                <SetRow
                  key={n}
                  setNum={n}
                  isActive={isActive}
                  flash={flash}
                  done={!!done}
                  isPr={isPr}
                  weight={draft.w}
                  reps={draft.r}
                  placeholderWeight={placeholderWeight}
                  placeholderReps={placeholderReps}
                  onWeight={(v) => setDraft(n, { w: v })}
                  onReps={(v) => setDraft(n, { r: v })}
                  onToggle={() => void onToggleSet(n)}
                  onLongPress={() => setConfirmDeleteSet(n)}
                />
              );
            })}
          </div>

          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            <button
              type="button"
              onClick={() => {
                void hapticImpact("light");
                addBonusSet(exerciseIndex);
              }}
              className="flex h-[48px] w-full items-center justify-center gap-2 text-[13px] font-bold text-white/70 transition active:scale-[0.99] active:text-white"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              إضافة سيت
            </button>
          </div>
        </div>
      </div>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" className="border-[#252525] bg-[#141414] text-white" dir="rtl">
          <SheetHeader>
            <SheetTitle className="text-right text-base text-white">تعليمات المدرب</SheetTitle>
          </SheetHeader>
          <p className="mt-3 whitespace-pre-wrap text-right text-[14px] leading-relaxed text-white/75">
            {exercise.instructionsAr || "—"}
          </p>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDeleteSet != null} onOpenChange={(open) => !open && setConfirmDeleteSet(null)}>
        <AlertDialogContent className="border-[#252525] bg-[#141414] text-right text-white" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">حذف السيت؟</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              سيتم حذف البيانات المسجلة لهذا السيت.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel className="border-0 bg-[#1c1c1c] text-white">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="border-0 bg-[#ef4444] text-white"
              onClick={async () => {
                if (confirmDeleteSet != null) {
                  void hapticImpact("medium");
                  await deleteCompletedSet(exerciseIndex, confirmDeleteSet);
                  setDrafts((prev) => {
                    const next = { ...prev };
                    delete next[confirmDeleteSet];
                    return next;
                  });
                }
                setConfirmDeleteSet(null);
              }}
            >
              <Trash2 className="ml-1 h-4 w-4" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type SetRowProps = {
  setNum: number;
  isActive: boolean;
  flash: boolean;
  done: boolean;
  isPr: boolean;
  weight: string;
  reps: string;
  placeholderWeight: string;
  placeholderReps: string;
  onWeight: (v: string) => void;
  onReps: (v: string) => void;
  onToggle: () => void;
  onLongPress: () => void;
};

function SetRow({
  setNum,
  isActive,
  flash,
  done,
  isPr,
  weight,
  reps,
  placeholderWeight,
  placeholderReps,
  onWeight,
  onReps,
  onToggle,
  onLongPress,
}: SetRowProps) {
  const pressTimer = useRef<number | null>(null);
  const movedRef = useRef(false);

  const startPress = () => {
    movedRef.current = false;
    pressTimer.current = window.setTimeout(() => {
      if (!movedRef.current) {
        void hapticImpact("medium");
        onLongPress();
      }
    }, 520);
  };
  const clearPress = () => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  useEffect(() => () => clearPress(), []);

  return (
    <motion.div
      initial={false}
      animate={{
        backgroundColor: done ? GREEN_SOFT : isActive ? "#1a1a1a" : "#111111",
        scale: flash ? [1, 1.015, 1] : 1,
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-2 rounded-[12px] p-2"
      style={{
        border: `1px solid ${done ? "rgba(22,163,74,0.40)" : isActive ? BORDER : "#1a1a1a"}`,
      }}
      onPointerDown={startPress}
      onPointerUp={clearPress}
      onPointerMove={() => {
        movedRef.current = true;
      }}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
    >
      <div style={{ width: 36 }} className="flex shrink-0 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isPr && done ? (
            <motion.div
              key="pr"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: `${GOLD}22` }}
            >
              <Trophy className="h-3.5 w-3.5" style={{ color: GOLD }} strokeWidth={2.5} />
            </motion.div>
          ) : (
            <motion.span key="num" initial={false} className="text-[16px] font-black tabular-nums text-white/75">
              {setNum}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1">
        <StepperInput
          value={weight}
          onChange={onWeight}
          step={2.5}
          allowDecimals
          disabled={done}
          placeholder={placeholderWeight || "—"}
          ariaLabel={`وزن السيت ${setNum}`}
        />
      </div>
      <div className="flex-1">
        <StepperInput
          value={reps}
          onChange={onReps}
          step={1}
          disabled={done}
          placeholder={placeholderReps || "—"}
          ariaLabel={`تكرارات السيت ${setNum}`}
        />
      </div>

      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.88 }}
        animate={done ? { scale: [0.9, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-[56px] w-[48px] shrink-0 items-center justify-center rounded-[12px] transition"
        style={{
          background: done ? GREEN : "#141414",
          border: `1px solid ${done ? GREEN : BORDER}`,
          color: done ? "#ffffff" : "rgba(255,255,255,0.45)",
        }}
        aria-label={done ? "إلغاء الإكمال" : "إكمال السيت"}
      >
        <Check className="h-5 w-5" strokeWidth={done ? 3 : 2.25} />
      </motion.button>
    </motion.div>
  );
}
