/**
 * Heatmap color palette — muted, premium, no neon. Pairs with `fatigueStatus`.
 *
 *   fatigue < 30  → ready     (#4F6F52)
 *   fatigue < 70  → moderate  (#C2A878)
 *   fatigue ≥ 70  → fatigued  (#7A2E2E)
 *
 * Inactive (not trained / 0 fatigue) muscles render with `MUSCLE_INACTIVE`.
 */

export const MUSCLE_COLOR_READY = "#4F6F52";
export const MUSCLE_COLOR_MODERATE = "#C2A878";
export const MUSCLE_COLOR_FATIGUED = "#7A2E2E";
export const MUSCLE_INACTIVE = "#1F1F21";
export const MUSCLE_STROKE = "rgba(255,255,255,0.08)";
export const MUSCLE_STROKE_ACTIVE = "rgba(255,255,255,0.16)";

export function getMuscleColor(fatigue: number): string {
  if (!Number.isFinite(fatigue) || fatigue <= 0) return MUSCLE_INACTIVE;
  if (fatigue < 30) return MUSCLE_COLOR_READY;
  if (fatigue < 70) return MUSCLE_COLOR_MODERATE;
  return MUSCLE_COLOR_FATIGUED;
}

export const LEGEND: Array<{ color: string; labelAr: string; range: string }> = [
  { color: MUSCLE_INACTIVE, labelAr: "غير مُدرَّبة", range: "—" },
  { color: MUSCLE_COLOR_READY, labelAr: "جاهز", range: "0–30%" },
  { color: MUSCLE_COLOR_MODERATE, labelAr: "متوسط", range: "30–70%" },
  { color: MUSCLE_COLOR_FATIGUED, labelAr: "متعب", range: "70–100%" },
];
