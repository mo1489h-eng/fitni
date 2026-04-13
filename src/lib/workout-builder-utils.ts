import type { Exercise, Set, WorkoutDay, WorkoutExercise, WorkoutProgram } from "@/types/workout";

import { randomUUID } from "@/lib/random-id";

export function newSet(partial?: Partial<Set>): Set {
  return {
    id: randomUUID(),
    type: partial?.type ?? "normal",
    weight: partial?.weight ?? null,
    reps: partial?.reps ?? null,
    rpe: partial?.rpe ?? null,
    rir: partial?.rir ?? null,
    restTime: partial?.restTime ?? 90,
  };
}

export type TrainingGoal = "hypertrophy" | "strength";

export function createWorkoutExercise(exercise: Exercise): WorkoutExercise {
  return {
    instanceId: randomUUID(),
    exercise,
    notes: "",
    sets: [newSet({ type: "warm-up" }), newSet({ type: "normal" })],
  };
}

/** Preset set schemes for Smart Fill (mock). */
export function createWorkoutExerciseForGoal(exercise: Exercise, goal: TrainingGoal): WorkoutExercise {
  if (goal === "strength") {
    return {
      instanceId: randomUUID(),
      exercise,
      notes: "",
      sets: [
        newSet({ type: "warm-up", reps: 5, restTime: 120 }),
        newSet({ type: "normal", reps: 5, restTime: 180 }),
        newSet({ type: "normal", reps: 5, restTime: 180 }),
        newSet({ type: "normal", reps: 3, restTime: 180 }),
      ],
    };
  }
  return {
    instanceId: randomUUID(),
    exercise,
    notes: "",
    sets: [
      newSet({ type: "warm-up", reps: 12, restTime: 90 }),
      newSet({ type: "normal", reps: 10, restTime: 120 }),
      newSet({ type: "normal", reps: 8, restTime: 120 }),
    ],
  };
}

export function cloneDaysWithNewIds(days: WorkoutDay[]): WorkoutDay[] {
  return days.map((d) => ({
    ...d,
    id: randomUUID(),
    exercises: d.exercises.map((ex) => ({
      ...ex,
      instanceId: randomUUID(),
      sets: ex.sets.map((s) => ({ ...s, id: randomUUID() })),
    })),
  }));
}

/** Deep-clone a validated program with fresh top-level and nested IDs (safe apply from templates / AI). */
export function hydrateWorkoutProgramIds(program: WorkoutProgram): WorkoutProgram {
  return {
    ...program,
    id: randomUUID(),
    days: cloneDaysWithNewIds(program.days),
  };
}
