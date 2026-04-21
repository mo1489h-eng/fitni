/**
 * AnatomyEngine.tsx — Interactive anatomical heatmap (CoachBase).
 *
 * Reality check: the source SVG (body-anatomy.svg) is a stock illustration
 * with exactly four `<path>` elements — one compound path for the whole
 * front body, one for the whole back body, plus two tiny decorative dots.
 * Individual muscles are NOT separate paths, so they cannot be addressed
 * via `getElementById` to set `fill`.
 *
 * Strategy (same visual intent, production-reliable):
 *
 *   Layer 1 · Anatomy silhouette   Inline `<path>` using the real `d` data
 *                                  from the SVG. Filled #2A2A2A, stroked
 *                                  rgba(255,255,255,0.15) — the inner
 *                                  stroke traces the muscle boundaries
 *                                  drawn in the stock art.
 *
 *   Layer 2 · Muscle heat overlay  Soft elliptical "heat zones" at each
 *                                  muscle anatomy, filled with a radial
 *                                  gradient of the recovery colour and
 *                                  smoothed with `feGaussianBlur`. The
 *                                  whole layer is clipped to the body
 *                                  silhouette so colour only shows within
 *                                  the anatomy — no visible rectangles,
 *                                  no hard edges. The selected muscle
 *                                  pulses via framer-motion.
 *
 *   Layer 3 · Hit detection        Transparent `<rect>`s receive pointer +
 *                                  keyboard input. No visible stroke.
 *
 * Recovery palette:
 *   fresh           → transparent  (muscle unaffected)
 *   recovered       → #F59E0B      (amber)
 *   training_today  → #4F6F52      (green)
 *   fatigued        → #EF4444      (red)
 *   very_fatigued   → #B22222      (dark red)
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import bodyAnatomySvgRaw from "@/assets/anatomy/body-anatomy.svg?raw";
import {
  MUSCLE_LABEL_AR,
  createEmptyMuscleStateMap,
  type MuscleGroup,
  type MuscleState,
  type MuscleStateMap,
} from "@/lib/muscleSystem";
import {
  DEFAULT_RECOVERY_RATE_PER_HOUR,
  FATIGUE_STATUS_LABEL_AR,
  fatigueStatus,
  type FatigueStatus,
} from "@/lib/recoveryEngine";
import { useMuscleRecovery } from "@/lib/useMuscleRecovery";

/* ------------------------------------------------------------------ */
/* Extract the two compound path `d` values at module load time        */
/* ------------------------------------------------------------------ */

const ANATOMY_PATHS = (() => {
  const re = /<path[^>]*\sd="([\s\S]+?)"/g;
  const all: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyAnatomySvgRaw)) !== null) all.push(m[1]);
  return {
    front: all[0] ?? "",
    back: all[1] ?? "",
    extras: all.slice(2).filter(Boolean), // tiny decorative dots on the front
  };
})();

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type BodyView = "front" | "back";

interface Region {
  id: MuscleGroup;
  k: string;
  /** All values are in the source SVG's viewBox space (0–1024 × 0–544). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnatomyEngineProps {
  clientId: string | null | undefined;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */

const BG = "#0E0E0F";
const PANEL = "#0A0B0C";
const LINE = "rgba(255,255,255,0.05)";
const LINE_STRONG = "rgba(255,255,255,0.08)";
const TEXT = "#F1F3F5";
const MUTED = "#8A8E94";
const SUBTLE = "#52565C";

const BODY_FILL = "#2A2A2A";
const BODY_STROKE = "rgba(255,255,255,0.15)";

const COLOR_RECOVERED = "#F59E0B";
const COLOR_TRAINING = "#4F6F52";
const COLOR_FATIGUED_TONE = "#EF4444";
const COLOR_VERY_FATIGUED = "#B22222";

type RecoveryState =
  | "fresh"
  | "recovered"
  | "training_today"
  | "fatigued"
  | "very_fatigued";

function getMuscleColor(s: RecoveryState): string | null {
  switch (s) {
    case "fresh":
      return null;
    case "recovered":
      return COLOR_RECOVERED;
    case "training_today":
      return COLOR_TRAINING;
    case "fatigued":
      return COLOR_FATIGUED_TONE;
    case "very_fatigued":
      return COLOR_VERY_FATIGUED;
    default:
      return null;
  }
}

const STATUS_COLOR: Record<FatigueStatus, string> = {
  ready: COLOR_TRAINING,
  moderate: COLOR_RECOVERED,
  fatigued: COLOR_VERY_FATIGUED,
};

const STATE_LABEL_AR: Record<RecoveryState, string> = {
  fresh: "مكتملة",
  recovered: "مُتعافية",
  training_today: "يوم التدريب",
  fatigued: "مُرهقة",
  very_fatigued: "إنهاك شديد",
};

/**
 * Whole-calendar-day difference between `lastTrained` and now. Returns `null`
 * if the muscle has never been trained (or timestamp is invalid).
 */
function daysSinceTrained(lastTrained: string | null): number | null {
  if (!lastTrained) return null;
  const d = new Date(lastTrained);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const trainedDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.floor((todayDay - trainedDay) / 86_400_000));
}

