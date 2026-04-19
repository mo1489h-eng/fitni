/**
 * Wikimedia Commons — "Muscles front and back.svg" (OpenStax / Tomáš Kebert / umimeto.org, CC BY-SA 4.0).
 * https://commons.wikimedia.org/wiki/File:Muscles_front_and_back.svg
 */
import type { MuscleGroupId } from "@/store/workout-store";
import { WIKIMEDIA_VB_H, WIKIMEDIA_VB_W, paintForMuscle } from "./muscleHeatmapTheme";

import musclesSvgRaw from "@/assets/anatomical/muscles-front-back-wikimedia.svg?raw";

export const WIKIMEDIA_MUSCLES_SVG_RAW = musclesSvgRaw;

const MID_X = WIKIMEDIA_VB_W / 2;
const STROKE = "rgba(255,255,255,0.15)";
const STROKE_W = "0.35";

function stripFillFromStyle(style: string | null): string {
  if (!style) return "";
  return style
    .split(";")
    .filter((s) => {
      const t = s.trim().toLowerCase();
      return !t.startsWith("fill:") && !t.startsWith("fill-opacity:");
    })
    .join(";");
}

function isDecorativeNonMuscle(el: SVGElement): boolean {
  const st = el.getAttribute("style") || "";
  if (st.includes("fill:none")) return true;
  if (st.includes("fill:#fde8cc")) return true;
  if (st.includes("stroke:#ffff00")) return true;
  return false;
}

function classifyFront(nx: number, ny: number): MuscleGroupId {
  if (ny >= 0.48) return "legs";
  if ((nx < 0.2 || nx > 0.8) && ny >= 0.14 && ny < 0.58) return "arms";
  if (ny >= 0.1 && ny < 0.32 && (nx < 0.36 || nx > 0.64)) return "shoulders";
  if (ny >= 0.16 && ny < 0.4 && nx > 0.26 && nx < 0.74) return "chest";
  if (ny >= 0.28 && ny < 0.52 && nx > 0.3 && nx < 0.7) return "core";
  if (ny >= 0.4) return "legs";
  return "core";
}

function classifyBack(nx: number, ny: number): MuscleGroupId {
  if (ny >= 0.48) return "legs";
  if ((nx < 0.18 || nx > 0.82) && ny >= 0.14 && ny < 0.58) return "arms";
  if (ny >= 0.1 && ny < 0.32 && (nx < 0.36 || nx > 0.64)) return "shoulders";
  if (ny >= 0.16 && ny < 0.44 && nx > 0.26 && nx < 0.74) return "back";
  if (ny >= 0.28 && ny < 0.52 && nx > 0.3 && nx < 0.7) return "core";
  if (ny >= 0.4) return "legs";
  return "back";
}

function classifyMuscle(cx: number, cy: number, side: "front" | "back"): MuscleGroupId | null {
  if (side === "front") {
    if (cx >= MID_X) return null;
    const nx = cx / MID_X;
    const ny = cy / WIKIMEDIA_VB_H;
    return classifyFront(nx, ny);
  }
  if (cx < MID_X) return null;
  const nx = (cx - MID_X) / (WIKIMEDIA_VB_W - MID_X);
  const ny = cy / WIKIMEDIA_VB_H;
  return classifyBack(nx, ny);
}

function collectPaintables(root: SVGGElement, out: SVGElement[]) {
  for (const el of root.querySelectorAll("path, use")) {
    if (el.closest("metadata")) continue;
    out.push(el as SVGElement);
  }
}

export function mountWikimediaLayer(targetG: SVGGElement, heatDefs: SVGDefsElement): void {
  if (targetG.querySelector("#layer2")) return;

  const doc = new DOMParser().parseFromString(WIKIMEDIA_MUSCLES_SVG_RAW, "image/svg+xml");
  const src = doc.documentElement;
  const srcDefs = src.querySelector("defs");
  const layer = src.querySelector("#layer2") as SVGGElement | null;

  if (srcDefs && !heatDefs.querySelector("#path-effect1359")) {
    while (srcDefs.firstChild) {
      heatDefs.appendChild(srcDefs.firstChild);
    }
  }
  if (layer) {
    targetG.appendChild(layer);
  }
}

export function applyWikimediaMusclePaint(
  muscleRoot: SVGGElement,
  opts: {
    side: "front" | "back";
    fatigueLevels: Partial<Record<MuscleGroupId, number>>;
    onTap: (id: MuscleGroupId) => void;
    rid: string;
    inflId: string;
  }
): void {
  const { side, fatigueLevels, onTap, rid, inflId } = opts;
  const paintables: SVGElement[] = [];
  collectPaintables(muscleRoot, paintables);

  for (const el of paintables) {
    if (el instanceof SVGPathElement && isDecorativeNonMuscle(el)) {
      el.style.pointerEvents = "none";
      continue;
    }

    let bbox: DOMRect;
    try {
      bbox = el.getBBox();
    } catch {
      continue;
    }

    const area = bbox.width * bbox.height;
    if (area < 0.8 && el instanceof SVGPathElement) {
      el.style.pointerEvents = "none";
      continue;
    }

    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const muscle = classifyMuscle(cx, cy, side);

    if (muscle == null) {
      el.style.opacity = "0.14";
      el.style.pointerEvents = "none";
      el.removeAttribute("data-fitni-muscle");
      continue;
    }

    el.style.opacity = "";
    el.style.pointerEvents = "auto";
    el.setAttribute("data-fitni-muscle", muscle);

    if (el instanceof SVGPathElement) {
      const cleaned = stripFillFromStyle(el.getAttribute("style"));
      el.setAttribute("style", cleaned);
    }

    const pr = paintForMuscle(muscle, fatigueLevels, rid);
    const fatigueT = Math.max(0, Math.min(1, fatigueLevels[muscle] ?? 0));
    el.style.setProperty("fill", pr.fill);
    el.style.setProperty("fill-opacity", String(Math.min(1, pr.opacity)));
    el.style.setProperty("stroke", STROKE);
    el.style.setProperty("stroke-width", STROKE_W);
    if (fatigueT > 0.52) el.style.setProperty("filter", `url(#${inflId})`);
    else el.style.removeProperty("filter");

    el.style.cursor = "pointer";
    el.onclick = (e) => {
      e.stopPropagation();
      onTap(muscle);
    };
  }
}
