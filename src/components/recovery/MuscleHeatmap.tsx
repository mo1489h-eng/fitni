/**
 * MuscleHeatmap — flagship Muscle Recovery Center for CoachBase.
 *
 * UX principles:
 *   - Calm: muted palette, no glow, no gradients, no bouncing animations.
 *   - Decisive: smart default panel shows "ready to train" and "needs rest"
 *     without the user having to interpret numbers.
 *   - Intentional: detail panel is always present (no tooltip dance); selecting
 *     a muscle swaps its content, nothing shifts.
 *   - Honest: status is driven by `session_logs` — no AI copy, no placeholders.
 */

import { useMemo, useState } from "react";
import {
  MUSCLE_GROUPS,
  MUSCLE_LABEL_AR,
  type MuscleGroup,
  type MuscleState,
  type MuscleStateMap,
} from "@/lib/muscleSystem";
import {
  FATIGUE_STATUS_LABEL_AR,
  fatigueStatus,
  type FatigueStatus,
} from "@/lib/recoveryEngine";
import {
  MUSCLE_COLOR_FATIGUED,
  MUSCLE_COLOR_MODERATE,
  MUSCLE_COLOR_READY,
  MUSCLE_INACTIVE,
  getMuscleColor,
} from "@/lib/muscleColors";
import { useMuscleRecovery } from "@/lib/useMuscleRecovery";
import { BodyModel, type BodyView } from "./BodyModel";

/* ---------- Design tokens ---------- */

const TOKENS = {
  bg: "#0B0C0D",
  panel: "#101113",
  border: "rgba(255,255,255,0.05)",
  borderSoft: "rgba(255,255,255,0.03)",
  text: "#F2F3F5",
  muted: "#8A8D93",
  subtle: "#5D6066",
} as const;

const STATUS_COLOR: Record<FatigueStatus, string> = {
  ready: MUSCLE_COLOR_READY,
  moderate: MUSCLE_COLOR_MODERATE,
  fatigued: MUSCLE_COLOR_FATIGUED,
};

/* ---------- Readiness summary ---------- */

type Summary = { ready: MuscleGroup[]; needsRest: MuscleGroup[]; hasHistory: boolean };

function summarize(states: MuscleStateMap): Summary {
  const withHistory = MUSCLE_GROUPS.filter((g) => states[g].lastTrained !== null);
  const ready = withHistory
    .filter((g) => states[g].fatigue < 25)
    .sort((a, b) => states[a].fatigue - states[b].fatigue)
    .slice(0, 4);
  const needsRest = MUSCLE_GROUPS
    .filter((g) => states[g].fatigue >= 65)
    .sort((a, b) => states[b].fatigue - states[a].fatigue)
    .slice(0, 4);
  return { ready, needsRest, hasHistory: withHistory.length > 0 };
}

/* ---------- Time helpers ---------- */

function lastTrainedRelativeAr(iso: string | null): string {
  if (!iso) return "—";
  const last = new Date(iso).getTime();
  if (!Number.isFinite(last)) return "—";
  const hours = Math.floor((Date.now() - last) / 3_600_000);
  if (hours < 1) return "قبل قليل";
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 14) return "منذ أسبوع";
  return new Date(iso).toLocaleDateString("ar-SA", { dateStyle: "medium" });
}

/* ---------- Component ---------- */

export interface MuscleHeatmapProps {
  clientId: string | null | undefined;
  className?: string;
}

