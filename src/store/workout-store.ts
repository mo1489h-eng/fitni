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
import { idbGet, idbSet } from "@/lib/workout-idb";
import type { PersistedWorkoutV1 } from "@/components/mobile/workout/types";

const IDB_SNAPSHOT_KEY = "fitni_active_workout_snapshot_v1";
const QUEUE_KEY = "fitni_workout_sync_queue_v1";

/** Logical muscle buckets used by heatmap + decay (aligned with MuscleRecoveryMap groups). */
export type MuscleGroupId =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "legs";

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
  /** Muscle fatigue 0 = fresh, 1 = max cumulative load */
  muscleFatigue01: Partial<Record<MuscleGroupId, number>>;
  /** ISO timestamps of last stimulus per muscle (for decay) */
  lastStimulusAt: Partial<Record<MuscleGroupId, string>>;
  /** Failed / offline Supabase mutations */
  syncQueue: SyncJob[];
  /** Last persisted snapshot revision (monotonic) */
  snapshotRev: number;

  setRpeForExercise: (exerciseId: string, rpe: number) => void;
  consumePendingExtraRest: () => number;
  /** Map Arabic/English muscle label to group and bump fatigue from tonnage */
  applyFatigueFromExercise: (muscleLabel: string, volumeLoad: number) => void;
  /** Call on app boot + periodically — decays fatigue toward 0 */
  applyDecay: (nowMs?: number) => void;
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

function matchMuscleGroup(label: string): MuscleGroupId {
  const k = label.toLowerCase();
  if (k.includes("صدر") || k.includes("chest") || k.includes("pect")) return "chest";
  if (k.includes("ظهر") || k.includes("back") || k.includes("lats") || k.includes("ترابيس")) return "back";
  if (k.includes("كتف") || k.includes("shoulder") || k.includes("delt")) return "shoulders";
  if (k.includes("ذراع") || k.includes("arm") || k.includes("biceps") || k.includes("triceps")) return "arms";
  if (k.includes("بطن") || k.includes("core") || k.includes("abs") || k.includes("وسط")) return "core";
  if (k.includes("رجل") || k.includes("leg") || k.includes("ساق") || k.includes("فخذ") || k.includes("quad")) {
    return "legs";
  }
  return "chest";
}

/** Diminishing returns: volume maps to fatigue increment */
function volumeToDelta(v: number): number {
  if (v <= 0) return 0;
  return Math.min(0.35, Math.log10(10 + v) / 12);
}

/** Exponential decay: half-life style per 24h */
function decayFactor(hours: number): number {
  return Math.pow(0.5, hours / 48);
}

export const useWorkoutStore = create<WorkoutStoreState>()((set, get) => ({
    rpeByExerciseId: {},
    pendingExtraRestSeconds: 0,
    muscleFatigue01: {},
    lastStimulusAt: {},
    syncQueue: [],
    snapshotRev: 0,

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

    applyFatigueFromExercise: (muscleLabel, volumeLoad) => {
      const g = matchMuscleGroup(muscleLabel);
      const delta = volumeToDelta(volumeLoad);
      const now = new Date().toISOString();
      set((s) => {
        const prev = s.muscleFatigue01[g] ?? 0;
        const next = Math.min(1, prev + delta * (1 - prev * 0.5));
        return {
          muscleFatigue01: { ...s.muscleFatigue01, [g]: next },
          lastStimulusAt: { ...s.lastStimulusAt, [g]: now },
        };
      });
    },

    applyDecay: (nowMs = Date.now()) => {
      set((s) => {
        const nextFatigue = { ...s.muscleFatigue01 };
        const nextStimulus = { ...s.lastStimulusAt };
        for (const g of Object.keys(nextFatigue) as MuscleGroupId[]) {
          const iso = nextStimulus[g];
          if (!iso) continue;
          const hours = (nowMs - new Date(iso).getTime()) / 3600000;
          const factor = decayFactor(hours);
          const v = (nextFatigue[g] ?? 0) * factor;
          if (v < 0.02) {
            delete nextFatigue[g];
            delete nextStimulus[g];
          } else {
            nextFatigue[g] = v;
          }
        }
        return { muscleFatigue01: nextFatigue, lastStimulusAt: nextStimulus };
      });
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
