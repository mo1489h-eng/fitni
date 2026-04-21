import { supabase } from "@/integrations/supabase/client";
import { computeProgramDayPosition } from "@/lib/programStartDate";

export interface ProgramDayLite {
  id: string;
  day_name?: string | null;
  day_order?: number | null;
  exercises?: ReadonlyArray<unknown> | null;
}

export type TodayWorkoutPick =
  | {
      kind: "ready";
      day: ProgramDayLite;
      /**
       * `start_date` → rotation position computed from the coach-set
       *                 `program_start_date`.
       * `weekday`     → matched by the day's Arabic weekday name (legacy).
       * `next_incomplete` → fallback: first ordered day not yet done today.
       */
      reason: "start_date" | "weekday" | "next_incomplete";
    }
  | { kind: "all_done" }
  | { kind: "no_program" };

const ARABIC_WEEKDAYS: readonly string[] = [
  "أحد",
  "اثنين",
  "ثلاثاء",
  "أربعاء",
  "خميس",
  "جمعة",
  "سبت",
];

function hasExercises(day: ProgramDayLite): boolean {
  return Array.isArray(day.exercises) && day.exercises.length > 0;
}

/**
 * Pick the best workout day to surface to a client today.
 *
 * Priority:
 *   1. If a coach-configured `startDate` is supplied, use
 *      `(today - startDate) mod numDays` to lock the rotation. The day is
 *      only marked as "ready" when it hasn't already been completed today.
 *   2. Legacy-friendly: a day whose `day_name` matches today's Arabic
 *      weekday AND hasn't been completed today.
 *   3. Option A — "next incomplete": the first (by `day_order`) day with
 *      exercises that hasn't been completed today.
 *   4. If all eligible days are already completed today → `all_done`.
 *   5. If no day in the program has any exercise → `no_program`.
 */
export function pickTodayWorkoutDay(
  days: ReadonlyArray<ProgramDayLite> | null | undefined,
  completedTodayDayIds: ReadonlySet<string>,
  startDate?: Date | null,
): TodayWorkoutPick {
  const valid = (days ?? [])
    .filter(hasExercises)
    .slice()
    .sort((a, b) => (a.day_order ?? 0) - (b.day_order ?? 0));

  if (valid.length === 0) return { kind: "no_program" };

  if (startDate) {
    const { dayIndex, notStartedYet } = computeProgramDayPosition(
      startDate,
      valid.length,
    );
    if (!notStartedYet) {
      const target = valid[dayIndex];
      if (target && !completedTodayDayIds.has(target.id)) {
        return { kind: "ready", day: target, reason: "start_date" };
      }
      if (target && completedTodayDayIds.has(target.id)) {
        return { kind: "all_done" };
      }
    }
  }

  const todayName = ARABIC_WEEKDAYS[new Date().getDay()] ?? "";
  if (todayName) {
    const byWeekday = valid.find(
      (d) =>
        (d.day_name ?? "").includes(todayName) &&
        !completedTodayDayIds.has(d.id),
    );
    if (byWeekday) return { kind: "ready", day: byWeekday, reason: "weekday" };
  }

  const byOrder = valid.find((d) => !completedTodayDayIds.has(d.id));
  if (byOrder) return { kind: "ready", day: byOrder, reason: "next_incomplete" };

  return { kind: "all_done" };
}

/**
 * Fetch the `program_day_id`s the client has completed **today** (local day).
 * Used to skip days that are already done so we can surface the next one.
 *
 * Returns an empty set on any error so the UI degrades gracefully to the
 * "pick the first available day" path instead of hiding all workouts.
 */
export async function fetchCompletedTodayDayIds(
  clientId: string,
): Promise<Set<string>> {
  const result = new Set<string>();
  if (!clientId) return result;

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("program_day_id")
    .eq("client_id", clientId)
    .gte("completed_at", startOfDay)
    .not("completed_at", "is", null);

  if (error) return result;
  for (const row of (data ?? []) as Array<{ program_day_id?: string | null }>) {
    if (row.program_day_id) result.add(row.program_day_id);
  }
  return result;
}

export const ALL_DAYS_DONE_MESSAGE_AR = "برنامجك مكتمل لهذا الأسبوع";
export const NO_WORKOUT_TODAY_MESSAGE_AR = "لا يوجد تمرين مجدول لليوم";
