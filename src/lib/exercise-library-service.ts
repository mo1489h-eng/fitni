import { supabase } from "@/integrations/supabase/client";
import type { ExerciseDBItem } from "@/lib/exercise-translations";
import { getExerciseImageUrl } from "@/lib/exercise-image-proxy";
import { getArabicName } from "@/lib/exercise-translations";
import {
  mergeExerciseListsPreferLocal,
  searchLocalExercises,
  filterLocalByBodyPart,
} from "@/lib/localExercisesDb";

export type ExerciseLibraryRow = {
  external_id: string;
  name_en: string;
  name_ar: string;
  body_part: string;
  target: string | null;
  equipment: string | null;
  secondary_muscles: string[] | unknown;
  instructions: string[] | unknown;
};

function rowToItem(row: ExerciseLibraryRow): ExerciseDBItem {
  const gif = getExerciseImageUrl(row.external_id);
  return {
    id: row.external_id,
    name: row.name_en,
    name_ar: row.name_ar || getArabicName(row.name_en),
    bodyPart: row.body_part,
    target: row.target ?? "",
    equipment: row.equipment ?? "",
    gifUrl: gif,
    secondaryMuscles: Array.isArray(row.secondary_muscles) ? row.secondary_muscles : [],
    instructions: Array.isArray(row.instructions) ? row.instructions : [],
  };
}

let syncOnce: Promise<void> | null = null;

/** One best-effort sync when the cache table is empty (RapidAPI must be configured on the project). */
export function ensureExerciseLibrarySynced(): Promise<void> {
  if (!syncOnce) {
    syncOnce = (async () => {
      try {
        const { count, error } = await supabase
          .from("exercisedb_cache")
          .select("*", { head: true, count: "exact" });
        if (!error && (count ?? 0) > 0) return;
      } catch {
        return;
      }
      try {
        await supabase.functions.invoke("exercise-library-sync", { body: {} });
      } catch {
        /* optional */
      }
    })();
  }
  return syncOnce;
}

export type SearchExerciseOptions = {
  query?: string;
  bodyPart?: string | null;
  equipmentMatch?: string | null;
  offset?: number;
  limit?: number;
};

/**
 * 1) Supabase cache (if rows exist)
 * 2) Bundled JSON (`exercises-db.json`)
 * 3) Remote proxy (`exercisedb-proxy`)
 */
export async function searchExercisesUnified(opts: SearchExerciseOptions): Promise<{
  items: ExerciseDBItem[];
  source: "db" | "local" | "remote";
}> {
  const q = (opts.query ?? "").trim();
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 40;
  const bp = opts.bodyPart ?? null;
  const equip = opts.equipmentMatch ?? null;

  try {
    let qb = supabase.from("exercisedb_cache").select("*").order("name_en");

    if (bp) {
      qb = qb.eq("body_part", bp);
    }
    if (equip) {
      qb = qb.ilike("equipment", `%${equip}%`);
    }
    if (q.length >= 1) {
      const safe = q.replace(/,/g, " ");
      qb = qb.or(`name_en.ilike.%${safe}%,name_ar.ilike.%${safe}%`);
    }

    qb = qb.range(offset, offset + limit - 1);

    const { data: rows, error } = await qb;
    if (!error && rows && rows.length > 0) {
      return {
        source: "db",
        items: (rows as ExerciseLibraryRow[]).map(rowToItem),
      };
    }
  } catch {
    /* table missing or RLS */
  }

  let local: ExerciseDBItem[] = [];
  if (bp) {
    local = filterLocalByBodyPart(bp);
  } else if (q.length >= 1) {
    local = searchLocalExercises(q, 80);
  } else {
    local = searchLocalExercises("", 40);
  }

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const params = new URLSearchParams({ limit: String(30), offset: String(offset) });
  if (bp) {
    params.set("endpoint", "byBodyPart");
    params.set("bodyPart", bp);
  } else if (q.length >= 2) {
    params.set("endpoint", "byName");
    params.set("name", q.toLowerCase());
  } else {
    params.set("endpoint", "exercises");
  }

  const url = `https://${projectId}.supabase.co/functions/v1/exercisedb-proxy?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
  });
  if (!response.ok) {
    return { source: "local", items: local.length ? local : [] };
  }

  const result = (await response.json()) as ExerciseDBItem[] | unknown;
  const remote = Array.isArray(result) ? result : [];
  let merged = mergeExerciseListsPreferLocal(local, remote);

  if (equip) {
    merged = merged.filter((ex) => (ex.equipment || "").toLowerCase().includes(equip.toLowerCase()));
  }

  return {
    source: local.length ? "local" : "remote",
    items: merged,
  };
}

/** Extra pages from the Edge proxy only (infinite scroll). */
export async function fetchRemoteExercisePage(
  query: string | undefined,
  bodyPart: string | undefined,
  offset: number,
): Promise<ExerciseDBItem[]> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const params = new URLSearchParams({ limit: "30", offset: String(offset) });
  if (bodyPart) {
    params.set("endpoint", "byBodyPart");
    params.set("bodyPart", bodyPart);
  } else if (query && query.length >= 2) {
    params.set("endpoint", "byName");
    params.set("name", query.toLowerCase());
  } else {
    params.set("endpoint", "exercises");
  }
  const url = `https://${projectId}.supabase.co/functions/v1/exercisedb-proxy?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
  });
  if (!response.ok) return [];
  const result = (await response.json()) as unknown;
  return Array.isArray(result) ? result : [];
}
