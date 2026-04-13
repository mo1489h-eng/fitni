import { create } from "zustand";
import { persist } from "zustand/middleware";

import { sampleHypertrophyProgram } from "@/mocks/mockWorkouts";
import {
  cloneDaysWithNewIds,
  createWorkoutExercise,
  createWorkoutExerciseForGoal,
  hydrateWorkoutProgramIds,
  type TrainingGoal,
} from "@/lib/workout-builder-utils";
import {
  assertBuilderDataSliceValid,
  type BuilderDataSlice,
} from "@/lib/workout-builder-state-validation";
import { validateWorkoutProgram } from "@/lib/validations/workout";
import { pickFiveForSmartFill } from "@/lib/smart-fill-exercises";
import { randomUUID } from "@/lib/random-id";
import { exerciseLibrary } from "@/mocks/mockWorkouts";
import type { Exercise, Set, WorkoutDay, WorkoutProgram } from "@/types/workout";

/**
 * localStorage key for WorkoutBuilder persist only.
 * Must differ from template / program stores — see `TEMPLATE_STORAGE_KEY` in templateStore.
 */
export const WORKOUT_BUILDER_STORAGE_KEY = "fitni-builder-v1";

const STORAGE_VERSION = 1;

export type WorkoutBuilderState = {
  programId: string;
  title: string;
  description: string;
  weeksCount: number;
  activeWeekIndex: number;
  /** One `WorkoutDay[]` per week (same shape as `WorkoutProgram.days` for that week). */
  weekDays: WorkoutDay[][];

  setTitle: (title: string) => void;
  setActiveWeekIndex: (i: number) => void;
  setWeekDaysForActiveWeek: (days: WorkoutDay[]) => void;
  updateWeekDays: (weekIndex: number, days: WorkoutDay[]) => void;
  addWeek: () => void;

  patchExercise: (dayId: string, instanceId: string, patch: Partial<import("@/types/workout").WorkoutExercise>) => void;
  patchSet: (dayId: string, instanceId: string, setId: string, patch: Partial<Set>) => void;
  addExerciseToDay: (dayId: string, exercise: Exercise) => void;
  linkSupersetWithNext: (dayId: string, instanceId: string) => void;
  unlinkSuperset: (dayId: string, instanceId: string) => void;
  applyRestToAllSets: (dayId: string, instanceId: string, restSeconds: number) => void;
  /** Populate an empty workout day with five library exercises (mock). */
  smartFillDay: (dayId: string, goal: TrainingGoal) => void;

  /** Replace active week from a validated `WorkoutProgram` slice (AI / templates); hydrates IDs. */
  replaceActiveWeekFromProgram: (program: WorkoutProgram) => { ok: true } | { ok: false; message: string };

  /** Single-week slice matching `WorkoutProgram.days`. */
  getProgramSnapshot: () => WorkoutProgram;

  /** Reset to bundled sample program (fixes corrupt UI / error boundary recovery). */
  resetBuilderState: () => void;

  /** True after persist rehydration + validation; UI should wait before reading weekDays. */
  _hasHydrated: boolean;
};

function hydrateInitialWeeks(): WorkoutDay[][] {
  const n = Math.max(1, sampleHypertrophyProgram.weeksCount);
  return Array.from({ length: n }, () => cloneDaysWithNewIds(sampleHypertrophyProgram.days));
}

export function buildWorkoutBuilderInitialData(): Omit<
  WorkoutBuilderState,
  | "setTitle"
  | "setActiveWeekIndex"
  | "setWeekDaysForActiveWeek"
  | "updateWeekDays"
  | "addWeek"
  | "patchExercise"
  | "patchSet"
  | "addExerciseToDay"
  | "linkSupersetWithNext"
  | "unlinkSuperset"
  | "applyRestToAllSets"
  | "smartFillDay"
  | "replaceActiveWeekFromProgram"
  | "getProgramSnapshot"
  | "resetBuilderState"
> {
  return {
    programId: sampleHypertrophyProgram.id,
    title: sampleHypertrophyProgram.title,
    description: sampleHypertrophyProgram.description,
    weeksCount: sampleHypertrophyProgram.weeksCount,
    activeWeekIndex: 0,
    weekDays: hydrateInitialWeeks(),
    _hasHydrated: false,
  };
}

function createBuilderActions(
  set: Parameters<Parameters<typeof create<WorkoutBuilderState>>[0]>[0],
  get: () => WorkoutBuilderState,
): Pick<
  WorkoutBuilderState,
  | "setTitle"
  | "setActiveWeekIndex"
  | "setWeekDaysForActiveWeek"
  | "updateWeekDays"
  | "addWeek"
  | "patchExercise"
  | "patchSet"
  | "addExerciseToDay"
  | "linkSupersetWithNext"
  | "unlinkSuperset"
  | "applyRestToAllSets"
  | "smartFillDay"
  | "replaceActiveWeekFromProgram"
  | "getProgramSnapshot"
  | "resetBuilderState"
