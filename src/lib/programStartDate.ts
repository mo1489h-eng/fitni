/**
 * Helpers for computing which program day a trainee should see *today*,
 * based on the `program_start_date` set by the coach when the program
 * was assigned.
 *
 * The math follows the spec:
 *   calendarDay   = (today - startDate) + 1   // "اليوم 7 من 30"
 *   dayIndex      = (today - startDate) mod numWorkoutDays
 *
 * `today` and `startDate` are compared in the user's local timezone, at
 * midnight, so a workout logged at 23:55 still counts for "today".
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ARABIC_MONTHS_FULL: readonly string[] = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Parse a start_date value coming from Supabase. Accepts:
 *   - `YYYY-MM-DD` (the DATE column form)
 *   - `YYYY-MM-DDTHH:mm:ss...` (if ever upcasted to timestamp)
 *   - a `Date` instance
 *   - `null` / `undefined`  → returns null
 */
export function parseStartDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toLocalMidnight(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Pull just the date portion to avoid tz drift.
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Number of whole days between `startDate` and `today` (local time).
 * Negative when the program hasn't started yet.
 */
export function daysSinceStart(
  startDate: Date,
  today: Date = new Date(),
): number {
  const a = toLocalMidnight(startDate).getTime();
  const b = toLocalMidnight(today).getTime();
  return Math.floor((b - a) / MS_PER_DAY);
}

export interface ProgramDayPosition {
  /** 1-indexed calendar day. `1` on start_date, `2` tomorrow, etc. */
  calendarDay: number;
  /** 0-indexed position inside the workout-day rotation. */
  dayIndex: number;
  /** True when today is strictly before the configured start date. */
  notStartedYet: boolean;
}

/**
 * Compute which program day (0-indexed) the trainee is on today,
 * given the coach-picked `startDate` and the number of distinct
 * workout days in the rotation.
 */
export function computeProgramDayPosition(
  startDate: Date,
  numWorkoutDays: number,
  today: Date = new Date(),
): ProgramDayPosition {
  const delta = daysSinceStart(startDate, today);
  if (delta < 0) {
    return { calendarDay: 0, dayIndex: 0, notStartedYet: true };
  }
  const safeDays = Math.max(1, numWorkoutDays);
  return {
    calendarDay: delta + 1,
    dayIndex: ((delta % safeDays) + safeDays) % safeDays,
    notStartedYet: false,
  };
}

/** "15 أبريل" style. */
export function formatArabicShortDate(d: Date): string {
  return `${d.getDate()} ${ARABIC_MONTHS_FULL[d.getMonth()] ?? ""}`.trim();
}

/** "15 أبريل 2026" style. */
export function formatArabicLongDate(d: Date): string {
  return `${d.getDate()} ${ARABIC_MONTHS_FULL[d.getMonth()] ?? ""} ${d.getFullYear()}`.trim();
}

/**
 * Convert a `Date` to the `YYYY-MM-DD` format Supabase's DATE columns expect,
 * using local-time components (not UTC) so the date picker value matches.
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today in `YYYY-MM-DD`, local time. */
export function todayISODate(): string {
  return toISODate(new Date());
}
