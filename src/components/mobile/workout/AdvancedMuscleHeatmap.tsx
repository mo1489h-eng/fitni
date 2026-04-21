import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Model, { type IExerciseData, type IMuscleStats, type Muscle } from "react-body-highlighter";
import type { MuscleGroupId } from "@/store/workout-store";
import {
  fetchMuscleHeatmapRecovery,
  FITBOD_STATE_LABELS_AR,
  FITBOD_STATE_STYLES,
  type LibraryMuscle,
  type MuscleRecoveryData,
  type MuscleRecoveryVisualState,
} from "@/lib/muscleHeatmapRecovery";
import { RBH_MUSCLE_TO_GROUP } from "@/lib/muscleHeatmapExerciseMapping";
import { MUSCLE_IDS } from "./muscleHeatmapTheme";

export type { MuscleHeatmapProps, FitbodState } from "./muscleHeatmapTypes";

const CARD_BG = "#0E0E0F";

const MODEL_BODY_COLOR = "#1A1A1A";

const HIGHLIGHTED_COLORS = ["#2D4A30", "#4F6F52", "#8B4513", "#B22222"] as const;

const LIBRARY_LABEL_AR: Record<LibraryMuscle, string> = {
  chest: "الصدر",
  biceps: "العضلة ذات الرأسين",
  triceps: "العضلة ثلاثية الرؤوس",
  forearm: "الساعد",
  abs: "البطن",
  obliques: "المائلة",
  "front-deltoids": "الكتف الأمامي",
  "back-deltoids": "الكتف الخلفي",
  quadriceps: "الرباعية",
  hamstring: "الخلفية",
  calves: "السمانة",
  gluteal: "الألوية",
  trapezius: "الشتر",
  "upper-back": "الظهر العلوي",
  "lower-back": "أسفل الظهر",
};

const LIBRARY_MUSCLE_TO_GROUP = RBH_MUSCLE_TO_GROUP as Partial<Record<Muscle, MuscleGroupId>>;

/** بيانات اختبار مؤقتة — يُفعّل مع `VITE_MUSCLE_HEATMAP_TEST=1` فقط. */
const TEST_RECOVERY: IExerciseData[] = [
  { name: "test", muscles: ["chest"], frequency: 4 },
  { name: "test", muscles: ["biceps"], frequency: 3 },
  { name: "test", muscles: ["quadriceps"], frequency: 2 },
  { name: "test", muscles: ["upper-back"], frequency: 1 },
];

function buildModelData(recoveryByLibrary: Partial<Record<LibraryMuscle, MuscleRecoveryData>>): IExerciseData[] {
  const stateGroups: Record<
    Exclude<MuscleRecoveryVisualState, "fresh">,
    LibraryMuscle[]
  > = {
    very_fatigued: [],
    fatigued: [],
    training_today: [],
    recovered: [],
  };

  for (const [muscle, data] of Object.entries(recoveryByLibrary) as [LibraryMuscle, MuscleRecoveryData][]) {
    if (!data || data.state === "fresh") continue;
    switch (data.state) {
      case "very_fatigued":
        stateGroups.very_fatigued.push(muscle);
        break;
      case "fatigued":
        stateGroups.fatigued.push(muscle);
        break;
      case "training_today":
        stateGroups.training_today.push(muscle);
        break;
      case "recovered":
        stateGroups.recovered.push(muscle);
        break;
      default:
        break;
    }
  }

  const data: IExerciseData[] = [];
  if (stateGroups.very_fatigued.length > 0) {
    data.push({ name: "مجهد", muscles: stateGroups.very_fatigued as Muscle[], frequency: 4 });
  }
  if (stateGroups.fatigued.length > 0) {
    data.push({ name: "متعب", muscles: stateGroups.fatigued as Muscle[], frequency: 3 });
  }
  if (stateGroups.training_today.length > 0) {
    data.push({ name: "تدريب اليوم", muscles: stateGroups.training_today as Muscle[], frequency: 2 });
  }
  if (stateGroups.recovered.length > 0) {
    data.push({ name: "جاهز", muscles: stateGroups.recovered as Muscle[], frequency: 1 });
  }
  return data;
}

