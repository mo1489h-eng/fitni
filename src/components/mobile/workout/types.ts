import type { PlanExercise } from "@/lib/workoutDayPlan";

export type { PlanExercise };

export type WorkoutPhase = "loading" | "work" | "rest" | "complete";

export type CompletedSetKey = string;

export type CompletedSetValue = {
  weight: number;
  reps: number;
  /** ISO timestamp from `session_logs.updated_at` (fallback `created_at`) for last-write-wins merges */
  syncedAt?: string;
  /** True when this set beat the client's previous best weight for this exercise. */
  isPr?: boolean;
};

export type LastSetInfo = {
  weight: number;
  reps: number;
  at: string;
} | null;

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  weight: number;
};

export type PersistedWorkoutV1 = {
  v: 1;
  sessionId: string;
  clientId: string;
  programDayId: string;
  programName: string;
  plan: PlanExercise[];
  exerciseIndex: number;
  setWithinExercise: number;
  completed: Record<CompletedSetKey, CompletedSetValue>;
  startedAtMs: number;
};

export const STORAGE_KEY = "coachbase_workout_v1";
