import { create } from "zustand";

import { sampleHypertrophyProgram } from "@/mocks/mockWorkouts";
import {
  cloneDaysWithNewIds,
  createWorkoutExercise,
  createWorkoutExerciseForGoal,
  hydrateWorkoutProgramIds,
  type TrainingGoal,
} from "@/lib/workout-builder-utils";
import { validateWorkoutProgram } from "@/lib/validations/workout";
import { pickFiveForSmartFill } from "@/lib/smart-fill-exercises";
import { randomUUID } from "@/lib/random-id";
import { exerciseLibrary } from "@/mocks/mockWorkouts";
import type { Exercise, Set, WorkoutDay, WorkoutProgram } from "@/types/workout";

type WorkoutBuilderState = {
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
};

function hydrateInitialWeeks(): WorkoutDay[][] {
  const n = Math.max(1, sampleHypertrophyProgram.weeksCount);
  return Array.from({ length: n }, () => cloneDaysWithNewIds(sampleHypertrophyProgram.days));
}

export const useWorkoutBuilderStore = create<WorkoutBuilderState>((set, get) => ({
  programId: sampleHypertrophyProgram.id,
  title: sampleHypertrophyProgram.title,
  description: sampleHypertrophyProgram.description,
  weeksCount: sampleHypertrophyProgram.weeksCount,
  activeWeekIndex: 0,
  weekDays: hydrateInitialWeeks(),

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
}));
