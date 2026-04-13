import { z } from "zod";

/** Matches `MuscleGroup` in `@/types/workout`. */
export const muscleGroupSchema = z.enum([
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
  "full-body",
  "cardio",
  "other",
]);

export const equipmentSchema = z.enum([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
]);

export const setTypeSchema = z.enum(["normal", "warm-up", "drop-set"]);

export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  videoUrl: z.string().nullable(),
  muscleGroup: muscleGroupSchema,
  equipment: equipmentSchema,
});

export const setSchema = z.object({
  id: z.string().min(1),
  type: setTypeSchema,
  weight: z.number().nullable(),
  reps: z.number().nullable(),
  rpe: z.number().nullable(),
  rir: z.number().nullable(),
  restTime: z.number().nullable(),
});

export const workoutExerciseSchema = z.object({
  instanceId: z.string().min(1),
  exercise: exerciseSchema,
  sets: z.array(setSchema),
  notes: z.string(),
  supersetId: z.string().optional(),
});

export const workoutDayTypeSchema = z.enum(["rest", "workout", "active-recovery"]);

export const workoutDaySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  exercises: z.array(workoutExerciseSchema),
  type: workoutDayTypeSchema,
});

export const workoutProgramSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  weeksCount: z.number().int().nonnegative(),
  days: z.array(workoutDaySchema),
});

export type WorkoutProgramParsed = z.infer<typeof workoutProgramSchema>;

export function safeParseWorkoutProgram(data: unknown) {
  return workoutProgramSchema.safeParse(data);
}

export function parseWorkoutProgramStrict(data: unknown) {
  return workoutProgramSchema.parse(data);
}

/** Business rules beyond structural Zod validation (coach-facing program quality). */
export type WorkoutProgramIssueCode = "EMPTY_WORKOUT_DAY" | "EXERCISE_NO_SETS";

export type WorkoutProgramIssue =
  | { code: "EMPTY_WORKOUT_DAY"; dayId: string; dayTitle: string }
  | { code: "EXERCISE_NO_SETS"; dayId: string; dayTitle: string; exerciseName: string; instanceId: string };

export function collectWorkoutProgramIssues(program: z.infer<typeof workoutProgramSchema>): WorkoutProgramIssue[] {
  const issues: WorkoutProgramIssue[] = [];
  for (const day of program.days) {
    if (day.type === "workout" && day.exercises.length === 0) {
      issues.push({
        code: "EMPTY_WORKOUT_DAY",
        dayId: day.id,
        dayTitle: day.title,
      });
    }
    for (const ex of day.exercises) {
      if (ex.sets.length === 0) {
        issues.push({
          code: "EXERCISE_NO_SETS",
          dayId: day.id,
          dayTitle: day.title,
          exerciseName: ex.exercise.name,
          instanceId: ex.instanceId,
        });
      }
    }
  }
  return issues;
}

export function validateWorkoutProgram(data: unknown): {
  ok: boolean;
  program?: z.infer<typeof workoutProgramSchema>;
  zodError?: z.ZodError;
  issues: WorkoutProgramIssue[];
} {
  const parsed = workoutProgramSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, zodError: parsed.error, issues: [] };
  }
  const issues = collectWorkoutProgramIssues(parsed.data);
  return { ok: true, program: parsed.data, issues };
}

/** Human-readable Zod issues for coach-facing toasts (Arabic path labels where helpful). */
export function formatWorkoutProgramZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.map(String).join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join(" · ");
}

export function formatWorkoutProgramIssuesArabic(issues: WorkoutProgramIssue[]): string {
  return issues
    .map((i) => {
      if (i.code === "EMPTY_WORKOUT_DAY") {
        return `اليوم «${i.dayTitle}» نوعه تدريب لكنه بلا تمارين`;
      }
      return `التمرين «${i.exerciseName}» بلا مجموعات`;
    })
    .join(" · ");
}