> {
  return {
    setTitle: (title) => set({ title }),
    setActiveWeekIndex: (activeWeekIndex) => set({ activeWeekIndex }),
    setWeekDaysForActiveWeek: (days) =>
      set((s) => {
        const next = [...s.weekDays];
        next[s.activeWeekIndex] = days;
        return { weekDays: next };
      }),
    updateWeekDays: (weekIndex, days) =>
      set((s) => {
        const next = [...s.weekDays];
        next[weekIndex] = days;
        return { weekDays: next };
      }),
    addWeek: () =>
      set((s) => {
        const template = cloneDaysWithNewIds(sampleHypertrophyProgram.days);
        return {
          weeksCount: s.weeksCount + 1,
          weekDays: [...s.weekDays, template],
        };
      }),

    patchExercise: (dayId, instanceId, patch) =>
      set((s) => {
        const w = s.activeWeekIndex;
        const days = s.weekDays[w].map((d) => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            exercises: d.exercises.map((ex) => (ex.instanceId === instanceId ? { ...ex, ...patch } : ex)),
          };
        });
        const next = [...s.weekDays];
        next[w] = days;
        return { weekDays: next };
      }),

    patchSet: (dayId, instanceId, setId, patch) =>
      set((s) => {
        const w = s.activeWeekIndex;
        const days = s.weekDays[w].map((d) => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            exercises: d.exercises.map((ex) => {
              if (ex.instanceId !== instanceId) return ex;
              return {
                ...ex,
                sets: ex.sets.map((st) => (st.id === setId ? { ...st, ...patch } : st)),
              };
            }),
          };
        });
        const next = [...s.weekDays];
        next[w] = days;
        return { weekDays: next };
      }),

    addExerciseToDay: (dayId, exercise) =>
      set((s) => {
        const w = s.activeWeekIndex;
        const we = createWorkoutExercise(exercise);
        const days = s.weekDays[w].map((d) =>
          d.id === dayId ? { ...d, exercises: [...d.exercises, we] } : d,
        );
        const next = [...s.weekDays];
        next[w] = days;
        return { weekDays: next };
      }),

    linkSupersetWithNext: (dayId, instanceId) =>
      set((s) => {
        const w = s.activeWeekIndex;
        const day = s.weekDays[w].find((d) => d.id === dayId);
        if (!day) return s;
        const idx = day.exercises.findIndex((e) => e.instanceId === instanceId);
        const nextEx = day.exercises[idx + 1];
        if (idx < 0 || !nextEx) return s;
        const sid = randomUUID();
        const days = s.weekDays[w].map((d) => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            exercises: d.exercises.map((ex) => {
              if (ex.instanceId === instanceId || ex.instanceId === nextEx.instanceId) {
                return { ...ex, supersetId: sid };
              }
              return ex;
            }),
          };
        });
        const next = [...s.weekDays];
        next[w] = days;
        return { weekDays: next };
      }),

    unlinkSuperset: (dayId, instanceId) =>
      set((s) => {
        const w = s.activeWeekIndex;
        const day = s.weekDays[w].find((d) => d.id === dayId);
        if (!day) return s;
        const target = day.exercises.find((e) => e.instanceId === instanceId);
        if (!target?.supersetId) return s;
        const sid = target.supersetId;
        const days = s.weekDays[w].map((d) => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            exercises: d.exercises.map((ex) =>
              ex.supersetId === sid ? { ...ex, supersetId: undefined } : ex,
            ),
          };
        });
        const next = [...s.weekDays];
        next[w] = days;
        return { weekDays: next };
      }),

    applyRestToAllSets: (dayId, instanceId, restSeconds) =>
      set((s) => {
        const w = s.activeWeekIndex;
        const days = s.weekDays[w].map((d) => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            exercises: d.exercises.map((ex) => {
              if (ex.instanceId !== instanceId) return ex;
              return {
                ...ex,
                sets: ex.sets.map((st) => ({ ...st, restTime: restSeconds })),
              };
            }),
          };
        });
        const next = [...s.weekDays];
        next[w] = days;
        return { weekDays: next };
      }),

    smartFillDay: (dayId, goal) =>
      set((s) => {
        const w = s.activeWeekIndex;
        const day = s.weekDays[w].find((d) => d.id === dayId);
        if (!day || day.type !== "workout" || day.exercises.length > 0) return s;
        const picks = pickFiveForSmartFill(exerciseLibrary, goal);
        if (picks.length === 0) return s;
        const newExercises = picks.map((ex) => createWorkoutExerciseForGoal(ex, goal));
        const days = s.weekDays[w].map((d) =>
          d.id === dayId ? { ...d, exercises: newExercises } : d,
        );
        const next = [...s.weekDays];
        next[w] = days;
        return { weekDays: next };
      }),

    replaceActiveWeekFromProgram: (program) => {
      const v = validateWorkoutProgram(program);
      if (!v.ok || !v.program) {
        const msg = v.zodError?.message ?? "هيكل البرنامج غير صالح";
        return { ok: false, message: msg };
      }
      const hydrated = hydrateWorkoutProgramIds(v.program);
      set((s) => {
        const next = [...s.weekDays];
        next[s.activeWeekIndex] = hydrated.days;
        return {
          weekDays: next,
          title: hydrated.title,
          description: hydrated.description,
          programId: hydrated.id,
        };
      });
      return { ok: true };
    },

    getProgramSnapshot: () => {
      const s = get();
      return {
        id: s.programId,
        title: s.title,
        description: s.description,
        weeksCount: s.weeksCount,
        days: s.weekDays[s.activeWeekIndex] ?? [],
      };
    },

    resetBuilderState: () =>
      set({
        ...buildWorkoutBuilderInitialData(),
        _hasHydrated: true,
      }),
  };
}

