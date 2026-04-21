/**
 * Muscle Recovery System — canonical muscle taxonomy for heatmap + fatigue engine.
 *
 * 10 logical groups (granular enough for an anatomical body model). All downstream
 * components (`BodyModel.tsx`, `MuscleHeatmap.tsx`, `useMuscleRecovery.ts`) key on
 * `MuscleGroup`. Translations and DB-token resolution live in this file.
 */

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs";

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
] as const;

export interface MuscleState {
  /** Current fatigue level 0..100 (100 = fully fatigued). */
  fatigue: number;
  /** ISO timestamp of the most recent completed set that hit this muscle, or null. */
  lastTrained: string | null;
  /** Total volume load (sum of weight * reps) across the rolling window (7 days). */
  volume: number;
}

export type MuscleStateMap = Record<MuscleGroup, MuscleState>;

export function createEmptyMuscleState(): MuscleState {
  return { fatigue: 0, lastTrained: null, volume: 0 };
}

export function createEmptyMuscleStateMap(): MuscleStateMap {
  return MUSCLE_GROUPS.reduce((acc, g) => {
    acc[g] = createEmptyMuscleState();
    return acc;
  }, {} as MuscleStateMap);
}

/**
 * Curated exercise slug → muscle recruitment. Used as a documented reference
 * and fallback when the `exercise_library` row is missing muscle metadata.
 */