function defaultRecoveryForMuscle(): MuscleRecoveryData {
  return {
    recoveryPercent: 100,
    lastTrainedDaysAgo: null,
    state: "fresh",
  };
}

type Props = {
  recoveryByLibraryMuscle: Partial<Record<LibraryMuscle, MuscleRecoveryData>>;
  recentExerciseNamesArByMuscle: Record<MuscleGroupId, string[]>;
  className?: string;
};

function lastTrainedLineAr(days: number | null | undefined): string {
  if (days == null) return "لم يُسجّل بعد";
  if (days <= 0) return "اليوم";
  if (days === 1) return "أمس";
  return `منذ ${days} أيام`;
}

const LEGEND_ORDER: MuscleRecoveryVisualState[] = [
  "fresh",
  "recovered",
  "training_today",
  "fatigued",
  "very_fatigued",
];

const LEGEND_LABELS: Record<MuscleRecoveryVisualState, string> = {
  fresh: "مرتاح",
  recovered: "جاهز",
  training_today: "تدريب اليوم",
  fatigued: "متعب",
  very_fatigued: "مجهد",
};

/**
 * خريطة استشفاء Fitbod — تجميع عضلات المكتبة حسب الحالة و`frequency` 1…4.
 */
export function AdvancedMuscleHeatmap({
  recoveryByLibraryMuscle,
  recentExerciseNamesArByMuscle,
  className,
}: Props) {
  const [view, setView] = useState<"front" | "back">("front");
  const [tip, setTip] = useState<{
    muscle: Muscle;
    data: MuscleRecoveryData;
    group: MuscleGroupId | null;
  } | null>(null);

  const modelData = useMemo(() => {
    if (import.meta.env.VITE_MUSCLE_HEATMAP_TEST === "1") {
      return TEST_RECOVERY;
    }
    return buildModelData(recoveryByLibraryMuscle);
  }, [recoveryByLibraryMuscle]);

  const handleMuscleTap = useCallback((muscle: Muscle) => {
    const raw = recoveryByLibraryMuscle[muscle as LibraryMuscle];
    const data = raw ?? defaultRecoveryForMuscle();
    const group = LIBRARY_MUSCLE_TO_GROUP[muscle] ?? null;
    setTip({ muscle, data, group });
  }, [recoveryByLibraryMuscle]);

  const onModelClick = useCallback(
    (stats: IMuscleStats) => {
      handleMuscleTap(stats.muscle);
    },
    [handleMuscleTap]
  );

  const tipExercises =
    tip?.group != null ? recentExerciseNamesArByMuscle[tip.group] ?? [] : [];

  const muscleLabel = tip ? LIBRARY_LABEL_AR[tip.muscle as LibraryMuscle] ?? tip.muscle : "";

  return (
    <div
      className={className}
      dir="rtl"
      style={{
        background: CARD_BG,
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        padding: 16,
      }}
    >
      <div className="mb-3 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            setView("front");
            setTip(null);
          }}
          className="rounded-full px-4 py-2 text-xs font-bold transition"
          style={{
            background: view === "front" ? "rgba(79,111,82,0.22)" : "#141414",
            color: view === "front" ? "#7aae7f" : "#777",
          }}
        >
          أمامي
        </button>
        <button
          type="button"
          onClick={() => {
            setView("back");
            setTip(null);
          }}
          className="rounded-full px-4 py-2 text-xs font-bold transition"
          style={{
            background: view === "back" ? "rgba(79,111,82,0.22)" : "#141414",
            color: view === "back" ? "#7aae7f" : "#777",
          }}
        >
          خلفي
        </button>
      </div>

      <div
        className="relative mx-auto w-full max-w-[300px]"
        style={{ minHeight: 360 }}
        onClick={() => setTip(null)}
        role="presentation"
      >
        <div onClick={(e) => e.stopPropagation()} className="[&_.rbh-wrapper]:mx-auto [&_.rbh-wrapper]:w-full">
          <div
            className="mx-auto overflow-hidden rounded-2xl px-2 py-3 shadow-inner [&_.rbh-wrapper]:mx-auto [&_.rbh-wrapper]:w-full [&_polygon]:stroke-[rgba(255,255,255,0.14)] [&_polygon]:[stroke-width:0.35] [&_polygon]:[stroke-linejoin:round] [&_svg]:max-h-[400px]"
            style={{
              background: CARD_BG,
              maxWidth: 280,
              touchAction: "manipulation",
            }}
          >
            <Model
              type={view === "front" ? "anterior" : "posterior"}
              data={modelData}
              bodyColor={MODEL_BODY_COLOR}
              highlightedColors={[...HIGHLIGHTED_COLORS]}
              onClick={onModelClick}
              style={{
                width: "100%",
                maxWidth: 280,
                marginLeft: "auto",
                marginRight: "auto",
                touchAction: "manipulation",
              }}
              svgStyle={{
                maxHeight: 400,
                display: "block",
              }}
            />
          </div>
        </div>

        {tip && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 rounded-xl border border-white/10 bg-black/90 px-3 py-3 text-center backdrop-blur-sm"
            role="status"
          >
            <p className="font-bold text-white">{muscleLabel}</p>
            <p className="mt-1 text-[12px] text-zinc-300">
              الاستشفاء: {tip.data.recoveryPercent}%
            </p>
            <p className="mt-1 text-[12px] text-zinc-300">آخر تدريب: {lastTrainedLineAr(tip.data.lastTrainedDaysAgo)}</p>
            <p className="mt-1 text-[12px] text-primary/90">الحالة: {FITBOD_STATE_LABELS_AR[tip.data.state]}</p>
            {tipExercises.length > 0 ? (
              <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                تمارين مرتبطة: {tipExercises.join("، ")}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-1">
        {LEGEND_ORDER.map((key) => {
          const st = FITBOD_STATE_STYLES[key];
          return (
            <div key={key} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: key === "fresh" ? MODEL_BODY_COLOR : st.fill,
                  boxShadow: st.useGlow ? `0 0 6px ${st.fill}` : undefined,
                  border: `1px solid ${key === "fresh" ? "rgba(255,255,255,0.12)" : st.stroke}`,
                }}
              />
              <span style={{ color: "#aaa" }}>{LEGEND_LABELS[key]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function emptyRecentExercises(): Record<MuscleGroupId, string[]> {
  return Object.fromEntries(MUSCLE_IDS.map((id) => [id, [] as string[]])) as Record<MuscleGroupId, string[]>;
}

export function AdvancedMuscleHeatmapConnected({
  clientId,
  className,
}: {
  clientId: string;
  className?: string;
}) {
  const emptyRecent = useMemo(() => emptyRecentExercises(), []);
  const emptyLibrary = useMemo(() => ({} as Partial<Record<LibraryMuscle, MuscleRecoveryData>>), []);

  const q = useQuery({
    queryKey: ["muscle-heatmap-recovery", clientId],
    queryFn: () => fetchMuscleHeatmapRecovery(clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  if (q.isPending) {
    return (
      <div
        className={className}
        dir="rtl"
        style={{
          background: CARD_BG,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 16,
        }}
      >
        <div className="mb-3 flex justify-center gap-2">
          <div className="h-9 w-24 animate-pulse rounded-full bg-white/5" />
          <div className="h-9 w-24 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="mx-auto min-h-[360px] max-w-[300px] animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-2.5 w-12 animate-pulse rounded-full bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const recoveryByLibraryMuscle = q.isError || !q.data ? emptyLibrary : q.data.recoveryByLibraryMuscle;
  const recentExerciseNamesArByMuscle = q.isError || !q.data ? emptyRecent : q.data.recentExerciseNamesArByMuscle;

  return (
    <AdvancedMuscleHeatmap
      className={className}
      recoveryByLibraryMuscle={recoveryByLibraryMuscle}
      recentExerciseNamesArByMuscle={recentExerciseNamesArByMuscle}
    />
  );
}