export const useWorkoutBuilderStore = create<WorkoutBuilderState>()(
  persist(
    (set, get) => ({
      ...buildWorkoutBuilderInitialData(),
      ...createBuilderActions(set, get),
    }),
    {
      name: WORKOUT_BUILDER_STORAGE_KEY,
      version: STORAGE_VERSION,
      partialize: (s) => ({
        programId: s.programId,
        title: s.title,
        description: s.description,
        weeksCount: s.weeksCount,
        activeWeekIndex: s.activeWeekIndex,
        weekDays: s.weekDays,
      }),
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...persistedState,
          _hasHydrated: false,
        } as WorkoutBuilderState;
        try {
          assertBuilderDataSliceValid({
            programId: merged.programId,
            title: merged.title,
            description: merged.description,
            weeksCount: merged.weeksCount,
            activeWeekIndex: merged.activeWeekIndex,
            weekDays: merged.weekDays,
          });
          return merged;
        } catch {
          console.warn(`[${WORKOUT_BUILDER_STORAGE_KEY}] merge: invalid payload, using defaults`);
          return {
            ...currentState,
            ...buildWorkoutBuilderInitialData(),
          };
        }
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn(`[${WORKOUT_BUILDER_STORAGE_KEY}] rehydrate failed, applying defaults`, error);
          queueMicrotask(() => {
            try {
              useWorkoutBuilderStore.persist.clearStorage();
            } catch {
              /* ignore */
            }
            try {
              useWorkoutBuilderStore.setState({
                ...buildWorkoutBuilderInitialData(),
                _hasHydrated: true,
              });
            } catch (e) {
              console.error(`[${WORKOUT_BUILDER_STORAGE_KEY}] failed to apply defaults after rehydrate error`, e);
            }
          });
          return;
        }
        if (state) {
          try {
            validateWorkoutBuilderStoreState(state);
          } catch (e) {
            console.warn(`[${WORKOUT_BUILDER_STORAGE_KEY}] post-rehydrate validation failed, resetting`, e);
            queueMicrotask(() => {
              try {
                useWorkoutBuilderStore.persist.clearStorage();
              } catch {
                /* ignore */
              }
              try {
                useWorkoutBuilderStore.setState({
                  ...buildWorkoutBuilderInitialData(),
                  _hasHydrated: true,
                });
              } catch (setErr) {
                console.error(`[${WORKOUT_BUILDER_STORAGE_KEY}] failed to reset after invalid state`, setErr);
              }
            });
          }
        }
      },
      migrate: (persisted, fromVersion) => {
        const slice = persisted as BuilderDataSlice;
        try {
          assertBuilderDataSliceValid(slice);
          return {
            programId: slice.programId,
            title: slice.title,
            description: slice.description,
            weeksCount: slice.weeksCount,
            activeWeekIndex: slice.activeWeekIndex,
            weekDays: slice.weekDays as WorkoutDay[][],
          };
        } catch {
          console.warn(
            `[${WORKOUT_BUILDER_STORAGE_KEY}] migrate: invalid v${fromVersion} payload, resetting`,
          );
          return buildWorkoutBuilderInitialData();
        }
      },
    },
  ),
);

/** Validate full store state after rehydration (same-version corrupt JSON shape). */
export function validateWorkoutBuilderStoreState(state: WorkoutBuilderState): void {
  assertBuilderDataSliceValid({
    programId: state.programId,
    title: state.title,
    description: state.description,
    weeksCount: state.weeksCount,
    activeWeekIndex: state.activeWeekIndex,
    weekDays: state.weekDays,
  });
}

/** Presentational slices passed from WorkoutCanvas — no direct Zustand in dumb components. */
export type WorkoutBuilderExerciseActions = Pick<
  WorkoutBuilderState,
  "patchSet" | "unlinkSuperset" | "applyRestToAllSets"
>;

export type WorkoutBuilderDayActions = Pick<
  WorkoutBuilderState,
  "linkSupersetWithNext" | "addExerciseToDay" | "smartFillDay"
>;

/**
 * Returns `null` until `_hasHydrated` is true so subtree can skip reading weekDays/days.
 * Still subscribes to the selector (Zustand rules); pair with parent gate that mounts after hydration.
 */
export function useSafeWorkoutBuilderStore<T>(selector: (state: WorkoutBuilderState) => T): T | null {
  const hasHydrated = useWorkoutBuilderStore((s) => s._hasHydrated);
  const result = useWorkoutBuilderStore(selector);
  return hasHydrated ? result : null;
}
