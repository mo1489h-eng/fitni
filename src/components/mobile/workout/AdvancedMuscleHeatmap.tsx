import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useWorkoutStore, type MuscleGroupId } from "@/store/workout-store";
import {
  formatDurationAr,
  getCurrentFatigue,
  hoursUntilFullRecovery,
  recoveryStatusLabel,
} from "@/lib/muscle-fatigue-engine";
import { ELITE } from "./designTokens";
import {
  HEAT_ACCENT,
  HEAT_ACCENT_DEEP,
  HEAT_ACCENT_LIGHT,
  HEAT_INACTIVE,
  lerpRgb,
  MUSCLE_IDS,
  OLED,
  recoveryRingColor,
  WIKIMEDIA_VB_H,
  WIKIMEDIA_VB_W,
} from "./muscleHeatmapTheme";
import { applyWikimediaMusclePaint, mountWikimediaLayer } from "./WikimediaMuscleMapSvg";

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

  const fatigueGlow = lerpRgb(HEAT_INACTIVE, HEAT_ACCENT, Math.min(1, maxFatigue * 0.85 + 0.08));

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
                  stroke={recoveryRingColor(tip.fatigue)}
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
  const defsRef = useRef<SVGDefsElement>(null);
  const layerRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const defs = defsRef.current;
    const host = layerRef.current;
    if (!defs || !host) return;

    mountWikimediaLayer(host, defs);

    applyWikimediaMusclePaint(host, {
      side,
      fatigueLevels,
      onTap,
      rid,
      inflId: infl,
    });
  }, [side, fatigueLevels, onTap, rid, infl]);

  return (
    <svg
      viewBox={`0 0 ${WIKIMEDIA_VB_W} ${WIKIMEDIA_VB_H}`}
      className="h-full w-full"
      role="img"
      aria-label="خريطة العضلات"
      style={{ transform: "translateZ(0)" }}
    >
      <title>Anatomical muscle diagram — Wikimedia Commons (CC BY-SA 4.0), Muscles front and back.svg</title>
      <defs ref={defsRef}>
        {MUSCLE_IDS.map((id) => {
          const t = Math.max(0, Math.min(1, fatigueLevels[id] ?? 0));
          if (t < 0.03) return null;
          const k = t * 0.92 + 0.08;
          const top = lerpRgb(HEAT_INACTIVE, HEAT_ACCENT_LIGHT, k);
          const mid = lerpRgb(HEAT_INACTIVE, HEAT_ACCENT, k);
          const bot = lerpRgb(HEAT_INACTIVE, HEAT_ACCENT_DEEP, k * 0.95);
          return (
            <linearGradient key={id} id={`${rid}-muscle-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={top} />
              <stop offset="48%" stopColor={mid} />
              <stop offset="100%" stopColor={bot} />
            </linearGradient>
          );
        })}
        <filter id={bloom} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0  0 0.9 0 0 0  0 0 0.75 0 0  0 0 0 0.55 0"
            result="c"
          />
          <feBlend in="SourceGraphic" in2="c" mode="screen" />
        </filter>
        <filter id={infl} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1.15 0 0 0 0  0 0.45 0 0 0  0 0 0.35 0 0  0 0 0 0.85 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={WIKIMEDIA_VB_W} height={WIKIMEDIA_VB_H} fill={OLED} />

      <g filter={`url(#${bloom})`}>
        <g ref={layerRef} />
      </g>
    </svg>
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
