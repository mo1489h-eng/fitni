/**
 * useMuscleRecovery — live muscle recovery state derived from `session_logs`.
 *
 * Data pipeline:
 *   session_logs (per-set)
 *     ↳ join program_exercises.id → exercise_library_id
 *     ↳ join exercise_library → muscle_group + secondary_muscles
 *     ↳ filter by session.client_id (scoped via workout_sessions)
 *     ↳ sequentially simulate fatigue per muscle with `recoveryEngine`
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  type MuscleStateMap,
  createEmptyMuscleStateMap,
  resolveExerciseRecruitment,
} from "@/lib/muscleSystem";
import {
  calculateSetImpact,
  simulateFatigue,
  type SetEvent,
} from "@/lib/recoveryEngine";

/** Window we pull session_logs for (days). Older sets are fully decayed anyway. */
const LOOKBACK_DAYS = 14;
const VOLUME_WINDOW_DAYS = 7;

type SessionRow = {
  id: string;
  client_id: string;
  completed_at: string | null;
  started_at: string | null;
};

type SessionLogDbRow = {
  id: string;
  session_id: string | null;
  exercise_id: string | null;
  reps: number | null;
  weight: number | null;
  completed: boolean | null;
  created_at: string | null;
};

type ProgramExerciseRow = {
  id: string;
  exercise_library_id: string | null;
  name: string | null;
};

type ExerciseLibraryRow = {
  id: string;
  muscle_group: string | null;
  secondary_muscles: string[] | null;
  name_ar: string | null;
  name_en: string | null;
};

type PerMuscleAccumulator = {
  sets: SetEvent[];
  lastTrainedMs: number | null;
  volume7d: number;
  exerciseNames: Set<string>;
};

export interface MuscleRecoveryResult {
  states: MuscleStateMap;
  /** Arabic-preferred exercise names per muscle (last 7 days, deduped, ordered by recency). */
  recentExercises: Record<MuscleGroup, string[]>;
  /** ISO now — timestamp the snapshot was computed at. */
  computedAt: string;
}

export interface UseMuscleRecoveryOptions {
  /** Override "now" for deterministic testing. */
  now?: Date;
}

