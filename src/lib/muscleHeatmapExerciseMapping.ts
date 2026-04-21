import type { Muscle } from "react-body-highlighter";
import type { MuscleGroupId } from "@/store/workout-store";
import { mapMuscleToBucket } from "@/lib/analytics/muscleBuckets";

/**
 * أسماء ExerciseDB (مفتاح مُطبّع) → مفاتيح `react-body-highlighter` الحرفية (`chest`, `upper-back`, …).
 * يُستخدم لاحتساب مجموعات الخريطة ثم تمرير `muscles` إلى مكوّن Model.
 */
export const EXERCISE_TO_LIBRARY_MAP: Record<string, readonly Muscle[]> = {
  // Chest
  pectorals: ["chest"],
  pectoral: ["chest"],
  pecs: ["chest"],
  chest: ["chest"],

  // Back
  lats: ["upper-back"],
  "latissimus dorsi": ["upper-back"],
  rhomboids: ["upper-back"],
  "middle back": ["upper-back"],
  traps: ["trapezius"],
  trap: ["trapezius"],
  trapezius: ["trapezius"],
  "lower back": ["lower-back"],
  "erector spinae": ["lower-back"],

  // Shoulders
  delts: ["front-deltoids", "back-deltoids"],
  deltoids: ["front-deltoids", "back-deltoids"],
  shoulders: ["front-deltoids", "back-deltoids"],
  "anterior deltoid": ["front-deltoids"],
  "rear deltoid": ["back-deltoids"],
  "posterior deltoid": ["back-deltoids"],

  // Arms
  biceps: ["biceps"],
  "biceps brachii": ["biceps"],
  triceps: ["triceps"],
  "triceps brachii": ["triceps"],
  forearms: ["forearm"],
  forearm: ["forearm"],
  brachioradialis: ["forearm"],

  // Core
  abs: ["abs"],
  "rectus abdominis": ["abs"],
  core: ["abs", "obliques"],
  obliques: ["obliques"],
  waist: ["obliques", "abs"],

  // Legs
  quads: ["quadriceps"],
  quadriceps: ["quadriceps"],
  hamstrings: ["hamstring"],
  hamstring: ["hamstring"],
  glutes: ["gluteal"],
  "gluteus maximus": ["gluteal"],
  gluteal: ["gluteal"],
  calves: ["calves"],
  gastrocnemius: ["calves"],
  soleus: ["calves"],
  "upper legs": ["quadriceps", "hamstring", "gluteal"],
  "lower legs": ["calves"],
  "upper arms": ["biceps", "triceps"],
};

/** @deprecated استخدم EXERCISE_TO_LIBRARY_MAP */
export const EXERCISE_ALIAS_TO_RBH = EXERCISE_TO_LIBRARY_MAP;

/** كل مفتاح RBH → مجموعة التطبيق الستّ (خريطة الاستشفاء). */
export const RBH_MUSCLE_TO_GROUP: Record<string, MuscleGroupId> = {
  chest: "chest",
  "upper-back": "back",
  "lower-back": "back",
  trapezius: "back",
  "front-deltoids": "shoulders",
  "back-deltoids": "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearm: "arms",
  abs: "core",
  obliques: "core",
  quadriceps: "legs",
  hamstring: "legs",
  calves: "legs",
  gluteal: "legs",
  adductor: "legs",
  abductors: "legs",
  knees: "legs",
};

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ");
}

/** يفصل حقول مثل "chest, triceps" أو نص عربي/إنجليزي واحد. */
export function muscleFieldToTokens(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** يدعم مصفوفة JSON أو نص مفصول بفواصل إذا رجعت واجهة قيمة غير متوقعة. */
export function normalizeSecondaryMuscles(
  secondary_muscles: string[] | string | null | undefined
): string[] {
  if (secondary_muscles == null) return [];
  if (Array.isArray(secondary_muscles)) {
    return secondary_muscles.flatMap((s) => (typeof s === "string" ? muscleFieldToTokens(s) : []));
  }
  const t = String(secondary_muscles).trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    try {
      const j = JSON.parse(t) as unknown;
      if (Array.isArray(j)) return j.map((x) => String(x)).flatMap((s) => muscleFieldToTokens(s));
    } catch {
      /* treat as plain string */
    }
  }
  return muscleFieldToTokens(t);
}

/**
 * يحوّل صف `exercise_library` (أساسي + عضلات ثانوية) إلى مجموعات خريطة الاستشفاء.
 * يستخدم `EXERCISE_TO_LIBRARY_MAP` ثم `mapMuscleToBucket` (العربية / القيم غير المعروفة).
 */
export function exerciseLibraryToHeatmapGroups(
  muscle_group: string | null | undefined,
  secondary_muscles: string[] | string | null | undefined
): MuscleGroupId[] {
  const groups = new Set<MuscleGroupId>();
  const tokens: string[] = [
    ...muscleFieldToTokens(muscle_group ?? null),
    ...normalizeSecondaryMuscles(secondary_muscles),
  ];

  for (const raw of tokens) {
    const key = normalizeToken(raw);
    const rbhList = EXERCISE_TO_LIBRARY_MAP[key];
    if (rbhList) {
      for (const rbh of rbhList) {
        const g = RBH_MUSCLE_TO_GROUP[rbh];
        if (g) groups.add(g);
      }
      continue;
    }
    const fallback = mapMuscleToBucket(raw);
    if (fallback !== "other") groups.add(fallback as MuscleGroupId);
  }

  return [...groups];
}
