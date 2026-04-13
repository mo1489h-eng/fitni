import type { WorkoutDay } from "@/types/workout";

/** Total set count across all exercises in a day (daily volume indicator). */
export function totalSetsForDay(day: WorkoutDay): number {
  return day.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}
