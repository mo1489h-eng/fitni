import { workoutDaySchema } from "@/lib/validations/workout";

/** Persisted slice of the workout builder (no actions). */
export type BuilderDataSlice = {
  programId: string;
  title: string;
  description: string;
  weeksCount: number;
  activeWeekIndex: number;
  weekDays: unknown;
};

/**
 * Throws if the builder data slice is structurally invalid (corrupt localStorage).
 */
export function assertBuilderDataSliceValid(data: BuilderDataSlice): void {
  const { programId, title, description, weeksCount, activeWeekIndex, weekDays } = data;

  if (typeof programId !== "string" || programId.length === 0) {
    throw new Error("invalid programId");
  }
  if (typeof title !== "string" || typeof description !== "string") {
    throw new Error("invalid title/description");
  }
  if (typeof weeksCount !== "number" || !Number.isInteger(weeksCount) || weeksCount < 1) {
    throw new Error("invalid weeksCount");
  }
  if (!Array.isArray(weekDays) || weekDays.length !== weeksCount) {
    throw new Error("invalid weekDays length");
  }
  if (
    typeof activeWeekIndex !== "number" ||
    !Number.isInteger(activeWeekIndex) ||
    activeWeekIndex < 0 ||
    activeWeekIndex >= weeksCount
  ) {
    throw new Error("invalid activeWeekIndex");
  }

  for (const week of weekDays) {
    if (!Array.isArray(week)) throw new Error("invalid week");
    for (const day of week) {
      workoutDaySchema.parse(day);
    }
  }
}
