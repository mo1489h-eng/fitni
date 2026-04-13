import exercisesDb from "@/data/exercises-db.json";
import type { ExerciseDBItem } from "@/lib/exercise-translations";

export type LocalExerciseRow = (typeof exercisesDb)[number];

const rows = exercisesDb as LocalExerciseRow[];

/** Map non–ExerciseDB-style body labels to canonical tabs (bodypart grid). */
const BODY_PART_ALIASES: Record<string, string> = {
  "lower back": "back",
};

function canonicalBodyPart(p: string): string {
  return BODY_PART_ALIASES[p.toLowerCase()] ?? p.toLowerCase();
}

export function rowToExerciseDBItem(row: LocalExerciseRow): ExerciseDBItem {
  return {
    id: row.id,
    name: row.name,
    name_ar: row.name_ar,
    bodyPart: row.bodyPart,
    target: row.target,
    equipment: row.equipment,
    gifUrl: row.gifUrl || "",
    secondaryMuscles: row.secondaryMuscles ?? [],
    instructions: row.instructions ?? [],
  };
}

function matchesQuery(row: LocalExerciseRow, qRaw: string, ql: string): boolean {
  if (!qRaw) return true;
  const parts = [
    row.name,
    row.name_ar,
    row.bodyPart,
    row.target,
    row.equipment,
    ...(row.muscles ?? []),
  ];
  for (const p of parts) {
    if (!p) continue;
    const pl = p.toLowerCase();
    if (pl.includes(ql)) return true;
    if (p.includes(qRaw)) return true;
  }
  return false;
}

/** Local-first browse (no query) or filter by text (Arabic / English / muscle tags). */
export function searchLocalExercises(query: string, limit = 80): ExerciseDBItem[] {
  const qRaw = query.trim();
  const ql = qRaw.toLowerCase();
  if (!qRaw) {
    return rows.slice(0, 40).map(rowToExerciseDBItem);
  }
  const out: ExerciseDBItem[] = [];
  for (const row of rows) {
    if (!matchesQuery(row, qRaw, ql)) continue;
    out.push(rowToExerciseDBItem(row));
    if (out.length >= limit) break;
  }
  return out;
}

export function filterLocalByBodyPart(bodyPart: string): ExerciseDBItem[] {
  const want = bodyPart.toLowerCase();
  return rows
    .filter((row) => canonicalBodyPart(row.bodyPart) === want)
    .map(rowToExerciseDBItem);
}

/** Prefer `local` order, then append remote items with new ids (dedupe by id). */
export function mergeExerciseListsPreferLocal(
  local: ExerciseDBItem[],
  remote: ExerciseDBItem[],
): ExerciseDBItem[] {
  const seen = new Set<string>();
  const out: ExerciseDBItem[] = [];
  for (const x of local) {
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.push(x);
  }
  for (const x of remote) {
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.push(x);
  }
  return out;
}