async function fetchRaw(clientId: string, sinceIso: string) {
  const sessionsQuery = await supabase
    .from("workout_sessions")
    .select("id, client_id, completed_at, started_at")
    .eq("client_id", clientId)
    .gte("started_at", sinceIso)
    .order("started_at", { ascending: false });
  if (sessionsQuery.error) throw sessionsQuery.error;
  const sessions = (sessionsQuery.data ?? []) as SessionRow[];
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length === 0) {
    return { sessions, logs: [] as SessionLogDbRow[], libById: new Map<string, ExerciseLibraryRow>(), peById: new Map<string, ProgramExerciseRow>() };
  }

  const logs: SessionLogDbRow[] = [];
  const chunk = 150;
  for (let i = 0; i < sessionIds.length; i += chunk) {
    const part = sessionIds.slice(i, i + chunk);
    const logsQuery = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => { in: (col: string, vals: string[]) => Promise<{ data: unknown; error: unknown }> };
      };
    })
      .from("session_logs")
      .select("id, session_id, exercise_id, reps, weight, completed, created_at")
      .in("session_id", part);
    if (logsQuery.error) throw logsQuery.error;
    const data = (logsQuery.data ?? []) as SessionLogDbRow[];
    logs.push(...data);
  }

  const exerciseIds = [...new Set(logs.map((l) => l.exercise_id).filter((x): x is string => !!x))];
  const peById = new Map<string, ProgramExerciseRow>();
  if (exerciseIds.length > 0) {
    const peQuery = await supabase
      .from("program_exercises")
      .select("id, exercise_library_id, name")
      .in("id", exerciseIds);
    if (peQuery.error) throw peQuery.error;
    for (const row of (peQuery.data ?? []) as ProgramExerciseRow[]) peById.set(row.id, row);
  }

  const libIds = [...new Set([...peById.values()].map((p) => p.exercise_library_id).filter((x): x is string => !!x))];
  const libById = new Map<string, ExerciseLibraryRow>();
  if (libIds.length > 0) {
    const libQuery = await supabase
      .from("exercise_library")
      .select("id, muscle_group, secondary_muscles, name_ar, name_en")
      .in("id", libIds);
    if (libQuery.error) throw libQuery.error;
    for (const row of (libQuery.data ?? []) as ExerciseLibraryRow[]) libById.set(row.id, row);
  }

  // Fallback: if any program_exercises rows still lack a library link, try to
  // resolve them by name (case-insensitive match against name_en / name_ar).
  // Some legacy rows have exercise_library_id = NULL even though the name
  // matches an existing library entry.
  const unlinkedNames = [
    ...new Set(
      [...peById.values()]
        .filter((p) => !p.exercise_library_id && p.name)
        .map((p) => (p.name as string).trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (unlinkedNames.length > 0) {
    const { data: libByNameRows } = await supabase
      .from("exercise_library")
      .select("id, muscle_group, secondary_muscles, name_ar, name_en")
      .or(
        unlinkedNames
          .map((n) => `name_en.ilike.${n},name_ar.ilike.${n}`)
          .join(","),
      );
    const byName = new Map<string, ExerciseLibraryRow>();
    for (const row of ((libByNameRows ?? []) as ExerciseLibraryRow[])) {
      if (row.name_en) byName.set(row.name_en.trim().toLowerCase(), row);
      if (row.name_ar) byName.set(row.name_ar.trim().toLowerCase(), row);
    }
    for (const pe of peById.values()) {
      if (pe.exercise_library_id || !pe.name) continue;
      const hit = byName.get(pe.name.trim().toLowerCase());
      if (hit) {
        pe.exercise_library_id = hit.id;
        libById.set(hit.id, hit);
      }
    }
  }

  return { sessions, logs, libById, peById };
}

function computeRecovery(
  logs: SessionLogDbRow[],
  peById: Map<string, ProgramExerciseRow>,
  libById: Map<string, ExerciseLibraryRow>,
  now: Date,
): MuscleRecoveryResult {
  const accByMuscle = MUSCLE_GROUPS.reduce((acc, g) => {
    acc[g] = { sets: [], lastTrainedMs: null, volume7d: 0, exerciseNames: new Set<string>() };
    return acc;
  }, {} as Record<MuscleGroup, PerMuscleAccumulator>);

  const volumeSinceMs = now.getTime() - VOLUME_WINDOW_DAYS * 86_400_000;

  for (const log of logs) {
    if (!log.completed) continue;
    if (!log.created_at || !log.exercise_id) continue;
    const when = new Date(log.created_at);
    if (Number.isNaN(when.getTime())) continue;

    const pe = peById.get(log.exercise_id);
    const libId = pe?.exercise_library_id;
    const lib = libId ? libById.get(libId) : undefined;
    if (!lib) continue;

    const { primary, secondary } = resolveExerciseRecruitment(lib.muscle_group, lib.secondary_muscles);
    if (primary.length === 0 && secondary.length === 0) continue;

    const impact = calculateSetImpact(Number(log.weight ?? 0), Number(log.reps ?? 0));
    const exerciseName = (lib.name_ar || lib.name_en || "").trim();

    for (const g of primary) {
      accByMuscle[g].sets.push({ at: when, impact, ratio: 1.0 });
      if (accByMuscle[g].lastTrainedMs == null || when.getTime() > accByMuscle[g].lastTrainedMs!) {
        accByMuscle[g].lastTrainedMs = when.getTime();
      }
      if (when.getTime() >= volumeSinceMs) accByMuscle[g].volume7d += impact;
      if (exerciseName) accByMuscle[g].exerciseNames.add(exerciseName);
    }
    for (const g of secondary) {
      accByMuscle[g].sets.push({ at: when, impact, ratio: 0.5 });
      if (accByMuscle[g].lastTrainedMs == null || when.getTime() > accByMuscle[g].lastTrainedMs!) {
        accByMuscle[g].lastTrainedMs = when.getTime();
      }
      if (when.getTime() >= volumeSinceMs) accByMuscle[g].volume7d += impact * 0.5;
      if (exerciseName) accByMuscle[g].exerciseNames.add(exerciseName);
    }
  }

  const states = createEmptyMuscleStateMap();
  const recentExercises = MUSCLE_GROUPS.reduce((acc, g) => {
    acc[g] = [];
    return acc;
  }, {} as Record<MuscleGroup, string[]>);

  for (const g of MUSCLE_GROUPS) {
    const a = accByMuscle[g];
    const fatigue = Math.round(simulateFatigue(a.sets, now));
    states[g] = {
      fatigue,
      lastTrained: a.lastTrainedMs ? new Date(a.lastTrainedMs).toISOString() : null,
      volume: Math.round(a.volume7d),
    };
    recentExercises[g] = [...a.exerciseNames].slice(0, 5);
  }

  return { states, recentExercises, computedAt: now.toISOString() };
}

/**
 * Live muscle recovery hook. Bound to a single client; empty clientId → empty state.
 */
export function useMuscleRecovery(
  clientId: string | null | undefined,
  options?: UseMuscleRecoveryOptions,
) {
  const now = options?.now ?? new Date();
  const sinceIso = useMemo(
    () => new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString(),
    [now],
  );

  const query = useQuery({
    queryKey: ["muscle-recovery", clientId, sinceIso],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!clientId) {
        return {
          states: createEmptyMuscleStateMap(),
          recentExercises: MUSCLE_GROUPS.reduce((acc, g) => {
            acc[g] = [];
            return acc;
          }, {} as Record<MuscleGroup, string[]>),
          computedAt: new Date().toISOString(),
        } satisfies MuscleRecoveryResult;
      }
      const { logs, libById, peById } = await fetchRaw(clientId, sinceIso);
      return computeRecovery(logs, peById, libById, new Date());
    },
  });

  return query;
}
