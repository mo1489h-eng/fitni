/**
 * Fitni — Active Workout engine (Zustand).
 *
 * Responsibilities:
 * - Optimistic UI metadata (RPE per exercise, pending rest bonus from high RPE)
 * - Muscle fatigue model (0–1) with time decay for dashboard heatmap
 * - Outbox queue for Supabase writes when offline / failed requests
 * - Mirrors critical session snapshot to IndexedDB (crash safety alongside localStorage)
 */

import { create } from "zustand";
import { idbGet, idbSet, idbDel } from "@/lib/workout-idb";
import type { PersistedWorkoutV1 } from "@/components/mobile/workout/types";
import type { FitniRole } from "@/lib/auth-service";
import { FITNI_ROLE_STORAGE_KEY, clearStoredFitniRole, persistFitniRole } from "@/lib/auth-service";
import {
  calculateRecoveryTime,
  fatigueDeltaFromVolume,
  getCurrentFatigue,
  SECONDARY_FATIGUE_FACTOR,
  type MuscleGroupId,
  type MuscleRecoveryState,
} from "@/lib/muscle-fatigue-engine";
import { upsertUserMuscleStatusBatch } from "@/lib/user-muscle-status";

export type { MuscleGroupId, MuscleRecoveryState } from "@/lib/muscle-fatigue-engine";

const IDB_SNAPSHOT_KEY = "fitni_active_workout_snapshot_v1";
const QUEUE_KEY = "fitni_workout_sync_queue_v1";
const MUSCLE_LOCAL_PREFIX = "fitni_muscle_v2_";

export type SyncJobKind = "session_exercise" | "workout_log" | "session_update";

export type SyncJob = {
  id: string;
  kind: SyncJobKind;
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
};

type WorkoutStoreState = {
  /** Last RPE (1–10) captured per program exercise id */
  rpeByExerciseId: Record<string, number>;
  /** Extra rest seconds suggested because last RPE > threshold */
  pendingExtraRestSeconds: number;
  /** Linear recovery model (persisted per muscle) */
  muscleFatigueState: Partial<Record<MuscleGroupId, MuscleRecoveryState>>;
  /** Client whose muscle rows are loaded / synced */
  activeClientIdForFatigue: string | null;
  /** Failed / offline Supabase mutations */
  syncQueue: SyncJob[];
  /** Last persisted snapshot revision (monotonic) */
  snapshotRev: number;
  /** Fitni app role — hydrated from localStorage to avoid UI flicker; synced from auth-service */
  fitniRole: FitniRole | null;
  setFitniRole: (role: FitniRole | null) => void;
  clearFitniRole: () => void;

  setRpeForExercise: (exerciseId: string, rpe: number) => void;
  consumePendingExtraRest: () => number;
  setActiveClientForFatigue: (clientId: string | null) => void;
  hydrateMuscleState: (clientId: string, partial: Partial<Record<MuscleGroupId, MuscleRecoveryState>>) => void;
  /** Primary + secondary muscle load from one logged set */
  applyFatigueFromSet: (
    clientId: string,
    primary: MuscleGroupId,
    secondary: MuscleGroupId[],
    volumeLoad: number,
    rpe: number
  ) => void;
  getDerivedFatigueLevels: (nowMs?: number) => Partial<Record<MuscleGroupId, number>>;
  /** Legacy name — reapplies linear model (no-op if state empty); kept for boot hooks */
  applyDecay: (nowMs?: number) => void;
  syncMuscleStatusToSupabase: (clientId: string) => Promise<void>;
  persistMuscleStateLocal: (clientId: string) => void;
  loadMuscleStateLocal: (clientId: string) => void;
  enqueueSyncJob: (job: Omit<SyncJob, "retries" | "createdAt"> & { retries?: number }) => void;
  dequeueSyncJob: (id: string) => void;
  bumpRetry: (id: string) => void;
  /** Harden against crashes: write session blob to IndexedDB */
  persistIndexedSnapshot: (payload: PersistedWorkoutV1 | null) => Promise<void>;
  loadIndexedSnapshot: () => Promise<PersistedWorkoutV1 | null>;
  hydrateQueueFromStorage: () => void;
};

const RPE_REST_BONUS_THRESHOLD = 8;
const RPE_REST_BONUS_SECONDS = 30;

function muscleLocalKey(clientId: string): string {
  return `${MUSCLE_LOCAL_PREFIX}${clientId}`;
}

function applyStimulusToMuscle(
  prev: MuscleRecoveryState | undefined,
  muscleId: MuscleGroupId,
  volumeLoad: number,
  rpe: number,
  nowMs: number
): MuscleRecoveryState {
  const nowIso = new Date(nowMs).toISOString();
  const cur = getCurrentFatigue(muscleId, prev, nowMs);
  const delta = fatigueDeltaFromVolume(volumeLoad, rpe);
  const peak = Math.min(1, cur + delta);
  const T = calculateRecoveryTime(muscleId, volumeLoad, rpe);
  return { initialFatigue: peak, totalRecoveryHours: T, lastStimulusAt: nowIso };
}

function readInitialFitniRole(): FitniRole | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(FITNI_ROLE_STORAGE_KEY);
    return s === "coach" || s === "trainee" ? s : null;
  } catch {
    return null;
  }
}

