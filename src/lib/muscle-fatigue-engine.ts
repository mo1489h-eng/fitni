/** Logical muscle buckets: heatmap paths + recovery engine (aligned with MuscleRecoveryMap). */
export type MuscleGroupId = "chest" | "back" | "shoulders" | "arms" | "core" | "legs";

/**
 * Per-muscle baseline recovery window (hours) before linear decay completes.
 * Tuned to product spec: legs/back 72h, chest/shoulders 48h, arms/core 24h (biceps/abs family).
 */
export const BASE_RECOVERY_HOURS: Record<MuscleGroupId, number> = {
  legs: 72,
  back: 72,
  chest: 48,
  shoulders: 48,
  arms: 24,
  core: 24,
};

export type MuscleRecoveryState = {
  initialFatigue: number;
  totalRecoveryHours: number;
  lastStimulusAt: string;
};

const RPE_HIGH_THRESHOLD = 8;
const RPE_HIGH_MULTIPLIER = 1.25;

/**
 * Total recovery window for a stimulus: scales with tonnage, extends when RPE > 8.
 */
export function calculateRecoveryTime(muscleId: MuscleGroupId, volume: number, rpe: number): number {
  const base = BASE_RECOVERY_HOURS[muscleId] ?? 48;
  const v = Math.max(0, volume);
  const volumeScale = 1 + Math.log10(10 + v) / 12;
  let total = base * volumeScale;
  if (rpe > RPE_HIGH_THRESHOLD) total *= RPE_HIGH_MULTIPLIER;
  return Math.min(120, Math.max(6, total));
}

/** Maps set tonnage + RPE to a 0–1 fatigue impulse (capped). */
export function fatigueDeltaFromVolume(volumeLoad: number, rpe: number): number {
  const v = Math.max(0, volumeLoad);
  const r = Math.max(1, Math.min(10, rpe));
  const base = Math.min(0.38, Math.log10(10 + v) / 14);
  const intensity = 0.65 + r * 0.035;
  return Math.min(0.45, base * intensity);
}

/**
 * Linear recovery toward fresh: CurrentFatigue = MaxFatigue × (1 − hoursSinceStimulus / RecoveryWindow).
 */
export function getCurrentFatigue(muscleId: MuscleGroupId, state: MuscleRecoveryState | undefined, nowMs: number): number {
  void muscleId;
  if (!state) return 0;
  const t0 = new Date(state.lastStimulusAt).getTime();
  const hours = (nowMs - t0) / 3600000;
  if (hours <= 0) return Math.max(0, Math.min(1, state.initialFatigue));
  if (hours >= state.totalRecoveryHours) return 0;
  const f = state.initialFatigue * (1 - hours / state.totalRecoveryHours);
  return Math.max(0, Math.min(1, f));
}

export function hoursUntilFullRecovery(state: MuscleRecoveryState | undefined, nowMs: number): number | null {
  if (!state) return null;
  const t0 = new Date(state.lastStimulusAt).getTime();
  const hours = (nowMs - t0) / 3600000;
  if (hours >= state.totalRecoveryHours) return 0;
  return Math.max(0, state.totalRecoveryHours - hours);
}

export function formatDurationAr(hours: number): string {
  if (hours <= 0) return "الآن";
  const totalMin = Math.ceil(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}د`;
  return `${h}س ${m}د`;
}

export function recoveryStatusLabel(fatigue01: number): string {
  if (fatigue01 < 0.15) return "جاهز تقريباً";
  if (fatigue01 < 0.35) return "استشفاء خفيف";
  if (fatigue01 < 0.6) return "استشفاء متوسط";
  if (fatigue01 < 0.85) return "استشفاء عميق";
  return "إجهاد عالٍ";
}

/**
 * Heatmap color bands (fatigue 0–1):
 * ~0–20% healthy / neutral greens, 50–80% inflamed orange, 90%+ critical crimson.
 */
export function fatigueHeatColor(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  if (x <= 0.2) {
    const k = x / 0.2;
    return `rgb(${34 + k * 40}, ${160 + k * 35}, ${110 + k * 30})`;
  }
  if (x < 0.5) {
    const k = (x - 0.2) / 0.3;
    return `rgb(${74 + k * 90}, ${195 - k * 45}, ${140 - k * 50})`;
  }
  if (x < 0.8) {
    const k = (x - 0.5) / 0.3;
    return `rgb(${164 + k * 55}, ${150 - k * 70}, ${90 - k * 40})`;
  }
  if (x < 0.9) {
    const k = (x - 0.8) / 0.1;
    return `rgb(${219 - k * 25}, ${80 - k * 30}, ${50 - k * 10})`;
  }
  const k = (x - 0.9) / 0.1;
  return `rgb(${194 - k * 70}, ${50 - k * 15}, ${40 - k * 10})`;
}

export const SECONDARY_FATIGUE_FACTOR = 0.42;
