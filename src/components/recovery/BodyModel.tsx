/**
 * BodyModel.tsx — Layered Interaction Model.
 *
 * Two layers, not one:
 *   1. Visual layer  → a clean, premium silhouette served as a static SVG
 *                      asset (`<img>` — the browser does the drawing, not us).
 *   2. Logic layer   → absolutely-positioned invisible `<button>` hotspots
 *                      placed in *percent* coordinates so they stay aligned
 *                      with the image at every container size.
 *
 * We do **not** paint muscles via SVG paths. Muscle state is communicated by
 * tinting each hotspot with the fill colour provided through `fills`, and
 * selection draws a soft highlight ring.
 */

import { memo, useState } from "react";
import type { CSSProperties } from "react";
import { MUSCLE_LABEL_AR, type MuscleGroup } from "@/lib/muscleSystem";

export type BodyView = "front" | "back";

export interface BodyModelProps {
  view?: BodyView;
  onViewChange?: (view: BodyView) => void;
  /** Fill per muscle. Missing keys → no overlay (neutral unknown state). */
  fills?: Partial<Record<MuscleGroup, string>>;
  selected?: MuscleGroup | null;
  onMuscleClick?: (muscle: MuscleGroup) => void;
  /** Show the built-in Front / Back toggle above the body. Default `true`. */
  showToggle?: boolean;
  className?: string;
  style?: CSSProperties;
}

/* ---------- Hotspot geometry ----------
 *
 * All values are *percentages of the silhouette container* (the image is
 * rendered at 1:2 aspect ratio, viewBox 200×400 → %x = svgX/2, %y = svgY/4).
 * Left and right sides are declared as separate hotspots so both halves of a
 * symmetric muscle group (e.g. biceps) feel individually tappable while still
 * resolving to the same `MuscleGroup` on click.
 */

interface Hotspot {
  id: MuscleGroup;
  /** Stable key suffix when the same muscle has multiple hotspots (L/R). */
  k: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

const FRONT_HOTSPOTS: readonly Hotspot[] = [
  { id: "shoulders", k: "L", top: 18, left: 13, width: 13, height: 7 },
  { id: "shoulders", k: "R", top: 18, left: 74, width: 13, height: 7 },
  { id: "chest", k: "L", top: 20, left: 28, width: 21, height: 11 },
  { id: "chest", k: "R", top: 20, left: 51, width: 21, height: 11 },
  { id: "biceps", k: "L", top: 28, left: 13, width: 13, height: 19 },
  { id: "biceps", k: "R", top: 28, left: 74, width: 13, height: 19 },
  { id: "abs", k: "C", top: 33, left: 32, width: 36, height: 25 },
  { id: "quads", k: "L", top: 62, left: 32, width: 17, height: 19 },
  { id: "quads", k: "R", top: 62, left: 51, width: 17, height: 19 },
  { id: "calves", k: "L", top: 82, left: 32, width: 17, height: 15 },
  { id: "calves", k: "R", top: 82, left: 51, width: 17, height: 15 },
];

const BACK_HOTSPOTS: readonly Hotspot[] = [
  { id: "shoulders", k: "L", top: 18, left: 13, width: 13, height: 7 },
  { id: "shoulders", k: "R", top: 18, left: 74, width: 13, height: 7 },
  { id: "back", k: "C", top: 20, left: 28, width: 44, height: 32 },
  { id: "triceps", k: "L", top: 28, left: 13, width: 13, height: 19 },
  { id: "triceps", k: "R", top: 28, left: 74, width: 13, height: 19 },
  { id: "glutes", k: "L", top: 60, left: 32, width: 17, height: 11 },
  { id: "glutes", k: "R", top: 60, left: 51, width: 17, height: 11 },
  { id: "hamstrings", k: "L", top: 71, left: 32, width: 17, height: 11 },
  { id: "hamstrings", k: "R", top: 71, left: 51, width: 17, height: 11 },
  { id: "calves", k: "L", top: 82, left: 32, width: 17, height: 15 },
  { id: "calves", k: "R", top: 82, left: 51, width: 17, height: 15 },
];

/* ---------- Colour helpers ---------- */

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return `rgba(255,255,255,${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ---------- Toggle ---------- */

function InternalToggle({
  view,
  onChange,
}: {
  view: BodyView;
  onChange: (v: BodyView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="عرض الجسم"
      className="mx-auto mb-5 grid w-fit grid-cols-2 overflow-hidden rounded-full p-[3px]"
      style={{ background: "#101113", border: "1px solid rgba(255,255,255,0.04)" }}
    >
      {(["front", "back"] as const).map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className="rounded-full px-6 py-1.5 text-[11px] font-medium"
            style={{
              background: active ? "rgba(79,111,82,0.20)" : "transparent",
              color: active ? "#B9D3BB" : "#8A8D93",
              transition: "background 200ms ease, color 200ms ease",
            }}
          >
            {v === "front" ? "أمامي" : "خلفي"}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Component ---------- */

const SILHOUETTE_SRC = "/body/body-silhouette.svg";

function BodyModelImpl({
  view: viewProp,
  onViewChange,
  fills,
  selected,
  onMuscleClick,
  showToggle = true,
  className,
  style,
}: BodyModelProps) {
  const [internalView, setInternalView] = useState<BodyView>("front");
  const view = viewProp ?? internalView;
  const setView = (v: BodyView) => {
    if (onViewChange) onViewChange(v);
    if (viewProp === undefined) setInternalView(v);
  };

  const hotspots = view === "front" ? FRONT_HOTSPOTS : BACK_HOTSPOTS;
  const interactive = !!onMuscleClick;

  return (
    <div className={className} style={style}>
      {showToggle && <InternalToggle view={view} onChange={setView} />}

      <div className="relative mx-auto w-full max-w-[300px]" style={{ aspectRatio: "1 / 2" }}>
        <img
          src={SILHOUETTE_SRC}
          alt=""
          draggable={false}
          aria-hidden="true"
          className="absolute inset-0 block h-full w-full select-none"
          style={{ pointerEvents: "none" }}
        />

        {hotspots.map((h) => {
          const color = fills?.[h.id];
          const isSelected = selected === h.id;
          const overlay = color ? hexToRgba(color, 0.55) : "transparent";
          const ringStyle: CSSProperties = isSelected
            ? { boxShadow: "0 0 0 1.5px rgba(232,236,239,0.85), 0 0 0 4px rgba(232,236,239,0.18)" }
            : {};

          return (
            <button
              key={`${view}-${h.id}-${h.k}`}
              type="button"
              aria-label={MUSCLE_LABEL_AR[h.id]}
              aria-pressed={isSelected}
              disabled={!interactive}
              onClick={(e) => {
                if (!onMuscleClick) return;
                e.stopPropagation();
                onMuscleClick(h.id);
              }}
              className="absolute rounded-[10px] focus-visible:outline-none"
              style={{
                top: `${h.top}%`,
                left: `${h.left}%`,
                width: `${h.width}%`,
                height: `${h.height}%`,
                background: overlay,
                cursor: interactive ? "pointer" : "default",
                transition:
                  "background 200ms ease, filter 200ms ease, box-shadow 200ms ease",
                ...ringStyle,
              }}
              onMouseEnter={(e) => {
                if (!interactive) return;
                (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.15)";
                if (!color) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = "none";
                (e.currentTarget as HTMLButtonElement).style.background = overlay;
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export const BodyModel = memo(BodyModelImpl);
export default BodyModel;
