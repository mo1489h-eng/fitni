import type { Exercise, MuscleGroup, WorkoutExercise } from "@/types/workout";

function dedupeById(list: Exercise[]): Exercise[] {
  const seen = new Set<string>();
  return list.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

/**
 * Mock AI suggestions: complement the current day (e.g. bench → triceps / flyes).
 * Replace with real model / embeddings later.
 */
export function getSuggestedExercisesForDay(
  dayExercises: WorkoutExercise[],
  library: Exercise[],
): Exercise[] {
  const presentIds = new Set(dayExercises.map((e) => e.exercise.id));
  const muscles = new Set(dayExercises.map((e) => e.exercise.muscleGroup));
  const names = dayExercises.map((e) => e.exercise.name.toLowerCase());

  const hasBenchLike =
    names.some((n) => n.includes("ضغط") && (n.includes("بار") || n.includes("مستوي"))) ||
    names.some((n) => n.includes("bench")) ||
    muscles.has("chest");

  let candidates: Exercise[] = [];

  if (hasBenchLike) {
    candidates = library.filter(
      (e) =>
        !presentIds.has(e.id) &&
        (e.muscleGroup === "arms" ||
          e.id.includes("tricep") ||
          e.name.includes("ترايس") ||
          e.name.includes("ثلاثي") ||
          (e.muscleGroup === "chest" && (e.name.includes("فلاي") || e.name.includes("كابل")))),
    );
  } else if (muscles.has("back")) {
    candidates = library.filter(
      (e) =>
        !presentIds.has(e.id) &&
        (e.muscleGroup === "arms" || e.muscleGroup === "shoulders" || e.name.includes("بايسب")),
    );
  } else if (muscles.has("legs")) {
    candidates = library.filter(
      (e) => !presentIds.has(e.id) && (e.muscleGroup === "core" || e.muscleGroup === "legs"),
    );
  } else {
    candidates = library.filter((e) => !presentIds.has(e.id));
  }

  return dedupeById(candidates).slice(0, 4);
}

export const MUSCLE_FILTER_OPTIONS: { value: MuscleGroup | "all"; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "chest", label: "صدر" },
  { value: "back", label: "ظهر" },
  { value: "legs", label: "أرجل" },
  { value: "shoulders", label: "أكتاف" },
  { value: "arms", label: "ذراعين" },
  { value: "core", label: "وسط" },
  { value: "cardio", label: "كارديو" },
  { value: "full-body", label: "جسم كامل" },
  { value: "other", label: "أخرى" },
];