export function MuscleHeatmap({ clientId, className }: MuscleHeatmapProps) {
  const [view, setView] = useState<BodyView>("front");
  const [selected, setSelected] = useState<MuscleGroup | null>(null);

  const { data, isLoading, isError } = useMuscleRecovery(clientId);

  // Body always renders. When we don't yet have data (or clientId is absent),
  // fall back to an empty state so the silhouette + toggle remain visible.
  const states: MuscleStateMap = useMemo(() => {
    if (data) return data.states;
    return MUSCLE_GROUPS.reduce((acc, g) => {
      acc[g] = { fatigue: 0, lastTrained: null, volume: 0 };
      return acc;
    }, {} as MuscleStateMap);
  }, [data]);

  // Only colour muscles once we have real recovery data — before that we
  // let the BodyModel show its neutral default fill (grey) so unknown
  // state is visually honest rather than green "ready".
  const fills = useMemo(() => {
    if (!data) return undefined;
    const out: Partial<Record<MuscleGroup, string>> = {};
    for (const g of MUSCLE_GROUPS) out[g] = getMuscleColor(states[g].fatigue);
    return out;
  }, [data, states]);

  const summary = useMemo(() => summarize(states), [states]);

  return (
    <section
      className={className}
      dir="rtl"
      style={{
        background: TOKENS.bg,
        borderRadius: 22,
        border: `1px solid ${TOKENS.border}`,
        padding: "22px 18px 18px",
      }}
    >
      <Header />

      <div
        className="relative mx-auto mt-2 w-full max-w-[320px]"
        onClick={() => setSelected(null)}
        role="presentation"
      >
        <BodyModel
          view={view}
          onViewChange={(v) => {
            setView(v);
            setSelected(null);
          }}
          fills={fills}
          selected={selected}
          onMuscleClick={setSelected}
        />
      </div>

      <Divider />

      <DetailsPanel
        selected={selected}
        selectedState={selected ? states[selected] : null}
        recentExercises={selected && data ? data.recentExercises[selected] ?? [] : []}
        summary={summary}
        isPending={!!clientId && isLoading}
        isError={isError}
        hasClient={!!clientId}
      />

      <Legend />
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Header() {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold leading-tight" style={{ color: TOKENS.text }}>
          مركز الاستشفاء
        </h2>
        <p className="mt-1 text-[11px] leading-snug" style={{ color: TOKENS.subtle }}>
          تحليل مستمر من جلساتك الأخيرة.
        </p>
      </div>
    </header>
  );
}

function Divider() {
  return <div className="my-4 h-px w-full" style={{ background: TOKENS.border }} />;
}

/* ------------------------------------------------------------------ */

interface DetailsPanelProps {
  selected: MuscleGroup | null;
  selectedState: MuscleState | null;
  recentExercises: string[];
  summary: Summary;
  isPending: boolean;
  isError: boolean;
  hasClient: boolean;
}

function DetailsPanel({
  selected,
  selectedState,
  recentExercises,
  summary,
  isPending,
  isError,
  hasClient,
}: DetailsPanelProps) {
  if (!hasClient) {
    return <EmptyNote text="جارِ ربط ملفك التدريبي…" />;
  }
  if (isError) {
    return <EmptyNote text="تعذّر تحميل بيانات الاستشفاء." />;
  }
  if (isPending) {
    return (
      <div className="space-y-2" aria-busy>
        <div className="h-3 w-24 animate-pulse rounded" style={{ background: TOKENS.panel }} />
        <div className="h-3 w-40 animate-pulse rounded" style={{ background: TOKENS.panel }} />
      </div>
    );
  }
  if (selected && selectedState) {
    return (
      <SelectedDetails
        muscle={selected}
        state={selectedState}
        recentExercises={recentExercises}
      />
    );
  }
  return <ReadinessDigest summary={summary} />;
}

function SelectedDetails({
  muscle,
  state,
  recentExercises,
}: {
  muscle: MuscleGroup;
  state: MuscleState;
  recentExercises: string[];
}) {
  const status = fatigueStatus(state.fatigue);
  const color = STATUS_COLOR[status];
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
          {MUSCLE_LABEL_AR[muscle]}
        </h3>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: 999,
              background: color,
            }}
          />
          {FATIGUE_STATUS_LABEL_AR[status]}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-[12px]">
        <Row label="آخر تدريب" value={lastTrainedRelativeAr(state.lastTrained)} />
        {recentExercises.length > 0 && (
          <Row label="تمارين مرتبطة" value={recentExercises.slice(0, 3).join(" · ")} mono={false} />
        )}
      </dl>
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[11px]" style={{ color: TOKENS.subtle }}>
        {label}
      </dt>
      <dd
        className="text-[12px] font-medium"
        style={{ color: TOKENS.text, fontVariantNumeric: mono ? "tabular-nums" : undefined }}
      >
        {value}
      </dd>
    </div>
  );
}

function ReadinessDigest({ summary }: { summary: Summary }) {
  if (!summary.hasHistory) {
    return <EmptyNote text="ابدأ جلستك الأولى لرؤية حالة استشفاء العضلات." />;
  }
  return (
    <div className="space-y-3">
      <DigestLine label="جاهز للتدريب" muscles={summary.ready} color={MUSCLE_COLOR_READY} />
      {summary.needsRest.length > 0 && (
        <DigestLine label="يحتاج راحة" muscles={summary.needsRest} color={MUSCLE_COLOR_FATIGUED} />
      )}
    </div>
  );
}

function DigestLine({
  label,
  muscles,
  color,
}: {
  label: string;
  muscles: MuscleGroup[];
  color: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="flex items-center gap-2 text-[11px]" style={{ color: TOKENS.subtle }}>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: 999,
            background: color,
          }}
        />
        {label}
      </span>
      <span className="text-[12px] font-medium leading-relaxed" style={{ color: TOKENS.text }}>
        {muscles.length > 0 ? muscles.map((m) => MUSCLE_LABEL_AR[m]).join(" · ") : "—"}
      </span>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-[12px] leading-relaxed" style={{ color: TOKENS.muted }}>{text}</p>;
}

/* ------------------------------------------------------------------ */

function Legend() {
  const items: Array<{ color: string; label: string }> = [
    { color: MUSCLE_COLOR_READY, label: "جاهز" },
    { color: MUSCLE_COLOR_MODERATE, label: "استشفاء" },
    { color: MUSCLE_COLOR_FATIGUED, label: "متعب" },
    { color: MUSCLE_INACTIVE, label: "غير مُدرَّبة" },
  ];
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2 text-[10px]" style={{ color: TOKENS.muted }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: 999,
              background: color,
              boxShadow: `0 0 0 1px ${TOKENS.border}`,
            }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}
