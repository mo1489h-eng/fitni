/** Build a flat workout plan from portal program JSON for one program day */

export type PlanExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds: number;
  programDayId: string;
  isWarmup: boolean;
  muscleGroup: string;
  instructionsAr: string | null;
};

export function buildWorkoutPlanFromDay(programDay: {
  id: string;
  exercises: Array<{
    id: string;
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    rest_seconds?: number;
    exercise_order?: number;
    is_warmup?: boolean;
    muscle_group?: string;
    instructions_ar?: string | null;
  }>;
}): PlanExercise[] {
  const sorted = [...(programDay.exercises || [])].sort(
    (a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0)
  );
  return sorted.map((e) => ({
    exerciseId: e.id,
    name: e.name,
    sets: Math.max(1, Number(e.sets) || 1),
    reps: Math.max(0, Number(e.reps) || 0),
    weight: Number(e.weight) || 0,
    restSeconds: Math.max(0, Number(e.rest_seconds) ?? 60),
    programDayId: programDay.id,
    isWarmup: !!e.is_warmup,
    muscleGroup: (e.muscle_group || "عام").trim() || "عام",
    instructionsAr: e.instructions_ar ?? null,
  }));
}

export function totalSetsInPlan(plan: PlanExercise[]): number {
  return plan.reduce((sum, e) => sum + e.sets, 0);
}
