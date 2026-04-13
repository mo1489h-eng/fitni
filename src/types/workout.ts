/** Muscle / movement tags for exercise library and analytics. */
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "full-body"
  | "cardio"
  | "other";

export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell" | "band" | "other";

export interface Exercise {
  id: string;
  name: string;
  videoUrl: string | null;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
}

export type SetType = "normal" | "warm-up" | "drop-set";

export interface Set {
  id: string;
  type: SetType;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  restTime: number | null;
}

/** Runtime identity for DnD and optimistic UI (stable per row in the builder). */
export interface WorkoutExercise {
  instanceId: string;
  exercise: Exercise;
  sets: Set[];
  notes: string;
  supersetId?: string;
}

export type WorkoutDayType = "rest" | "workout" | "active-recovery";

export interface WorkoutDay {
  id: string;
  title: string;
  exercises: WorkoutExercise[];
  type: WorkoutDayType;
}

export interface WorkoutProgram {
  id: string;
  title: string;
  description: string;
  weeksCount: number;
  days: WorkoutDay[];
}
