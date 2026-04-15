import type { MuscleGroupId } from "@/lib/muscle-fatigue-engine";

/** Map free-text muscle labels (Arabic/English/API) to logical heatmap groups. */
export function mapLabelToMuscleGroup(label: string): MuscleGroupId {
  const k = label.toLowerCase();
  if (k.includes("صدر") || k.includes("chest") || k.includes("pect")) return "chest";
  if (k.includes("ظهر") || k.includes("back") || k.includes("lats") || k.includes("ترابيس") || k.includes("trap")) return "back";
  if (k.includes("كتف") || k.includes("shoulder") || k.includes("delt")) return "shoulders";
  if (
    k.includes("ذراع") ||
    k.includes("arm") ||
    k.includes("biceps") ||
    k.includes("triceps") ||
    k.includes("forearm") ||
    k.includes("ساعد")
  ) {
    return "arms";
  }
  if (k.includes("بطن") || k.includes("core") || k.includes("abs") || k.includes("وسط") || k.includes("oblique")) return "core";
  if (
    k.includes("رجل") ||
    k.includes("leg") ||
    k.includes("ساق") ||
    k.includes("فخذ") ||
    k.includes("quad") ||
    k.includes("hamstring") ||
    k.includes("glute") ||
    k.includes("calf") ||
    k.includes("ألوية")
  ) {
    return "legs";
  }
  return "chest";
}

/**
 * Primary = program muscle_group; secondary = ExerciseDB `secondaryMuscles` + light name heuristics.
 * Every exercise resolves to at least one primary bucket; synergists get secondary load in the workout store.
 */
export function resolveExerciseMuscleGroups(ex: {
  muscleGroup: string;
  name?: string;
  target?: string | null;
  secondaryMuscles?: string[];
}): { primary: MuscleGroupId; secondary: MuscleGroupId[] } {
  const primary = mapLabelToMuscleGroup((ex.muscleGroup || ex.target || "").trim() || "عام");
  const secondary = new Set<MuscleGroupId>();

  const name = (ex.name || "").toLowerCase();
  if (name.includes("deadlift") || name.includes("روماني") || name.includes("rdl")) {
    if (primary === "legs") secondary.add("back");
  }
  if (name.includes("pull-up") || name.includes("pullup") || name.includes("chin") || name.includes("بار علوي")) {
    secondary.add("arms");
  }
  if (name.includes("press") && primary === "shoulders") secondary.add("arms");
  if (name.includes("bench") && primary === "chest") secondary.add("arms");

  for (const s of ex.secondaryMuscles || []) {
    const g = mapLabelToMuscleGroup(s);
    if (g !== primary) secondary.add(g);
  }

  return { primary, secondary: [...secondary] };
}