/**
 * Recovery state derived strictly from time-since-last-trained (per product
 * spec):
 *   trained today    → training_today
 *   1 day ago        → fatigued
 *   2–3 days ago     → recovered
 *   4+ days / never  → fresh
 */
function deriveState(lastTrained: string | null): RecoveryState {
  const days = daysSinceTrained(lastTrained);
  if (days == null) return "fresh";
  if (days === 0) return "training_today";
  if (days === 1) return "fatigued";
  if (days <= 3) return "recovered";
  return "fresh";
}

/** Recovery completion on [0, 100]. Formula: (daysSince / 5) × 100, capped. */
function recoveryPercent(lastTrained: string | null): number {
  const days = daysSinceTrained(lastTrained);
  if (days == null) return 100;
  return Math.round(Math.min(100, (days / 5) * 100));
}

/** Arabic relative-time string for tooltip. */
function formatArabicDaysAgo(lastTrained: string | null): string {
  const days = daysSinceTrained(lastTrained);
  if (days == null) return "لم يُدرَّب بعد";
  if (days === 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  if (days <= 10) return `منذ ${days} أيام`;
  return `منذ ${days} يوماً`;
}

/* ------------------------------------------------------------------ */
/* Crops + regions                                                     */
/*                                                                     */
/* Measured from the actual SVG paths:                                 */
/*   Front body: x 221–415, y 112–531                                  */
/*   Back  body: x 648–842, y 112–527                                  */
/* ------------------------------------------------------------------ */

const FRONT_VIEWBOX = "195 90 245 460";
const BACK_VIEWBOX = "625 90 245 460";

/**
 * Hit regions — minimum 35×35 SVG units for comfortable tap targets. Arms
 * are split into upper (bicep/tricep) and lower (forearm) bands, with the
 * forearm band routed to the nearest tracked muscle since our data model
 * doesn't carry a standalone forearm state.
 */
const FRONT_REGIONS: readonly Region[] = [
  // Shoulders (deltoids) — outer top of arms
  { id: "shoulders", k: "L",    x: 205, y: 142, w: 48, h: 48 },
  { id: "shoulders", k: "R",    x: 388, y: 142, w: 48, h: 48 },
  // Chest (pectorals)
  { id: "chest",     k: "C",    x: 268, y: 172, w: 100, h: 58 },
  // Biceps — upper arm, outer
  { id: "biceps",    k: "L",    x: 198, y: 188, w: 42, h: 80 },
  { id: "biceps",    k: "R",    x: 395, y: 188, w: 42, h: 80 },
  // Forearms — lower arm (routed to biceps group in our taxonomy)
  { id: "biceps",    k: "FA-L", x: 198, y: 268, w: 42, h: 82 },
  { id: "biceps",    k: "FA-R", x: 395, y: 268, w: 42, h: 82 },
  // Abs
  { id: "abs",       k: "C",    x: 290, y: 228, w: 56, h: 95 },
  // Quads
  { id: "quads",     k: "L",    x: 265, y: 335, w: 48, h: 100 },
  { id: "quads",     k: "R",    x: 323, y: 335, w: 48, h: 100 },
  // Calves
  { id: "calves",    k: "L",    x: 272, y: 448, w: 40, h: 78 },
  { id: "calves",    k: "R",    x: 324, y: 448, w: 40, h: 78 },
];

const BACK_REGIONS: readonly Region[] = [
  // Traps / rear delts — top back
  { id: "shoulders", k: "TL",   x: 635, y: 142, w: 48, h: 48 },
  { id: "shoulders", k: "TR",   x: 805, y: 142, w: 48, h: 48 },
  { id: "shoulders", k: "C",    x: 693, y: 150, w: 100, h: 38 },
  // Lats / upper & mid back
  { id: "back",      k: "L",    x: 670, y: 190, w: 55, h: 95 },
  { id: "back",      k: "R",    x: 758, y: 190, w: 55, h: 95 },
  // Triceps — upper arm (outer)
  { id: "triceps",   k: "L",    x: 625, y: 188, w: 42, h: 80 },
  { id: "triceps",   k: "R",    x: 818, y: 188, w: 42, h: 80 },
  // Forearms — lower arm (routed to triceps group)
  { id: "triceps",   k: "FA-L", x: 625, y: 268, w: 42, h: 82 },
  { id: "triceps",   k: "FA-R", x: 818, y: 268, w: 42, h: 82 },
  // Glutes
  { id: "glutes",    k: "C",    x: 678, y: 290, w: 128, h: 55 },
  // Hamstrings
  { id: "hamstrings",k: "L",    x: 682, y: 342, w: 52, h: 100 },
  { id: "hamstrings",k: "R",    x: 750, y: 342, w: 52, h: 100 },
  // Calves (back)
  { id: "calves",    k: "L",    x: 688, y: 448, w: 40, h: 78 },
  { id: "calves",    k: "R",    x: 756, y: 448, w: 40, h: 78 },
];

/* ------------------------------------------------------------------ */
/* Opacity + blur intensity from state                                 */
/* ------------------------------------------------------------------ */

/**
 * Base opacity for the radial-gradient-filled ellipse. `fresh` is fully
 * invisible — the muscle appears unaltered unless hovered/selected, in
 * which case a faint neutral glow is shown for affordance.
 */
function overlayOpacity(
  state: RecoveryState,
  hovered: boolean,
  selected: boolean,
): number {
  if (state === "fresh") {
    if (selected) return 0.35;
    if (hovered) return 0.18;
    return 0;
  }
  const base =
    state === "recovered"
      ? 0.78
      : state === "training_today"
        ? 0.82
        : state === "fatigued"
          ? 0.92
          : /* very_fatigued */ 1.0;
  return Math.min(1, base + (selected ? 0.02 : 0) + (hovered ? 0.02 : 0));
}

/* ------------------------------------------------------------------ */
/* SVG stage                                                           */
/* ------------------------------------------------------------------ */

interface StageProps {
  view: BodyView;
  regions: readonly Region[];
  states: MuscleStateMap;
  selected: MuscleGroup | null;
  hovered: MuscleGroup | null;
  onHover: (m: MuscleGroup | null) => void;
  onSelect: (m: MuscleGroup) => void;
}

function Stage({
  view,
  regions,
  states,
  selected,
  hovered,
  onHover,
  onSelect,
}: StageProps) {
  const viewBox = view === "front" ? FRONT_VIEWBOX : BACK_VIEWBOX;
  const mainPath = view === "front" ? ANATOMY_PATHS.front : ANATOMY_PATHS.back;
  const clipId = `ae-clip-${view}`;
  const extras = view === "front" ? ANATOMY_PATHS.extras : [];

  /**
   * One radial-gradient id per distinct colour used in this view. The id is
   * scoped to `view` so the front and back stages don't collide in the DOM.
   */
  const activeColours = new Set<string>();
  for (const r of regions) {
    const c = getMuscleColor(deriveState(states[r.id].lastTrained));
    if (c) activeColours.add(c);
  }
  const gradId = (c: string) => `ae-g-${view}-${c.replace("#", "").toLowerCase()}`;
  const blurId = `ae-blur-${view}`;

  return (
    <motion.svg
      className="absolute inset-0 block h-full w-full"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={mainPath} />
        </clipPath>

        {/* Soft blur that dissolves the ellipse edge into the body so the
            heat zone reads as the muscle glowing, not a shape on top of it. */}
        <filter
          id={blurId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="3.5" />
        </filter>

        {/* Neutral halo used for hover/selection of a `fresh` muscle. */}
        <radialGradient id={`ae-g-${view}-neutral`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F1F3F5" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#F1F3F5" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#F1F3F5" stopOpacity="0" />
        </radialGradient>

        {/* Per-state bloom gradients. Solid core, fading to transparent at
            the ellipse edge — the body silhouette clips the rest. */}
        {Array.from(activeColours).map((c) => (
          <radialGradient key={c} id={gradId(c)} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={c} stopOpacity="1" />
            <stop offset="55%" stopColor={c} stopOpacity="0.85" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {/* Layer 1 — anatomical silhouette */}
      <path
        d={mainPath}
        fill={BODY_FILL}
        stroke={BODY_STROKE}
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      {extras.map((d, i) => (
        <path key={`ex-${i}`} d={d} fill={BODY_FILL} />
      ))}

      {/* Layer 2 — muscle heat zones. Clipped to the body so colour bleeds
          organically to the anatomy edge, never past it. Blurred so the
          ellipse dissolves into the muscle contour. */}
      <g clipPath={`url(#${clipId})`} filter={`url(#${blurId})`}>
        {regions.map((r) => {
          const s = states[r.id];
          const state = deriveState(s.lastTrained);
          const color = getMuscleColor(state);
          const isSel = selected === r.id;
          const isHov = hovered === r.id;
          const op = overlayOpacity(state, isHov, isSel);
          if (op === 0) return null;

          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          // Slight over-sizing so the blurred/gradient edge fills the muscle
          // volume before clipping to the body.
          const rx = r.w * 0.58;
          const ry = r.h * 0.58;
          const fill = color ? `url(#${gradId(color)})` : `url(#ae-g-${view}-neutral)`;

          if (isSel) {
            return (
              <motion.ellipse
                key={`ov-${r.id}-${r.k}`}
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill={fill}
                stroke="none"
                animate={{ opacity: [op, Math.min(1, op + 0.12), op] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            );
          }

          return (
            <ellipse
              key={`ov-${r.id}-${r.k}`}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={fill}
              stroke="none"
              opacity={op}
              style={{
                transition: "opacity 220ms ease",
              }}
            />
          );
        })}
      </g>

      {/* Layer 3 — invisible hit targets (no stroke, no fill, no border). */}
      {regions.map((r) => {
        const isSel = selected === r.id;
        return (
          <rect
            key={`hit-${r.id}-${r.k}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            role="button"
            aria-label={MUSCLE_LABEL_AR[r.id]}
            aria-pressed={isSel}
            tabIndex={0}
            fill="rgba(0,0,0,0.001)"
            stroke="none"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(r.id);
            }}
            onMouseEnter={() => onHover(r.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(r.id)}
            onBlur={() => onHover(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(r.id);
              }
            }}
            style={{
              cursor: "pointer",
              pointerEvents: "all",
              outline: "none",
            }}
          />
        );
      })}
    </motion.svg>
  );
}

/* ------------------------------------------------------------------ */
/* View toggle                                                         */
/* ------------------------------------------------------------------ */

function ViewToggle({
  view,
  onChange,
}: {
  view: BodyView;
  onChange: (v: BodyView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="inline-grid grid-cols-2 overflow-hidden rounded-full p-[3px]"
      style={{ background: PANEL, border: `1px solid ${LINE}` }}
    >
      {(
        [
          { id: "front", ar: "أمامي", en: "FRONT" },
          { id: "back", ar: "خلفي", en: "BACK" },
        ] as const
      ).map(({ id, ar, en }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-medium"
            style={{
              background: active ? "rgba(79,111,82,0.25)" : "transparent",
              color: active ? "#B9D3BB" : MUTED,
              transition: "background 220ms ease, color 220ms ease",
            }}
          >
            <span style={{ fontSize: 11 }}>{ar}</span>
            <span
              className="hidden sm:inline font-mono tracking-[0.14em]"
              style={{ color: active ? "#B9D3BB" : SUBTLE, fontSize: 9 }}
            >
              {en}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

const MUSCLE_ID_CODE: Record<MuscleGroup, string> = {
  chest: "CHEST",
  back: "BACK",
  shoulders: "SHLD",
  biceps: "BICEPS",
  triceps: "TRICEPS",
  quads: "QUADS",
  hamstrings: "HAMS",
  glutes: "GLUTES",
  calves: "CALVES",
  abs: "ABS",
};

function hoursUntilRecovered(fatigue: number): number {
  if (fatigue <= 0) return 0;
  return fatigue / DEFAULT_RECOVERY_RATE_PER_HOUR;
}

function formatEta(hours: number): string {
  if (hours <= 0) return "00:00:00";
  const total = Math.round(hours * 3600);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(Math.min(h, 999)).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatFatigueIndex(fatigue: number): string {
  return (Math.max(0, Math.min(100, fatigue)) / 100).toFixed(3);
}

function formatLastTrainedMono(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

interface HudProps {
  view: BodyView;
  selected: MuscleGroup | null;
  state: MuscleState | null;
  isLoading: boolean;
  hasClient: boolean;
}

function Hud({ view, selected, state, isLoading, hasClient }: HudProps) {
  const muscleId = selected
    ? `${MUSCLE_ID_CODE[selected]}_${view.toUpperCase()}`
    : "—";
  const fatigueIdx = state ? formatFatigueIndex(state.fatigue) : "—";
  const recoveryPct = state
    ? Math.max(0, Math.min(100, 100 - Math.round(state.fatigue)))
    : null;
  const eta = state ? formatEta(hoursUntilRecovered(state.fatigue)) : "—";
  const status = state ? fatigueStatus(state.fatigue) : null;
  const statusColor = status ? STATUS_COLOR[status] : MUTED;
  const recoveryState = state ? deriveState(state.lastTrained) : null;

  if (!hasClient) {
    return (
      <HudFrame>
        <div className="p-3" style={{ background: PANEL }}>
          <p className="font-mono text-[11px]" style={{ color: MUTED }}>
            LINK_PENDING · جارِ ربط ملفك التدريبي…
          </p>
        </div>
      </HudFrame>
    );
  }
  if (isLoading) {
    return (
      <HudFrame aria-busy>
        <div className="grid grid-cols-3 gap-[1px]" style={{ background: LINE }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[70px] animate-pulse"
              style={{ background: PANEL }}
            />
          ))}
        </div>
      </HudFrame>
    );
  }

  return (
    <HudFrame>
      <div className="grid grid-cols-3 gap-[1px]" style={{ background: LINE }}>
        <HudCell label="Muscle_ID">
          <div
            className="font-mono text-[14px] font-semibold tracking-[0.06em]"
            style={{ color: selected ? TEXT : SUBTLE }}
          >
            {muscleId}
          </div>
          {selected && (
            <div className="mt-1 text-[10px]" style={{ color: SUBTLE }}>
              {MUSCLE_LABEL_AR[selected]}
            </div>
          )}
        </HudCell>

        <HudCell label="Fatigue_Index">
          <div
            className="font-mono text-[18px] font-semibold leading-none"
            style={{ color: state ? statusColor : SUBTLE, fontVariantNumeric: "tabular-nums" }}
          >
            {fatigueIdx}
          </div>
          {recoveryPct !== null && (
            <div
              className="mt-2 h-[3px] w-full overflow-hidden rounded-full"
              style={{ background: "#111215" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: statusColor }}
                initial={false}
                animate={{ width: `${recoveryPct}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>
          )}
        </HudCell>

        <HudCell label="Est_Recovery_Time">
          <div
            className="font-mono text-[14px] font-semibold tracking-[0.04em]"
            style={{ color: state ? TEXT : SUBTLE, fontVariantNumeric: "tabular-nums" }}
          >
            {eta}
          </div>
          <div className="mt-1 text-[10px]" style={{ color: SUBTLE }}>
            HH : MM : SS
          </div>
        </HudCell>
      </div>

      <div
        className="flex items-center justify-between gap-3 p-3"
        style={{ background: PANEL, borderTop: `1px solid ${LINE}` }}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: 999,
              background: state ? statusColor : SUBTLE,
              boxShadow: state ? `0 0 8px ${statusColor}` : "none",
            }}
          />
          <span
            className="font-mono text-[9px] uppercase tracking-[0.16em]"
            style={{ color: SUBTLE }}
          >
            STATUS
          </span>
          <span className="text-[11px]" style={{ color: TEXT }}>
            {recoveryState
              ? STATE_LABEL_AR[recoveryState]
              : status
                ? FATIGUE_STATUS_LABEL_AR[status]
                : "—"}
          </span>
        </div>
        {selected && state?.lastTrained ? (
          <span
            className="font-mono text-[10px]"
            style={{ color: SUBTLE, fontVariantNumeric: "tabular-nums" }}
          >
            LAST · {formatLastTrainedMono(state.lastTrained)}
          </span>
        ) : !selected ? (
          <span className="text-[10px]" style={{ color: SUBTLE }}>
            اختر عضلة لبدء التحليل
          </span>
        ) : null}
      </div>
    </HudFrame>
  );
}

function HudFrame({
  children,
  ...rest
}: {
  children: React.ReactNode;
  "aria-busy"?: boolean;
}) {
  return (
    <div
      {...rest}
      className="overflow-hidden rounded-[14px]"
      style={{ background: LINE, border: `1px solid ${LINE}` }}
    >
      {children}
    </div>
  );
}

function HudCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3" style={{ background: PANEL }}>
      <div
        className="mb-2 font-mono text-[9px] uppercase"
        style={{ color: SUBTLE, letterSpacing: "0.16em" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */

const LEGEND: ReadonlyArray<{ s: RecoveryState; ar: string }> = [
  { s: "fresh", ar: "مكتملة" },
  { s: "recovered", ar: "مُتعافية" },
  { s: "training_today", ar: "يوم التدريب" },
  { s: "fatigued", ar: "مُرهقة" },
  { s: "very_fatigued", ar: "إنهاك" },
];

/* ------------------------------------------------------------------ */
/* Selection tooltip                                                   */
/* ------------------------------------------------------------------ */

interface TooltipProps {
  view: BodyView;
  muscle: MuscleGroup;
  state: MuscleState;
  regions: readonly Region[];
}

/**
 * Floating tooltip pinned to the selected muscle. Position is computed in
 * percentage of the stage container, so it follows the body silhouette
 * through layout changes and responsive sizing.
 */
function SelectionTooltip({ view, muscle, state, regions }: TooltipProps) {
  const vb = view === "front" ? FRONT_VIEWBOX : BACK_VIEWBOX;
  const [vbx, vby, vbw, vbh] = vb.split(" ").map(Number);

  const matching = regions.filter((r) => r.id === muscle);
  if (matching.length === 0) return null;

  // Centroid over matching regions, top of the muscle band.
  const cx =
    matching.reduce((s, r) => s + (r.x + r.w / 2), 0) / matching.length;
  const top = Math.min(...matching.map((r) => r.y));

  const leftPct = ((cx - vbx) / vbw) * 100;
  const topPct = ((top - vby) / vbh) * 100;

  const days = daysSinceTrained(state.lastTrained);
  const pct = recoveryPercent(state.lastTrained);
  const rec = deriveState(state.lastTrained);
  const color = getMuscleColor(rec) ?? SUBTLE;
  const label = MUSCLE_LABEL_AR[muscle];
  const ago = formatArabicDaysAgo(state.lastTrained);
  const statusAr =
    rec === "training_today"
      ? "يوم التدريب"
      : rec === "fatigued"
        ? "مُرهقة · راحة"
        : rec === "recovered"
          ? "جاهز جزئياً"
          : "جاهز للتدريب";

  // Clamp horizontal position so the tooltip stays visible at the edges.
  const clampedLeft = Math.max(18, Math.min(82, leftPct));
  const anchorAbove = topPct > 18;

  return (
    <motion.div
      initial={{ opacity: 0, y: anchorAbove ? 4 : -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      role="tooltip"
      aria-live="polite"
      dir="rtl"
      style={{
        position: "absolute",
        left: `${clampedLeft}%`,
        top: anchorAbove ? `${topPct}%` : `${topPct}%`,
        transform: anchorAbove
          ? "translate(-50%, calc(-100% - 10px))"
          : "translate(-50%, 14px)",
        zIndex: 20,
        pointerEvents: "none",
        minWidth: 180,
        maxWidth: 240,
        background: "rgba(14,14,15,0.96)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        border: `1px solid ${LINE_STRONG}`,
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      <div className="mb-1 flex items-center gap-1.5" style={{ color: TEXT }}>
        <span aria-hidden style={{ fontSize: 14 }}>💪</span>
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      <div
        className="flex items-center justify-between font-mono text-[11px]"
        style={{ color: MUTED, fontVariantNumeric: "tabular-nums" }}
      >
        <span>الاستشفاء</span>
        <span style={{ color: TEXT }}>{pct}%</span>
      </div>
      <div
        className="mt-1 h-[3px] w-full overflow-hidden rounded-full"
        style={{ background: "#111215" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
      <div
        className="mt-2 flex items-center justify-between text-[10px]"
        style={{ color: MUTED }}
      >
        <span>آخر تدريب</span>
        <span style={{ color: TEXT }}>{ago}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 6px ${color}88`,
          }}
        />
        <span className="text-[10px]" style={{ color: TEXT }}>
          {statusAr}
        </span>
        {days != null && days >= 0 && (
          <span
            className="ml-auto font-mono text-[9px]"
            style={{ color: SUBTLE }}
          >
            {days === 0 ? "d+0" : `d+${days}`}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function Legend() {
  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-[10px] p-2"
      style={{ background: PANEL, border: `1px solid ${LINE}` }}
    >
      {LEGEND.map(({ s, ar }) => {
        const swatch = getMuscleColor(s);
        return (
          <div key={s} className="flex items-center gap-1.5">
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 999,
                background: swatch ?? "transparent",
                border: swatch ? "none" : `1px dashed ${SUBTLE}`,
                boxShadow:
                  s === "very_fatigued"
                    ? `0 0 6px ${COLOR_VERY_FATIGUED}88`
                    : "none",
              }}
            />
            <span className="text-[10px]" style={{ color: MUTED }}>
              {ar}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function AnatomyEngine({ clientId, className }: AnatomyEngineProps) {
  const [view, setView] = useState<BodyView>("front");
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
  const [hovered, setHovered] = useState<MuscleGroup | null>(null);

  const { data, isLoading } = useMuscleRecovery(clientId);

  const states: MuscleStateMap = useMemo(
    () => data?.states ?? createEmptyMuscleStateMap(),
    [data],
  );

  // Debug: surface the live recovery map to the console whenever a new
  // snapshot resolves. Easy to inspect in-app via remote Chrome DevTools.
  useEffect(() => {
    if (!clientId || !data) return;
    const recoveryByMuscle: Record<
      string,
      {
        state: RecoveryState;
        recovery: number;
        daysSince: number | null;
        lastTrained: string | null;
        fatigue: number;
        volume7d: number;
      }
    > = {};
    for (const g of Object.keys(data.states) as MuscleGroup[]) {
      const s = data.states[g];
      recoveryByMuscle[g] = {
        state: deriveState(s.lastTrained),
        recovery: recoveryPercent(s.lastTrained),
        daysSince: daysSinceTrained(s.lastTrained),
        lastTrained: s.lastTrained,
        fatigue: s.fatigue,
        volume7d: s.volume,
      };
    }
    // eslint-disable-next-line no-console
    console.log("[AnatomyEngine] Recovery data:", {
      clientId,
      computedAt: data.computedAt,
      recoveryByMuscle,
      recentExercises: data.recentExercises,
    });
  }, [clientId, data]);

  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const selectedState = selected ? states[selected] : null;

  const changeView = (v: BodyView) => {
    if (v === view) return;
    setSelected(null);
    setHovered(null);
    setView(v);
  };

  return (
    <section
      dir="rtl"
      className={className}
      style={{
        background: BG,
        borderRadius: 20,
        border: `1px solid ${LINE_STRONG}`,
        padding: "16px 14px 14px",
      }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div
            className="font-mono text-[9px] uppercase"
            style={{ color: SUBTLE, letterSpacing: "0.22em" }}
          >
            CoachBase · Anatomy Engine
          </div>
          <h2 className="mt-1 text-[15px] font-semibold" style={{ color: TEXT }}>
            خريطة الاستشفاء العضلي
          </h2>
        </div>
        <ViewToggle view={view} onChange={changeView} />
      </header>

      <div
        className="relative mx-auto mb-3 w-full max-w-[340px]"
        style={{ aspectRatio: "245 / 460" }}
        onClick={() => setSelected(null)}
        role="presentation"
      >
        <AnimatePresence mode="sync" initial={false}>
          <Stage
            key={view}
            view={view}
            regions={regions}
            states={states}
            selected={selected}
            hovered={hovered}
            onHover={setHovered}
            onSelect={(m) => setSelected((prev) => (prev === m ? null : m))}
          />
        </AnimatePresence>

        <AnimatePresence>
          {selected && selectedState && (
            <SelectionTooltip
              key={`tip-${view}-${selected}`}
              view={view}
              muscle={selected}
              state={selectedState}
              regions={regions}
            />
          )}
        </AnimatePresence>
      </div>

      <Legend />

      <div className="mt-3">
        <Hud
          view={view}
          selected={selected}
          state={selectedState}
          isLoading={!!clientId && isLoading}
          hasClient={!!clientId}
        />
      </div>
    </section>
  );
}

export default AnatomyEngine;
