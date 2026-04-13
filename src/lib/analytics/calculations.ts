/** Volume for one logged set: weight × reps (per spec). */
export function setVolumeKg(weight: number, reps: number): number {
  return Math.max(0, weight) * Math.max(0, reps);
}

export type TimeRangeKey = "4w" | "3m" | "6m" | "all";

export function rangeStartDate(key: TimeRangeKey): Date | null {
  const now = new Date();
  if (key === "all") return null;
  const d = new Date(now);
  if (key === "4w") d.setDate(d.getDate() - 28);
  if (key === "3m") d.setMonth(d.getMonth() - 3);
  if (key === "6m") d.setMonth(d.getMonth() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseYmd(s: string): Date {
  return new Date(`${s}T12:00:00`);
}

/** Non-overlapping consecutive calendar-day runs (workout on that day). */
export function buildDayRuns(sortedUniqueAsc: string[]): { start: string; end: string; len: number }[] {
  const days = [...new Set(sortedUniqueAsc)].sort();
  if (days.length === 0) return [];
  const runs: { start: string; end: string; len: number }[] = [];
  let start = days[0];
  let len = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = parseYmd(days[i - 1]);
    const cur = parseYmd(days[i]);
    const gap = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (gap === 1) {
      len += 1;
    } else {
      runs.push({ start, end: days[i - 1], len });
      start = days[i];
      len = 1;
    }
  }
  runs.push({ start, end: days[days.length - 1], len });
  return runs;
}

export function longestStreak(sortedUniqueAsc: string[]): number {
  const runs = buildDayRuns(sortedUniqueAsc);
  return runs.reduce((m, r) => Math.max(m, r.len), 0);
}

/**
 * Current streak: consecutive workout days ending on the last workout day,
 * only if that day is today or yesterday (otherwise broke streak).
 */
export function currentStreak(sortedUniqueAsc: string[]): number {
  if (sortedUniqueAsc.length === 0) return 0;
  const set = new Set(sortedUniqueAsc);
  const sorted = [...set].sort();
  const last = sorted[sorted.length - 1];
  const lastD = parseYmd(last);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const gap = Math.round((today.getTime() - lastD.getTime()) / 86400000);
  if (gap > 1) return 0;

  let streak = 0;
  const d = new Date(lastD);
  while (set.has(toYmd(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function streakStats(sortedUniqueAsc: string[]): {
  current: number;
  longest: number;
  history: { start: string; end: string; len: number }[];
} {
  const history = buildDayRuns(sortedUniqueAsc);
  return {
    current: currentStreak(sortedUniqueAsc),
    longest: longestStreak(sortedUniqueAsc),
    history,
  };
}

export function weekKeyMonday(d: Date): string {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return toYmd(x);
}