export const useWorkoutStore = create<WorkoutStoreState>()((set, get) => ({
    rpeByExerciseId: {},
    pendingExtraRestSeconds: 0,
    muscleFatigueState: {},
    activeClientIdForFatigue: null,
    syncQueue: [],
    snapshotRev: 0,
    fitniRole: readInitialFitniRole(),

    setFitniRole: (role) => {
      set({ fitniRole: role });
      if (role) persistFitniRole(role);
      else clearStoredFitniRole();
    },

    clearFitniRole: () => {
      set({ fitniRole: null });
      clearStoredFitniRole();
    },

    setRpeForExercise: (exerciseId, rpe) => {
      const clamped = Math.max(1, Math.min(10, Math.round(rpe)));
      set((s) => ({
        rpeByExerciseId: { ...s.rpeByExerciseId, [exerciseId]: clamped },
        pendingExtraRestSeconds: clamped > RPE_REST_BONUS_THRESHOLD ? RPE_REST_BONUS_SECONDS : s.pendingExtraRestSeconds,
      }));
    },

    consumePendingExtraRest: () => {
      const n = get().pendingExtraRestSeconds;
      set({ pendingExtraRestSeconds: 0 });
      return n;
    },

    setActiveClientForFatigue: (clientId) => set({ activeClientIdForFatigue: clientId }),

    hydrateMuscleState: (clientId, partial) => {
      set((s) => ({
        activeClientIdForFatigue: clientId,
        muscleFatigueState: { ...s.muscleFatigueState, ...partial },
      }));
    },

    applyFatigueFromSet: (clientId, primary, secondary, volumeLoad, rpe) => {
      const nowMs = Date.now();
      set((s) => {
        const next = { ...s.muscleFatigueState };
        next[primary] = applyStimulusToMuscle(next[primary], primary, volumeLoad, rpe, nowMs);
        for (const sec of secondary) {
          const v = volumeLoad * SECONDARY_FATIGUE_FACTOR;
          next[sec] = applyStimulusToMuscle(next[sec], sec, v, rpe, nowMs);
        }
        return { muscleFatigueState: next, activeClientIdForFatigue: clientId };
      });
      get().persistMuscleStateLocal(clientId);
      void get().syncMuscleStatusToSupabase(clientId);
    },

    getDerivedFatigueLevels: (nowMs = Date.now()) => {
      const s = get().muscleFatigueState;
      const out: Partial<Record<MuscleGroupId, number>> = {};
      for (const g of Object.keys(s) as MuscleGroupId[]) {
        const st = s[g];
        if (!st) continue;
        const v = getCurrentFatigue(g, st, nowMs);
        if (v > 0.004) out[g] = v;
      }
      return out;
    },

    applyDecay: () => {
      /* Linear model derives fatigue from timestamps — no mutation needed. */
    },

    persistMuscleStateLocal: (clientId) => {
      try {
        const raw = JSON.stringify(get().muscleFatigueState);
        localStorage.setItem(muscleLocalKey(clientId), raw);
      } catch {
        /* ignore */
      }
    },

    loadMuscleStateLocal: (clientId) => {
      try {
        const raw = localStorage.getItem(muscleLocalKey(clientId));
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Record<MuscleGroupId, MuscleRecoveryState>>;
        if (parsed && typeof parsed === "object") {
          set({ muscleFatigueState: parsed, activeClientIdForFatigue: clientId });
        }
      } catch {
        /* ignore */
      }
    },

    syncMuscleStatusToSupabase: async (clientId) => {
      const state = get().muscleFatigueState;
      const entries: Array<{ muscle: MuscleGroupId; state: MuscleRecoveryState }> = [];
      for (const g of Object.keys(state) as MuscleGroupId[]) {
        const st = state[g];
        if (st && st.initialFatigue > 0.002) entries.push({ muscle: g, state: st });
      }
      if (!entries.length) return;
      try {
        await upsertUserMuscleStatusBatch(clientId, entries);
      } catch {
        /* offline / RLS — local cache still valid */
      }
    },

    enqueueSyncJob: (job) => {
      const full: SyncJob = {
        ...job,
        retries: job.retries ?? 0,
        createdAt: Date.now(),
      };
      set((s) => {
        const syncQueue = [...s.syncQueue, full];
        try {
          localStorage.setItem(QUEUE_KEY, JSON.stringify(syncQueue));
        } catch {
          /* ignore */
        }
        return { syncQueue };
      });
    },

    dequeueSyncJob: (id) => {
      set((s) => {
        const syncQueue = s.syncQueue.filter((j) => j.id !== id);
        try {
          localStorage.setItem(QUEUE_KEY, JSON.stringify(syncQueue));
        } catch {
          /* ignore */
        }
        return { syncQueue };
      });
    },

    bumpRetry: (id) => {
      set((s) => {
        const syncQueue = s.syncQueue.map((j) => (j.id === id ? { ...j, retries: j.retries + 1 } : j));
        try {
          localStorage.setItem(QUEUE_KEY, JSON.stringify(syncQueue));
        } catch {
          /* ignore */
        }
        return { syncQueue };
      });
    },

    persistIndexedSnapshot: async (payload) => {
      if (payload == null) {
        await idbDel(IDB_SNAPSHOT_KEY);
        return;
      }
      await idbSet(IDB_SNAPSHOT_KEY, JSON.stringify(payload));
      set((s) => ({ snapshotRev: s.snapshotRev + 1 }));
    },

    loadIndexedSnapshot: async () => {
      const raw = await idbGet(IDB_SNAPSHOT_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as PersistedWorkoutV1;
      } catch {
        return null;
      }
    },

    hydrateQueueFromStorage: () => {
      try {
        const raw = localStorage.getItem(QUEUE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as SyncJob[];
        if (Array.isArray(parsed)) set({ syncQueue: parsed });
      } catch {
        /* ignore */
      }
    },
}));

/** Subscribe once on module load in browser */
if (typeof window !== "undefined") {
  useWorkoutStore.getState().hydrateQueueFromStorage();
  useWorkoutStore.getState().applyDecay();
}
