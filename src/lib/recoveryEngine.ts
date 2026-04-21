/**
 * Pure recovery/fatigue math. No side effects, no IO.
 *
 * Fatigue domain: 0 (fully recovered) → 100 (maximally fatigued).
 * Impact scale: `weight * reps` (kg·reps). A 100kg × 10 set ≈ 1000 impact units.
 * With `ratio=1.0` primary → adds 10 fatigue; with `ratio=0.5` secondary → 5.
 */

/** Hours of sleep/rest required to fully decay from 100 → 0 at the default rate. */
export const DEFAULT_RECOVERY_RATE_PER_HOUR = 0.5;

/** Scales raw impact (weight*reps) before it's applied as fatigue delta. */
export const IMPACT_TO_FATIGUE_SCALE = 0.01;

/** Returns raw set volume = weight * reps (kg·reps). Clamps negatives to 0. */
export function calculateSetImpact(weight: number, reps: number): number {
  const w = Number.isFinite(weight) ? Math.max(0, weight) : 0;
  const r = Number.isFinite(reps) ? Math.max(0, reps) : 0;
  return w * r;
}

/**
 * Apply one set's impact to a current fatigue value.
 * @param current   Current fatigue (0–100)
 * @param impact    Raw weight*reps impact
 * @param ratio     1.0 for primary muscle, 0.5 for secondary
 * @returns         New fatigue, clamped to [0, 100]
 */
export function applyFatigue(current: number, impact: number, ratio: number): number {
  const next = current + impact * ratio * IMPACT_TO_FATIGUE_SCALE;
  return Math.min(100, Math.max(0, next));
}

/**
 * Linear recovery over elapsed time.
 * @param fatigue       Current fatigue 0–100
 * @param hoursPassed   Hours since last update
 * @param rate          Recovery rate per hour (default 0.5)
 */
export function decayFatigue(
  fatigue: number,
  hoursPassed: number,
  rate: number = DEFAULT_RECOVERY_RATE_PER_HOUR,
): number {
  if (!Number.isFinite(hoursPassed) || hoursPassed <= 0) return fatigue;
  return Math.max(0, fatigue - hoursPassed * rate);
}

export interface SetEvent {
  /** When the set was completed. */
  at: Date;
  /** Raw weight × reps impact (use `calculateSetImpact`). */
  impact: number;
  /** 1.0 for primary muscle, 0.5 for secondary. */
  ratio: number;
}

/**
 * Sequentially simulate fatigue for one muscle across a list of sets,
 * decaying between sets and from the last set to `now`.
 */
export function simulateFatigue(
  sets: readonly SetEvent[],
  now: Date = new Date(),
  rate: number = DEFAULT_RECOVERY_RATE_PER_HOUR,
): number {
  if (sets.length === 0) return 0;
  const sorted = [...sets].sort((a, b) => a.at.getTime() - b.at.getTime());
  let fatigue = 0;
  let lastMs = sorted[0].at.getTime();
  for (const s of sorted) {
    const dh = Math.max(0, (s.at.getTime() - lastMs) / 3_600_000);
    fatigue = decayFatigue(fatigue, dh, rate);
    fatigue = applyFatigue(fatigue, s.impact, s.ratio);
    lastMs = s.at.getTime();
  }
  const trailingHours = Math.max(0, (now.getTime() - lastMs) / 3_600_000);
  return decayFatigue(fatigue, trailingHours, rate);
}

export type FatigueStatus = "ready" | "moderate" | "fatigued";

export function fatigueStatus(fatigue: number): FatigueStatus {
  if (fatigue < 30) return "ready";
  if (fatigue < 70) return "moderate";
  return "fatigued";
}

export const FATIGUE_STATUS_LABEL_AR: Record<FatigueStatus, string> = {
  ready: "جاهز",
  moderate: "متوسط",
  fatigued: "متعب",
};
