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

/** Trim, collapse spaces, Unicode NFC — use for consistent Arabic / English search. */
export function normalizeExerciseSearchQuery(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/g, " ");
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
    const pn = normalizeExerciseSearchQuery(String(p));
    const pl = pn.toLowerCase();
    if (pl.includes(ql)) return true;
    if (pn.includes(qRaw)) return true;
  }
  return false;
}

/** Local-first browse (no query) or filter by text (Arabic / English / muscle tags). */
export function searchLocalExercises(query: string, limit = 80): ExerciseDBItem[] {
  return filterLocalUnified({
    query,
    bodyPart: null,
    equipment: null,
    limit: limit > 0 ? limit : 80,
    browseLimit: 40,
  });
}

/** Bundled JSON search with optional body-part + equipment (English / Arabic, case-insensitive Latin). */
export function filterLocalUnified(opts: {
  query: string;
  bodyPart: string | null;
  equipment: string | null;
  limit?: number;
  /** Max rows when query is empty (browse). */
  browseLimit?: number;
}): ExerciseDBItem[] {
  const limit = opts.limit ?? 80;
  const browseLimit = opts.browseLimit ?? 40;
  const qRaw = normalizeExerciseSearchQuery(opts.query);
  const ql = qRaw.toLowerCase();

  let pool: LocalExerciseRow[] = rows;
  if (opts.bodyPart) {
    const want = opts.bodyPart.toLowerCase();
    pool = pool.filter((row) => canonicalBodyPart(row.bodyPart) === want);
  }

  if (!qRaw) {
    let browse = pool;
    if (opts.equipment) {
      const em = opts.equipment.toLowerCase();
      browse = pool.filter((row) => (row.equipment || "").toLowerCase().includes(em));
    }
    return browse.slice(0, browseLimit).map(rowToExerciseDBItem);
  }

  const out: ExerciseDBItem[] = [];
  for (const row of pool) {
    if (!matchesQuery(row, qRaw, ql)) continue;
    if (opts.equipment) {
      const em = opts.equipment.toLowerCase();
      if (!(row.equipment || "").toLowerCase().includes(em)) continue;
    }
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