export const MUSCLE_MAP: Record<string, { primary: MuscleGroup[]; secondary: MuscleGroup[] }> = {
  bench_press: { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  incline_bench_press: { primary: ["chest", "shoulders"], secondary: ["triceps"] },
  push_up: { primary: ["chest"], secondary: ["triceps", "shoulders"] },
  squat: { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  front_squat: { primary: ["quads"], secondary: ["glutes", "abs"] },
  deadlift: { primary: ["back", "glutes"], secondary: ["hamstrings"] },
  romanian_deadlift: { primary: ["hamstrings", "glutes"], secondary: ["back"] },
  pull_up: { primary: ["back"], secondary: ["biceps"] },
  lat_pulldown: { primary: ["back"], secondary: ["biceps"] },
  barbell_row: { primary: ["back"], secondary: ["biceps"] },
  overhead_press: { primary: ["shoulders"], secondary: ["triceps"] },
  lateral_raise: { primary: ["shoulders"], secondary: [] },
  bicep_curl: { primary: ["biceps"], secondary: [] },
  hammer_curl: { primary: ["biceps"], secondary: [] },
  tricep_pushdown: { primary: ["triceps"], secondary: [] },
  tricep_extension: { primary: ["triceps"], secondary: [] },
  leg_press: { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  leg_curl: { primary: ["hamstrings"], secondary: [] },
  leg_extension: { primary: ["quads"], secondary: [] },
  hip_thrust: { primary: ["glutes"], secondary: ["hamstrings"] },
  calf_raise: { primary: ["calves"], secondary: [] },
  plank: { primary: ["abs"], secondary: [] },
  crunch: { primary: ["abs"], secondary: [] },
  sit_up: { primary: ["abs"], secondary: [] },
};

/**
 * Normalize a raw muscle token ("Latissimus Dorsi", " chest ", "QUADS")
 * into lowercase-single-spaced form for lookup.
 */
export function normalizeMuscleToken(raw: string): string {
  return raw.toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/** Split a muscle field (possibly "chest, triceps" / "upper back; lats") into tokens. */
export function splitMuscleField(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Accepts JSON array, CSV string, or native array — returns clean token list. */
export function parseSecondaryMuscles(value: string[] | string | null | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((s) => (typeof s === "string" ? splitMuscleField(s) : []));
  }
  const trimmed = String(value).trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).flatMap(splitMuscleField);
    } catch {
      /* fall through */
    }
  }
  return splitMuscleField(trimmed);
}

/** ExerciseDB / exercise_library muscle token → our `MuscleGroup` values. */
const TOKEN_TO_GROUP: Record<string, MuscleGroup[]> = {
  chest: ["chest"],
  pectorals: ["chest"],
  pectoral: ["chest"],
  pecs: ["chest"],

  back: ["back"],
  lats: ["back"],
  "latissimus dorsi": ["back"],
  "upper back": ["back"],
  "middle back": ["back"],
  "lower back": ["back"],
  "erector spinae": ["back"],
  rhomboids: ["back"],
  traps: ["back"],
  trap: ["back"],
  trapezius: ["back"],
  spine: ["back"],

  shoulders: ["shoulders"],
  delts: ["shoulders"],
  deltoids: ["shoulders"],
  "anterior deltoid": ["shoulders"],
  "posterior deltoid": ["shoulders"],
  "rear deltoid": ["shoulders"],
  "front deltoid": ["shoulders"],

  biceps: ["biceps"],
  "biceps brachii": ["biceps"],

  triceps: ["triceps"],
  "triceps brachii": ["triceps"],

  quads: ["quads"],
  quadriceps: ["quads"],

  hamstrings: ["hamstrings"],
  hamstring: ["hamstrings"],

  glutes: ["glutes"],
  gluteal: ["glutes"],
  "gluteus maximus": ["glutes"],
  "gluteus medius": ["glutes"],

  calves: ["calves"],
  calf: ["calves"],
  gastrocnemius: ["calves"],
  soleus: ["calves"],

  abs: ["abs"],
  "rectus abdominis": ["abs"],
  abdominals: ["abs"],
  obliques: ["abs"],
  core: ["abs"],

  // Composites
  legs: ["quads", "hamstrings"],
  "upper legs": ["quads", "hamstrings", "glutes"],
  "lower legs": ["calves"],
  arms: ["biceps", "triceps"],
  "upper arms": ["biceps", "triceps"],

  // Arabic labels as stored in exercise_library.muscle_group
  "صدر": ["chest"],
  "ظهر": ["back"],
  "أكتاف": ["shoulders"],
  "اكتاف": ["shoulders"],
  "بايسبس": ["biceps"],
  "ترايسبس": ["triceps"],
  "أرجل": ["quads", "hamstrings", "glutes", "calves"],
  "ارجل": ["quads", "hamstrings", "glutes", "calves"],
  "فخذ أمامي": ["quads"],
  "فخذ امامي": ["quads"],
  "فخذ خلفي": ["hamstrings"],
  "سمانة": ["calves"],
  "ألوية": ["glutes"],
  "الوية": ["glutes"],
  "كور": ["abs"],
  "بطن": ["abs"],
  "معدة": ["abs"],
  // "كارديو" (cardio) intentionally unmapped — no muscle recruitment.
};

/** Resolve a single raw token to zero or more muscle groups. */
export function resolveTokenToGroups(raw: string): MuscleGroup[] {
  const key = normalizeMuscleToken(raw);
  return TOKEN_TO_GROUP[key] ? [...TOKEN_TO_GROUP[key]] : [];
}

/**
 * Given an `exercise_library` row's `muscle_group` + `secondary_muscles`,
 * return the primary and secondary `MuscleGroup` recruitment. Primary/secondary
 * sets are de-duplicated; primary wins if a muscle appears in both.
 */
export function resolveExerciseRecruitment(
  muscleGroup: string | null | undefined,
  secondaryMuscles: string[] | string | null | undefined,
): { primary: MuscleGroup[]; secondary: MuscleGroup[] } {
  const primary = new Set<MuscleGroup>();
  for (const tok of splitMuscleField(muscleGroup ?? null)) {
    for (const g of resolveTokenToGroups(tok)) primary.add(g);
  }
  const secondary = new Set<MuscleGroup>();
  for (const tok of parseSecondaryMuscles(secondaryMuscles)) {
    for (const g of resolveTokenToGroups(tok)) if (!primary.has(g)) secondary.add(g);
  }
  return { primary: [...primary], secondary: [...secondary] };
}

/** Arabic labels for UI. */
export const MUSCLE_LABEL_AR: Record<MuscleGroup, string> = {
  chest: "الصدر",
  back: "الظهر",
  shoulders: "الأكتاف",
  biceps: "العضدية ذات الرأسين",
  triceps: "العضدية ثلاثية الرؤوس",
  quads: "الفخذ الأمامية",
  hamstrings: "الفخذ الخلفية",
  glutes: "الألوية",
  calves: "السمانة",
  abs: "البطن",
};
