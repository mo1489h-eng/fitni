import { supabase } from "@/integrations/supabase/client";
import type { ExerciseDBItem } from "@/lib/exercise-translations";
import { getExerciseImageUrl } from "@/lib/exercise-image-proxy";
import { getArabicName } from "@/lib/exercise-translations";
import {
  mergeExerciseListsPreferLocal,
  filterLocalUnified,
  normalizeExerciseSearchQuery,
} from "@/lib/localExercisesDb";

/** Maps `exercisedb_cache` / loose Supabase rows into the UI `ExerciseDBItem` shape. */
export type ExerciseLibraryRow = {
  external_id?: string | null;
  name_en?: string | null;
  name_ar?: string | null;
  body_part?: string | null;
  target?: string | null;
  equipment?: string | null;
  /** Optional stored absolute GIF URL (if column exists / sync fills it). */
  gif_url?: string | null;
  gifUrl?: string | null;
  secondary_muscles?: unknown;
  instructions?: unknown;
};

function resolveGifUrlFromRow(id: string, r: Record<string, unknown>): string {
  const proxied = getExerciseImageUrl(id);
  const fromDb =
    (typeof r.gif_url === "string" && r.gif_url.trim()) ||
    (typeof r.gifUrl === "string" && r.gifUrl.trim()) ||
    "";
  return proxied || fromDb;
}

/** Safe map from DB/cache row → ExerciseDBItem; skips unusable rows instead of throwing. */
export function mapCacheRowToExerciseItem(row: unknown): ExerciseDBItem | null {
  if (row == null || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const idRaw = r.external_id ?? r.id;
  const id = idRaw != null && String(idRaw).length > 0 ? String(idRaw) : null;
  if (!id) return null;

  const nameEn = typeof r.name_en === "string" ? r.name_en : typeof r.name === "string" ? r.name : "";
  const nameArRaw = typeof r.name_ar === "string" ? r.name_ar : "";
  const bodyPart = typeof r.body_part === "string" ? r.body_part : "";
  const target = typeof r.target === "string" ? r.target : "";
  const equipment = typeof r.equipment === "string" ? r.equipment : "";
  const sec = r.secondary_muscles;
  const instr = r.instructions;

  return {
    id,
    name: nameEn,
    name_ar: nameArRaw || (nameEn ? getArabicName(nameEn) : undefined),
    bodyPart,
    target,
    equipment,
    gifUrl: resolveGifUrlFromRow(id, r),
    secondaryMuscles: Array.isArray(sec) ? sec.filter((x): x is string => typeof x === "string") : [],
    instructions: Array.isArray(instr) ? instr.filter((x): x is string => typeof x === "string") : [],
  };
}

function mapCacheRowsToItems(data: unknown): ExerciseDBItem[] {
  const dbResults = Array.isArray(data) ? data : [];
  const mapped = dbResults.map(mapCacheRowToExerciseItem).filter((x): x is ExerciseDBItem => x != null);
  return mapped;
}

/** Normalizes items from `exercisedb-proxy` / RapidAPI JSON to `ExerciseDBItem`. */
export function normalizeProxyExerciseToItem(raw: unknown): ExerciseDBItem | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null && String(o.id).length > 0 ? String(o.id) : null;
  if (!id) return null;

  const name = typeof o.name === "string" ? o.name : "";
  const bodyPart = typeof o.bodyPart === "string" ? o.bodyPart : "";
  const target = typeof o.target === "string" ? o.target : "";
  const equipment = typeof o.equipment === "string" ? o.equipment : "";
  // Prefer our Edge proxy so RapidAPI auth + CORS stay server-side; API `gifUrl` is CDN fallback only.
  const fromApi =
    (typeof o.gifUrl === "string" && o.gifUrl.trim()) ||
    (typeof o.gif_url === "string" && o.gif_url.trim()) ||
    "";
  const proxied = getExerciseImageUrl(id);
  const gifUrl = proxied || fromApi;
  const sec = o.secondaryMuscles;
  const instr = o.instructions;

  return {
    id,
    name,
    name_ar: typeof o.name_ar === "string" ? o.name_ar : undefined,
    bodyPart,
    target,
    equipment,
    gifUrl,
    secondaryMuscles: Array.isArray(sec) ? sec.filter((x): x is string => typeof x === "string") : [],
    instructions: Array.isArray(instr) ? instr.filter((x): x is string => typeof x === "string") : [],
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

function resetExerciseLibrarySyncGuard(): void {
  syncOnce = null;
}

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
  try {
    return filterLocalUnified({
      query: opts.query,
      bodyPart: opts.bodyPart,
      equipment: opts.equipment,
      limit: opts.limit,
      browseLimit: 40,
    });
  } catch {
    return [];
  }
}

function fallbackSearchItems(opts: SearchExerciseOptions): ExerciseDBItem[] {
  try {
    const rawQ = opts.query ?? "";
    const q = normalizeExerciseSearchQuery(rawQ);
    const bp = opts.bodyPart?.trim() ? opts.bodyPart.trim() : null;
    const equip = opts.equipmentMatch?.trim() ? opts.equipmentMatch.trim() : null;
    return buildLocalItems({
      query: q,
      bodyPart: bp,
      equipment: equip,
      limit: q.length >= 1 ? 80 : 40,
    });
  } catch {
    return [];
  }
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
  const safeLocal = Array.isArray(local) ? local : [];
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) {
    return { source: safeLocal.length ? "local" : "remote", items: safeLocal };
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
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    });
  } catch {
    return { source: safeLocal.length ? "local" : "remote", items: safeLocal };
  }

  if (!response.ok) {
    return { source: safeLocal.length ? "local" : "remote", items: safeLocal };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return { source: safeLocal.length ? "local" : "remote", items: safeLocal };
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "error" in parsed) {
    return { source: safeLocal.length ? "local" : "remote", items: safeLocal };
  }

  const rawList = Array.isArray(parsed) ? parsed : [];
  const remote = rawList.map(normalizeProxyExerciseToItem).filter((x): x is ExerciseDBItem => x != null);
  let merged = mergeExerciseListsPreferLocal(safeLocal, remote);

  if (equip) {
    merged = merged.filter((ex) => ex && (ex.equipment || "").toLowerCase().includes(equip.toLowerCase()));
  }

  return {
    source: safeLocal.length ? "local" : "remote",
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
  try {
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
        if (!error && rows != null) {
          const dbItems = mapCacheRowsToItems(rows);
          if (dbItems.length > 0) {
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
        }
      } catch {
        /* fall through to local + remote */
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
  } catch {
    const items = fallbackSearchItems(opts);
    return { items, source: "local" };
  }
}

export async function fetchRemoteExercisePage(
  query: string | undefined,
  bodyPart: string | undefined,
  offset: number,
): Promise<ExerciseDBItem[]> {
  try {
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
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return [];
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "error" in parsed) {
      return [];
    }
    const rawList = Array.isArray(parsed) ? parsed : [];
    return rawList.map(normalizeProxyExerciseToItem).filter((x): x is ExerciseDBItem => x != null);
  } catch {
    return [];
  }
}
