import { supabase } from "@/integrations/supabase/client";
import type { ExerciseDBItem } from "@/lib/exercise-translations";
import { getExerciseImageUrl } from "@/lib/exercise-image-proxy";
import { getArabicName } from "@/lib/exercise-translations";
import {
  mergeExerciseListsPreferLocal,
  searchLocalExercises,
  filterLocalUnified,
  normalizeExerciseSearchQuery,
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

/** Clears the one-shot sync guard so the next `ensureExerciseLibrarySynced` can run again. */
function resetExerciseLibrarySyncGuard(): void {
  syncOnce = null;
}

/**
 * Invokes the edge function again (e.g. after empty search / trainer retry).
 * Resets the internal one-shot so background `ensureExerciseLibrarySynced` can run on next library open.
 */
export async function retryExerciseLibrarySync(): Promise<{
  ok: boolean;
  count?: number;
  error?: string;
}> {
  resetExerciseLibrarySyncGuard();
  try {
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; count?: number; error?: string }>(
      "exercise-library-sync",
      { body: {} },
    );
    if (error) {
      return { ok: false, error: error.message };
    }
    const payload = data as { ok?: boolean; count?: number; error?: string } | null;
    if (payload && typeof payload === "object" && "error" in payload && payload.error) {
      return { ok: false, error: String(payload.error) };
    }
    return { ok: true, count: payload?.count };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync failed";
    return { ok: false, error: msg };
  }
}

/** PostgREST `ilike` wildcards — strip so user input matches literally. */
function sanitizeIlikeFragment(s: string): string {
  return s
    .replace(/\\/g, " ")
    .replace(/%/g, " ")
    .replace(/_/g, " ")
    .replace(/,/g, " ")
    .trim();
}

function buildLocalItems(opts: {
  query: string;
  bodyPart: string | null;
  equipment: string | null;
  limit: number;
}): ExerciseDBItem[] {
  return filterLocalUnified({
    query: opts.query,
    bodyPart: opts.bodyPart,
    equipment: opts.equipment,
    limit: opts.limit,
    browseLimit: 40,
  });
}

async function fetchRemoteMerged(
  opts: {
    query: string;
    bodyPart: string | null;
    offset: number;
    equipment: string | null;
  },
  local: ExerciseDBItem[],
): Promise<{ items: ExerciseDBItem[]; source: "local" | "remote" }> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) {
    return { source: local.length ? "local" : "remote", items: local };
  }

  const q = opts.query;
  const offset = opts.offset;
  const bp = opts.bodyPart;
  const equip = opts.equipment;

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
    return { source: local.length ? "local" : "remote", items: local.length ? local : [] };
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

export type SearchExerciseOptions = {
  query?: string;
  bodyPart?: string | null;
  equipmentMatch?: string | null;
  offset?: number;
  limit?: number;
};

/**
 * 1) Supabase cache (if table has rows)
 * 2) Bundled JSON (`exercises-db.json`) — always used when cache empty or DB returns no rows
 * 3) Remote proxy (`exercisedb-proxy`)
 */
export async function searchExercisesUnified(opts: SearchExerciseOptions): Promise<{
  items: ExerciseDBItem[];
  source: "db" | "local" | "remote";
}> {
  const rawQ = opts.query ?? "";
  const q = normalizeExerciseSearchQuery(rawQ);
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 40;
  const bp = opts.bodyPart?.trim() ? opts.bodyPart.trim() : null;
  const equip = opts.equipmentMatch?.trim() ? opts.equipmentMatch.trim() : null;

  let cacheEmpty = false;
  try {
    const { count, error: countErr } = await supabase
      .from("exercisedb_cache")
      .select("*", { head: true, count: "exact" });
    if (!countErr) {
      cacheEmpty = (count ?? 0) === 0;
    }
  } catch {
    cacheEmpty = true;
  }

  if (!cacheEmpty) {
    try {
      let qb = supabase.from("exercisedb_cache").select("*").order("name_en");

      if (bp) {
        qb = qb.eq("body_part", bp);
      }
      if (equip) {
        qb = qb.ilike("equipment", `%${sanitizeIlikeFragment(equip)}%`);
      }
      if (q.length >= 1) {
        const safe = sanitizeIlikeFragment(q);
        if (safe.length >= 1) {
          qb = qb.or(`name_en.ilike.%${safe}%,name_ar.ilike.%${safe}%`);
        }
      }

      qb = qb.range(offset, offset + limit - 1);

      const { data: rows, error } = await qb;
      if (!error && rows && rows.length > 0) {
        const dbItems = (rows as ExerciseLibraryRow[]).map(rowToItem);
        if (q.length >= 1) {
          const localHits = buildLocalItems({
            query: q,
            bodyPart: bp,
            equipment: equip,
            limit: Math.max(limit, 80),
          });
          const merged = mergeExerciseListsPreferLocal(localHits, dbItems);
          return {
            source: "db",
            items: merged.slice(0, limit),
          };
        }
        return {
          source: "db",
          items: dbItems,
        };
      }
    } catch {
      /* table missing or RLS */
    }
  }

  const local = buildLocalItems({
    query: q,
    bodyPart: bp,
    equipment: equip,
    limit: q.length >= 1 ? 80 : 40,
  });

  return fetchRemoteMerged(
    {
      query: q,
      bodyPart: bp,
      offset,
      equipment: equip,
    },
    local,
  );
}

/** Extra pages from the Edge proxy only (infinite scroll). */
export async function fetchRemoteExercisePage(
  query: string | undefined,
  bodyPart: string | undefined,
  offset: number,
): Promise<ExerciseDBItem[]> {
  const q = query ? normalizeExerciseSearchQuery(query) : "";
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return [];

  const params = new URLSearchParams({ limit: "30", offset: String(offset) });
  if (bodyPart) {
    params.set("endpoint", "byBodyPart");
    params.set("bodyPart", bodyPart);
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
  if (!response.ok) return [];
  const result = (await response.json()) as unknown;
  return Array.isArray(result) ? result : [];
}
