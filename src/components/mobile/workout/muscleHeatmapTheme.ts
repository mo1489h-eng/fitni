import type { MuscleGroupId } from "@/store/workout-store";

export const OLED = "#000000";
export const HEAT_INACTIVE = "#2A2A2A";
export const HEAT_ACCENT = "#4F6F52";
export const HEAT_ACCENT_LIGHT = "#6d9471";
export const HEAT_ACCENT_DEEP = "#355738";

export const MUSCLE_IDS: MuscleGroupId[] = ["chest", "back", "shoulders", "arms", "core", "legs"];

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function lerpRgb(a: string, b: string, t: number): string {
  const u = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(lerp(r1, r2, u), lerp(g1, g2, u), lerp(b1, b2, u));
}

export function recoveryRingColor(fatigue01: number): string {
  const t = Math.max(0, Math.min(1, fatigue01));
  return lerpRgb(HEAT_ACCENT, HEAT_ACCENT_LIGHT, 1 - t * 0.65);
}

export function paintForMuscle(
  id: MuscleGroupId,
  fatigueLevels: Partial<Record<MuscleGroupId, number>>,
  rid: string
): { fill: string; opacity: number } {
  const t = Math.max(0, Math.min(1, fatigueLevels[id] ?? 0));
  if (t < 0.03) {
    return { fill: HEAT_INACTIVE, opacity: 1 };
  }
  return {
    fill: `url(#${rid}-muscle-${id})`,
    opacity: 0.82 + t * 0.18,
  };
}

