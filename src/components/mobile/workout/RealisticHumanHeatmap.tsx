import { useEffect, useMemo, useState } from "react";
import { useWorkoutStore, type MuscleGroupId } from "@/store/workout-store";
import { ELITE } from "./designTokens";

const OLED = "#000000";

type Props = {
  /** 0 = fresh, 1 = max fatigue */
  fatigueLevels: Partial<Record<MuscleGroupId, number>>;
  /** ISO timestamps for recovery ETA (optional) */
  lastStimulusAt?: Partial<Record<MuscleGroupId, string>>;
  className?: string;
  onMuscleSelect?: (id: MuscleGroupId, fatigue: number, etaLabel: string) => void;
};

/**
 * Photorealistic-adjacent muscle heatmap: layered SVG + SVG filters for “heat” bloom.
 * Tappable regions show fatigue % and rough recovery label.
 */
export function RealisticHumanHeatmap({
  fatigueLevels,
  lastStimulusAt,
  className,
  onMuscleSelect,
}: Props) {
  const [view, setView] = useState<"front" | "back">("front");
  const [tip, setTip] = useState<{ id: MuscleGroupId; fatigue: number; eta: string } | null>(null);

  const etaFor = useMemo(() => {
    return (id: MuscleGroupId): string => {
      const iso = lastStimulusAt?.[id];
      if (!iso) return "مستعد";
      const h = (Date.now() - new Date(iso).getTime()) / 3600000;
      const remaining = Math.max(0, 48 - h);
      if (remaining < 6) return `~${Math.ceil(remaining)} ساعة`;
      if (remaining < 24) return `~${Math.ceil(remaining / 6) * 6} ساعة`;
      return `~${Math.ceil(remaining / 24)} يوم`;
    };
  }, [lastStimulusAt]);

  const heatColor = (t: number) => {
    const x = Math.max(0, Math.min(1, t));
    if (x < 0.25) return `rgb(${34 + x * 100}, ${197 - x * 40}, ${94 - x * 20})`;
    if (x < 0.5) return `rgb(${200 - x * 80}, ${220 - x * 100}, ${60})`;
    if (x < 0.75) return `rgb(${239 - x * 40}, ${120 - x * 40}, ${40})`;
    return `rgb(${180 - x * 60}, ${40}, ${40})`;
  };

  const maxFatigue = useMemo(() => {
    const vals = Object.values(fatigueLevels).filter((v): v is number => typeof v === "number");
    return vals.length ? Math.max(...vals) : 0;
  }, [fatigueLevels]);

  const fatigueGlow = heatColor(maxFatigue);

  return (
    <div
      className={className}
      dir="rtl"
      style={{
        background: ELITE.cardBg,
        borderRadius: ELITE.radiusCard,
        border: ELITE.border,
        boxShadow: `${ELITE.innerShadow}, 0 0 56px -12px ${fatigueGlow}`,
        padding: 16,
      }}
    >
      <div className="mb-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setView("front")}
          className="rounded-full px-4 py-2 text-xs font-bold transition"
          style={{
            background: view === "front" ? "rgba(34,197,94,0.2)" : "#111",
            color: view === "front" ? "#4ade80" : "#666",
          }}
        >
          أمامي
        </button>
        <button
          type="button"
          onClick={() => setView("back")}
          className="rounded-full px-4 py-2 text-xs font-bold transition"
          style={{
            background: view === "back" ? "rgba(34,197,94,0.2)" : "#111",
            color: view === "back" ? "#4ade80" : "#666",
          }}
        >
          خلفي
        </button>
      </div>

      <div
        className="relative mx-auto aspect-[3/5] w-full max-w-[280px] overflow-hidden rounded-2xl"
        style={{ background: OLED, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)" }}
      >
        <svg viewBox="0 0 200 360" className="h-full w-full" role="img" aria-label="خريطة العضلات">
          <defs>
            <filter id="heatBloom" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
              <feColorMatrix
                in="b"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.55 0"
                result="c"
              />
              <feBlend in="SourceGraphic" in2="c" mode="screen" />
            </filter>
            <radialGradient id="torsoShade" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#0a0a0a" />
            </radialGradient>
          </defs>

          {/* Base silhouette */}
          <ellipse cx="100" cy="32" rx="22" ry="26" fill="#151515" stroke="#222" strokeWidth="1" />
          <path
            d="M 70 58 Q 100 48 130 58 L 128 120 Q 100 128 72 120 Z"
            fill="url(#torsoShade)"
            stroke="#1f1f1f"
            strokeWidth="1"
          />
          <path d="M 72 120 L 68 210 L 88 300 L 100 305 L 112 300 L 132 210 L 128 120" fill="#121212" stroke="#1a1a1a" />

          {view === "front" ? (
            <FrontMuscles
              fatigueLevels={fatigueLevels}
              heatColor={heatColor}
              onTap={(id) => {
                const f = fatigueLevels[id] ?? 0;
                const eta = etaFor(id);
                setTip({ id, fatigue: f, eta });
                onMuscleSelect?.(id, f, eta);
              }}
            />
          ) : (
            <BackMuscles
              fatigueLevels={fatigueLevels}
              heatColor={heatColor}
              onTap={(id) => {
                const f = fatigueLevels[id] ?? 0;
                const eta = etaFor(id);
                setTip({ id, fatigue: f, eta });
                onMuscleSelect?.(id, f, eta);
              }}
            />
          )}
        </svg>

        {tip && (
          <div
            className="absolute bottom-0 left-0 right-0 rounded-xl border border-white/10 bg-black/90 px-3 py-2 text-center text-xs text-white"
            onClick={() => setTip(null)}
            role="presentation"
          >
            <p className="font-bold">{labelAr(tip.id)}</p>
            <p className="text-white/60">
              إجهاد {Math.round(tip.fatigue * 100)}٪ · {tip.eta}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function labelAr(id: MuscleGroupId): string {
  const m: Record<MuscleGroupId, string> = {
    chest: "الصدر",
    back: "الظهر",
    shoulders: "الأكتاف",
    arms: "الذراعين",
    core: "الوسط",
    legs: "الأرجل",
  };
  return m[id];
}

function FrontMuscles({
  fatigueLevels,
  heatColor,
  onTap,
}: {
  fatigueLevels: Partial<Record<MuscleGroupId, number>>;
  heatColor: (t: number) => string;
  onTap: (id: MuscleGroupId) => void;
}) {
  const fillFor = (id: MuscleGroupId) => {
    const t = fatigueLevels[id] ?? 0;
    return heatColor(t);
  };
  const opFor = (id: MuscleGroupId) => 0.15 + (fatigueLevels[id] ?? 0) * 0.75;

  return (
    <g filter="url(#heatBloom)">
      {/* Chest */}
      <path
        d="M 88 70 Q 100 62 112 70 L 110 100 Q 100 108 90 100 Z"
        fill={fillFor("chest")}
        opacity={opFor("chest")}
        className="cursor-pointer"
        onClick={() => onTap("chest")}
      />
      {/* Shoulders */}
      <ellipse cx="78" cy="68" rx="10" ry="8" fill={fillFor("shoulders")} opacity={opFor("shoulders")} onClick={() => onTap("shoulders")} className="cursor-pointer" />
      <ellipse cx="122" cy="68" rx="10" ry="8" fill={fillFor("shoulders")} opacity={opFor("shoulders")} onClick={() => onTap("shoulders")} className="cursor-pointer" />
      {/* Arms */}
      <path
        d="M 62 76 L 52 150 L 64 155 L 72 80 Z"
        fill={fillFor("arms")}
        opacity={opFor("arms")}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      <path
        d="M 138 76 L 148 150 L 136 155 L 128 80 Z"
        fill={fillFor("arms")}
        opacity={opFor("arms")}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      {/* Core */}
      <path
        d="M 92 108 L 108 108 L 106 150 L 94 150 Z"
        fill={fillFor("core")}
        opacity={opFor("core")}
        onClick={() => onTap("core")}
        className="cursor-pointer"
      />
      {/* Legs */}
      <path
        d="M 88 200 L 84 290 L 96 295 L 98 205 Z"
        fill={fillFor("legs")}
        opacity={opFor("legs")}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      <path
        d="M 112 200 L 116 290 L 104 295 L 102 205 Z"
        fill={fillFor("legs")}
        opacity={opFor("legs")}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
    </g>
  );
}

function BackMuscles({
  fatigueLevels,
  heatColor,
  onTap,
}: {
  fatigueLevels: Partial<Record<MuscleGroupId, number>>;
  heatColor: (t: number) => string;
  onTap: (id: MuscleGroupId) => void;
}) {
  const fillFor = (id: MuscleGroupId) => heatColor(fatigueLevels[id] ?? 0);
  const opFor = (id: MuscleGroupId) => 0.15 + (fatigueLevels[id] ?? 0) * 0.75;

  return (
    <g filter="url(#heatBloom)">
      <path
        d="M 82 64 Q 100 52 118 64 L 116 110 Q 100 118 84 110 Z"
        fill={fillFor("back")}
        opacity={opFor("back")}
        onClick={() => onTap("back")}
        className="cursor-pointer"
      />
      <ellipse cx="76" cy="62" rx="9" ry="7" fill={fillFor("shoulders")} opacity={opFor("shoulders")} onClick={() => onTap("shoulders")} className="cursor-pointer" />
      <ellipse cx="124" cy="62" rx="9" ry="7" fill={fillFor("shoulders")} opacity={opFor("shoulders")} onClick={() => onTap("shoulders")} className="cursor-pointer" />
      <path
        d="M 60 74 L 48 148 L 60 152 L 70 78 Z"
        fill={fillFor("arms")}
        opacity={opFor("arms")}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      <path
        d="M 140 74 L 152 148 L 140 152 L 130 78 Z"
        fill={fillFor("arms")}
        opacity={opFor("arms")}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      <path
        d="M 94 112 L 106 112 L 104 155 L 96 155 Z"
        fill={fillFor("core")}
        opacity={opFor("core")}
        onClick={() => onTap("core")}
        className="cursor-pointer"
      />
      <path
        d="M 86 198 L 82 292 L 94 298 L 98 202 Z"
        fill={fillFor("legs")}
        opacity={opFor("legs")}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      <path
        d="M 114 198 L 118 292 L 106 298 L 102 202 Z"
        fill={fillFor("legs")}
        opacity={opFor("legs")}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
    </g>
  );
}

/** Connected variant: linear recovery model from Zustand */
export function RealisticHumanHeatmapConnected(props: Omit<Props, "fatigueLevels" | "lastStimulusAt">) {
  const [tick, setTick] = useState(0);
  const muscleState = useWorkoutStore((s) => s.muscleFatigueState);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const fatigueLevels = useMemo(
    () => useWorkoutStore.getState().getDerivedFatigueLevels(),
    [muscleState, tick]
  );

  const lastStimulusAt = useMemo(() => {
    const o: Partial<Record<MuscleGroupId, string>> = {};
    for (const g of Object.keys(muscleState) as MuscleGroupId[]) {
      const st = muscleState[g];
      if (st) o[g] = st.lastStimulusAt;
    }
    return o;
  }, [muscleState]);

  return (
    <RealisticHumanHeatmap
      {...props}
      fatigueLevels={fatigueLevels}
      lastStimulusAt={lastStimulusAt}
    />
  );
}
