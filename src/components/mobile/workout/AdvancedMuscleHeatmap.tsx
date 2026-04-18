import { useEffect, useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useWorkoutStore, type MuscleGroupId } from "@/store/workout-store";
import {
  fatigueHeatColor,
  formatDurationAr,
  getCurrentFatigue,
  hoursUntilFullRecovery,
  recoveryStatusLabel,
} from "@/lib/muscle-fatigue-engine";
import { ELITE } from "./designTokens";

const OLED = "#000000";

type Props = {
  fatigueLevels: Partial<Record<MuscleGroupId, number>>;
  muscleState: Partial<Record<MuscleGroupId, import("@/lib/muscle-fatigue-engine").MuscleRecoveryState>>;
  className?: string;
};

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

/**
 * Medical-style muscle command center: linear fatigue gradient, glow on high load, 3D flip, tap tooltips + recovery ring.
 */
export function AdvancedMuscleHeatmap({ fatigueLevels, muscleState, className }: Props) {
  const [view, setView] = useState<"front" | "back">("front");
  const [tip, setTip] = useState<{
    id: MuscleGroupId;
    fatigue: number;
    status: string;
    eta: string;
    recoveryPct: number;
  } | null>(null);

  const maxFatigue = useMemo(() => {
    const vals = Object.values(fatigueLevels).filter((v): v is number => typeof v === "number");
    return vals.length ? Math.max(...vals) : 0;
  }, [fatigueLevels]);

  const fatigueGlow = fatigueHeatColor(maxFatigue);

  const openTip = (id: MuscleGroupId) => {
    const t = Date.now();
    const st = muscleState[id];
    const f = getCurrentFatigue(id, st, t);
    const hrs = hoursUntilFullRecovery(st, t);
    const eta = hrs == null || hrs <= 0 ? "جاهز" : `خلال ${formatDurationAr(hrs)}`;
    const recoveryPct = Math.round((1 - f) * 100);
    setTip({
      id,
      fatigue: f,
      status: recoveryStatusLabel(f),
      eta,
      recoveryPct: Math.max(0, Math.min(100, recoveryPct)),
    });
  };

  return (
    <div
      className={className}
      dir="rtl"
      style={{
        background: ELITE.cardBg,
        borderRadius: ELITE.radiusCard,
        border: ELITE.border,
        boxShadow: `${ELITE.innerShadow}, 0 0 48px -8px ${fatigueGlow}55`,
        padding: 16,
        willChange: "transform",
      }}
    >
      <div className="mb-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setView("front")}
          className="rounded-full px-4 py-2 text-xs font-bold transition"
          style={{
            background: view === "front" ? "rgba(79,111,82,0.2)" : "#111",
            color: view === "front" ? "#6b8f6e" : "#666",
          }}
        >
          أمامي
        </button>
        <button
          type="button"
          onClick={() => setView("back")}
          className="rounded-full px-4 py-2 text-xs font-bold transition"
          style={{
            background: view === "back" ? "rgba(79,111,82,0.2)" : "#111",
            color: view === "back" ? "#6b8f6e" : "#666",
          }}
        >
          خلفي
        </button>
      </div>

      <div
        className="relative mx-auto aspect-[3/5] w-full max-w-[300px]"
        style={{ perspective: 1100 }}
      >
        <motion.div
          className="relative h-full w-full"
          initial={false}
          animate={{ rotateY: view === "front" ? 0 : 180 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="absolute inset-0 overflow-hidden rounded-2xl"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              background: OLED,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            <HeatmapSvg
              side="front"
              fatigueLevels={fatigueLevels}
              onTap={openTip}
            />
          </div>
          <div
            className="absolute inset-0 overflow-hidden rounded-2xl"
            style={{
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              background: OLED,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            <HeatmapSvg
              side="back"
              fatigueLevels={fatigueLevels}
              onTap={openTip}
            />
          </div>
        </motion.div>

        {tip && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 rounded-xl border border-white/10 bg-black/92 px-3 py-3 text-center backdrop-blur-sm"
            onClick={() => setTip(null)}
            role="presentation"
          >
            <div className="mx-auto mb-2 h-14 w-14">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={fatigueHeatColor(tip.fatigue)}
                  strokeWidth="3"
                  strokeDasharray={`${(tip.recoveryPct / 100) * 94.2} 94.2`}
                  strokeLinecap="round"
                />
              </svg>
              <p className="-mt-10 text-[10px] font-black text-white">{tip.recoveryPct}%</p>
            </div>
            <p className="font-bold text-white">{labelAr(tip.id)}</p>
            <p className="text-[11px] text-primary/90">
              الحالة: {tip.status} ({Math.round(tip.fatigue * 100)}% إجهاد)
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">
              وقت الاستشفاء المتوقع: {tip.eta}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function HeatmapSvg({
  side,
  fatigueLevels,
  onTap,
}: {
  side: "front" | "back";
  fatigueLevels: Partial<Record<MuscleGroupId, number>>;
  onTap: (id: MuscleGroupId) => void;
}) {
  const rid = useId().replace(/:/g, "");
  const bloom = `heatBloomAdv-${rid}`;
  const infl = `inflamed-${rid}`;
  const torso = `torsoShadeAdv-${rid}`;
  const striae = `striae-${rid}`;

  const fillFor = (id: MuscleGroupId) => fatigueHeatColor(fatigueLevels[id] ?? 0);
  const opFor = (id: MuscleGroupId) => 0.18 + (fatigueLevels[id] ?? 0) * 0.78;

  return (
    <svg viewBox="0 0 200 360" className="h-full w-full" role="img" aria-label="خريطة العضلات" style={{ transform: "translateZ(0)" }}>
      <defs>
        <filter id={bloom} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0  0 0.85 0 0 0  0 0 0.75 0 0  0 0 0 0.65 0"
            result="c"
          />
          <feBlend in="SourceGraphic" in2="c" mode="screen" />
        </filter>
        <filter id={infl} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1.2 0 0 0 0  0 0.3 0 0 0  0 0 0.25 0 0  0 0 0 0.9 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={torso} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
        <pattern id={striae} patternUnits="userSpaceOnUse" width="6" height="6">
          <path d="M 0 6 L 6 0" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />
        </pattern>
      </defs>

      <ellipse cx="100" cy="32" rx="22" ry="26" fill="#151515" stroke="#222" strokeWidth="1" />
      <path
        d="M 70 58 Q 100 48 130 58 L 128 120 Q 100 128 72 120 Z"
        fill={`url(#${torso})`}
        stroke="#1f1f1f"
        strokeWidth="1"
      />
      <path d="M 72 120 L 68 210 L 88 300 L 100 305 L 112 300 L 132 210 L 128 120" fill="#121212" stroke="#1a1a1a" />

      {side === "front" ? (
        <g filter={`url(#${bloom})`}>
          <FrontPaths fillFor={fillFor} opFor={opFor} onTap={onTap} inflamedId={infl} striaeId={striae} />
        </g>
      ) : (
        <g filter={`url(#${bloom})`}>
          <BackPaths fillFor={fillFor} opFor={opFor} onTap={onTap} inflamedId={infl} />
        </g>
      )}
    </svg>
  );
}

function FrontPaths({
  fillFor,
  opFor,
  onTap,
  inflamedId,
  striaeId,
}: {
  fillFor: (id: MuscleGroupId) => string;
  opFor: (id: MuscleGroupId) => number;
  onTap: (id: MuscleGroupId) => void;
  inflamedId: string;
  striaeId: string;
}) {
  return (
    <>
      <path
        d="M 88 70 Q 100 62 112 70 L 110 100 Q 100 108 90 100 Z"
        fill={fillFor("chest")}
        opacity={opFor("chest")}
        filter={opFor("chest") > 0.5 ? `url(#${inflamedId})` : undefined}
        className="cursor-pointer"
        onClick={() => onTap("chest")}
      />
      <path fill={`url(#${striaeId})`} d="M 88 70 Q 100 62 112 70 L 110 100 Q 100 108 90 100 Z" opacity={0.35} pointerEvents="none" />
      <ellipse cx="78" cy="68" rx="10" ry="8" fill={fillFor("shoulders")} opacity={opFor("shoulders")} onClick={() => onTap("shoulders")} className="cursor-pointer" />
      <ellipse cx="122" cy="68" rx="10" ry="8" fill={fillFor("shoulders")} opacity={opFor("shoulders")} onClick={() => onTap("shoulders")} className="cursor-pointer" />
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
      <path
        d="M 92 108 L 108 108 L 106 150 L 94 150 Z"
        fill={fillFor("core")}
        opacity={opFor("core")}
        onClick={() => onTap("core")}
        className="cursor-pointer"
      />
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
    </>
  );
}

function BackPaths({
  fillFor,
  opFor,
  onTap,
  inflamedId,
}: {
  fillFor: (id: MuscleGroupId) => string;
  opFor: (id: MuscleGroupId) => number;
  onTap: (id: MuscleGroupId) => void;
  inflamedId: string;
}) {
  return (
    <>
      <path
        d="M 82 64 Q 100 52 118 64 L 116 110 Q 100 118 84 110 Z"
        fill={fillFor("back")}
        opacity={opFor("back")}
        filter={opFor("back") > 0.5 ? `url(#${inflamedId})` : undefined}
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
    </>
  );
}

/** Subscribes to Zustand + 1s tick so countdown / fatigue colors stay live after sessions. */
export function AdvancedMuscleHeatmapConnected(props: Omit<Props, "fatigueLevels" | "muscleState">) {
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

  return <AdvancedMuscleHeatmap {...props} fatigueLevels={fatigueLevels} muscleState={muscleState} />;
}
