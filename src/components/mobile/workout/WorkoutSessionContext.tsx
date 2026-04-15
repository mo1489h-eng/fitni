import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sessionLogSyncTs, upsertSessionLog } from "@/lib/sessionLogs";
import { finishSession, startSession } from "@/lib/session-engine";
import { useSessionLogsRealtime } from "@/hooks/useSessionLogsRealtime";
import { useSessionPresence, type SessionPresenceRole } from "@/hooks/useSessionPresence";
import { useSessionLogRetryAutoFlush } from "@/hooks/useSessionLogRetry";
import { buildWorkoutPlanFromDay, type PlanExercise } from "@/lib/workoutDayPlan";
import type { CompletedSetValue, WorkoutPhase } from "./types";
import { STORAGE_KEY, type PersistedWorkoutV1 } from "./types";
import { useWorkoutStore } from "@/store/workout-store";
import { resolveExerciseMuscleGroups } from "@/lib/exerciseMuscleMapping";

const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function setKey(exerciseId: string, setNum: number): string {
  return `${exerciseId}:${setNum}`;
}

function countExercisesFullyDone(plan: PlanExercise[], completed: Record<string, CompletedSetValue>): number {
  let n = 0;
  for (const ex of plan) {
    let ok = true;
    for (let s = 1; s <= ex.sets; s++) {
      if (!completed[setKey(ex.exerciseId, s)]) {
        ok = false;
        break;
      }
    }
    if (ok) n++;
  }
  return n;
}

type Ctx = {
  phase: WorkoutPhase;
  loadError: string | null;
  sessionId: string | null;
  clientId: string;
  portalToken: string;
  plan: PlanExercise[];
  programDayId: string;
  programName: string;
  trainerId: string | null;
  exerciseIndex: number;
  setWithinExercise: number;
  completed: Record<string, CompletedSetValue>;
  restRemaining: number;
  restTotalSeconds: number;
  restEndsAtMs: number | null;
  restPaused: boolean;
  pauseRest: () => void;
  resumeRest: () => void;
  elapsedMs: number;
  totalVolume: number;
  totalSetsLogged: number;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  previewOffset: number;
  setPreviewOffset: (n: number) => void;
  completeSet: (weight: number, reps: number, opts?: { extraRestSeconds?: number; rpe?: number }) => Promise<void>;
  skipRest: () => void;
  addRestSeconds: (n: number) => void;
  goNextExercise: () => void;
  goPrevExercise: () => void;
  awaitingNextExercise: boolean;
  finalizeAndExit: () => Promise<void>;
  finalizeWorkout: () => Promise<void>;
  onClose: () => void;
  /** Flash key `exerciseId:setNum` when coach updates a set remotely */
  highlightedSetKey: string | null;
  lastLiveAction: string | null;
  trainerOnline: boolean;
  traineeOnline: boolean;
};

const WorkoutSessionContext = createContext<Ctx | null>(null);

type ProviderProps = {
  clientId: string;
  portalToken: string;
  onClose: () => void;
  /** Presence role for Realtime Presence (default trainee / client flow). */
  sessionPresenceRole?: SessionPresenceRole;
  children: ReactNode;
};

export function WorkoutSessionProvider({
  clientId,
  portalToken,
  onClose,
  sessionPresenceRole = "trainee",
  children,
}: ProviderProps) {
  const queryClient = useQueryClient();
  useSessionLogRetryAutoFlush();
  const [phase, setPhase] = useState<WorkoutPhase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanExercise[]>([]);
  const [programDayId, setProgramDayId] = useState("");
  const [programName, setProgramName] = useState("");
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setWithinExercise, setSetWithinExercise] = useState(1);
  const [completed, setCompleted] = useState<Record<string, CompletedSetValue>>({});
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotalSeconds, setRestTotalSeconds] = useState(0);
  const [restEndsAtMs, setRestEndsAtMs] = useState<number | null>(null);
  const [restPaused, setRestPaused] = useState(false);
  const pausedRemainingMsRef = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [awaitingNextExercise, setAwaitingNextExercise] = useState(false);
  const [highlightedSetKey, setHighlightedSetKey] = useState<string | null>(null);
  const [lastLiveAction, setLastLiveAction] = useState<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const volumeRef = useRef(0);
  const setsRef = useRef(0);
  const sessionCreating = useRef(false);
  const restHandledRef = useRef(false);
  const completedRef = useRef<Record<string, CompletedSetValue>>({});
  const hydrationAppliedRef = useRef(false);

  const { trainerOnline, traineeOnline } = useSessionPresence(sessionId, sessionPresenceRole, !!sessionId);

  const { data: bootstrap } = useQuery({
    queryKey: ["workout-bootstrap", clientId, portalToken],
    queryFn: async () => {
      const { data: client, error: cErr } = await supabase
        .from("clients")
        .select("trainer_id")
        .eq("id", clientId)
        .single();
      if (cErr) throw cErr;
      const { data, error } = await supabase.rpc("get_portal_program", { p_token: portalToken });
      if (error) throw error;
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (!parsed?.days?.length) {
        return { plan: [] as PlanExercise[], programDayId: "", programName: "", trainerId: client?.trainer_id ?? null };
      }
      const todayName = WEEKDAYS[new Date().getDay()];
      const day = parsed.days.find((d: { day_name: string }) => (d.day_name || "").includes(todayName));
      if (!day?.exercises?.length) {
        return { plan: [] as PlanExercise[], programDayId: "", programName: "", trainerId: client?.trainer_id ?? null };
      }
      const p = buildWorkoutPlanFromDay({ id: day.id, exercises: day.exercises });
      return {
        plan: p,
        programDayId: day.id as string,
        programName: (parsed.name as string) || "",
        trainerId: client?.trainer_id ?? null,
      };
    },
    enabled: !!clientId && !!portalToken,
  });

  useEffect(() => {
    if (!clientId) return;
    useWorkoutStore.getState().setActiveClientForFatigue(clientId);
    useWorkoutStore.getState().loadMuscleStateLocal(clientId);
  }, [clientId]);

  useEffect(() => {
    if (!bootstrap) return;
    if (!bootstrap.plan.length || !bootstrap.programDayId) {
      setLoadError("لا يوجد تمارين مجدولة ليوم اليوم");
      setPhase("loading");
      return;
    }
    setPlan(bootstrap.plan);
    setProgramDayId(bootstrap.programDayId);
    setProgramName(bootstrap.programName);
    setTrainerId(bootstrap.trainerId);
    setLoadError(null);
  }, [bootstrap]);

  const { data: hydratedLogs } = useQuery({
    queryKey: ["session-logs-hydrate", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const { data: sl, error: e1 } = await supabase.from("session_logs").select("*").eq("session_id", sessionId);
      if (e1) throw e1;
      if (sl?.length) return { kind: "logs" as const, rows: sl };
      const { data: wse, error: e2 } = await supabase.from("workout_session_exercises").select("*").eq("session_id", sessionId);
      if (e2) throw e2;
      return { kind: "legacy" as const, rows: wse ?? [] };
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    hydrationAppliedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!hydratedLogs?.rows.length || hydrationAppliedRef.current) return;
    hydrationAppliedRef.current = true;
    setCompleted((prev) => {
      const next = { ...prev };
      if (hydratedLogs.kind === "logs") {
        for (const row of hydratedLogs.rows) {
          const k = setKey(row.exercise_id, row.set_number);
          const w = Number(row.weight ?? 0);
          const r = Number(row.reps ?? 0);
          const at = sessionLogSyncTs(row);
          const prevVal = next[k];
          if (prevVal?.syncedAt && new Date(prevVal.syncedAt).getTime() > new Date(at).getTime()) continue;
          next[k] = { weight: w, reps: r, syncedAt: at };
        }
      } else {
        for (const row of hydratedLogs.rows) {
          const k = setKey(row.exercise_id, row.set_number);
          const w = Number(row.weight_used ?? 0);
          const r = Number(row.reps_completed ?? 0);
          const at = row.completed_at;
          const prevVal = next[k];
          if (prevVal?.syncedAt && new Date(prevVal.syncedAt).getTime() > new Date(at).getTime()) continue;
          next[k] = { weight: w, reps: r, syncedAt: at };
        }
      }
      return next;
    });
  }, [hydratedLogs]);

  useSessionLogsRealtime(
    sessionId,
    (rows) => {
      setCompleted((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          const k = setKey(row.exercise_id, row.set_number);
          const w = Number(row.weight ?? 0);
          const r = Number(row.reps ?? 0);
          const at = sessionLogSyncTs(row);
          const prevVal = next[k];
          if (prevVal?.syncedAt && new Date(prevVal.syncedAt).getTime() > new Date(at).getTime()) continue;
          next[k] = { weight: w, reps: r, syncedAt: at };
        }
        return next;
      });
      if (rows.length > 0) {
        const row = rows[rows.length - 1]!;
        const trainerWrote = !!(trainerId && row.updated_by === trainerId);
        setLastLiveAction(trainerWrote ? "المدرب سجل مجموعة" : "المتدرب سجل مجموعة");
        setHighlightedSetKey(`${row.exercise_id}:${row.set_number}`);
      }
    },
    { debounceMs: 80, enabled: !!sessionId },
  );

  useEffect(() => {
    if (!highlightedSetKey) return;
    const t = window.setTimeout(() => setHighlightedSetKey(null), 1000);
    return () => window.clearTimeout(t);
  }, [highlightedSetKey]);

  useEffect(() => {
    if (!lastLiveAction) return;
    const t = window.setTimeout(() => setLastLiveAction(null), 3000);
    return () => window.clearTimeout(t);
  }, [lastLiveAction]);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const { id } = await startSession({
        clientId,
        programDayId,
        trainerId,
      });
      return id;
    },
    onSuccess: (id) => {
      setSessionId(id);
      queryClient.invalidateQueries({ queryKey: ["mobile-portal-workout-stats"] });
    },
  });

  useEffect(() => {
    if (!plan.length || !programDayId || sessionId || loadError || sessionCreating.current) return;
    sessionCreating.current = true;
    createSessionMutation.mutate(undefined, {
      onSuccess: () => {
        startedAtRef.current = Date.now();
        setPhase("work");
        sessionCreating.current = false;
      },
      onError: (e) => {
        setLoadError((e as Error).message);
        sessionCreating.current = false;
      },
    });
  }, [plan, programDayId, sessionId, loadError, createSessionMutation]);

  useEffect(() => {
    if (phase !== "work" && phase !== "rest") return;
    const id = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  /** Timestamp-based rest countdown (accurate after sleep / background). */
  useEffect(() => {
    if (phase !== "rest" || restPaused || !restEndsAtMs) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((restEndsAtMs - Date.now()) / 1000));
      setRestRemaining(left);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, restEndsAtMs, restPaused]);

  useEffect(() => {
    if (phase !== "rest" || restRemaining > 0) return;
    if (restHandledRef.current) return;
    restHandledRef.current = true;
    const ex = plan[exerciseIndex];
    const isLastSet = setWithinExercise >= (ex?.sets ?? 0);
    const isLastEx = exerciseIndex >= plan.length - 1;
    if (!ex) {
      setPhase("complete");
      return;
    }
    if (!isLastSet) {
      setPhase("work");
      setSetWithinExercise((s) => s + 1);
      return;
    }
    if (!isLastEx) {
      setAwaitingNextExercise(true);
      setPhase("work");
      return;
    }
    setPhase("complete");
  }, [phase, restRemaining, plan, exerciseIndex, setWithinExercise, sessionId]);

  const persist = useCallback(() => {
    if (!sessionId || !plan.length) return;
    const payload: PersistedWorkoutV1 = {
      v: 1,
      sessionId,
      clientId,
      programDayId,
      programName,
      plan,
      exerciseIndex,
      setWithinExercise,
      completed,
      startedAtMs: startedAtRef.current,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [sessionId, clientId, programDayId, programName, plan, exerciseIndex, setWithinExercise, completed]);

  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  useEffect(() => {
    persist();
  }, [persist]);

  const scheduleRestPhase = useCallback((baseSeconds: number, opts?: { extraRestSeconds?: number }) => {
    const extra = useWorkoutStore.getState().consumePendingExtraRest();
    const total = Math.max(0, baseSeconds + extra + (opts?.extraRestSeconds ?? 0));
    setRestTotalSeconds(total);
    setRestRemaining(total);
    setRestEndsAtMs(Date.now() + total * 1000);
    setRestPaused(false);
    pausedRemainingMsRef.current = 0;
    setPhase("rest");
  }, []);

  const insertSetMutation = useMutation({
    mutationFn: async (payload: {
      weight: number;
      reps: number;
      exercise: PlanExercise;
      setNum: number;
    }): Promise<{ syncedAt: string } | null> => {
      const { weight, reps, exercise, setNum } = payload;
      const vol = weight * reps;
      if (!sessionId) {
        volumeRef.current += vol;
        setsRef.current += 1;
        return null;
      }
      const result = await upsertSessionLog({
        sessionId,
        exerciseId: exercise.exerciseId,
        setNumber: setNum,
        weight,
        reps,
        completed: true,
      });
      const wl = {
        client_id: clientId,
        program_day_id: exercise.programDayId,
        exercise_id: exercise.exerciseId,
        set_number: setNum,
        planned_reps: exercise.reps,
        planned_weight: exercise.weight,
        actual_reps: reps,
        actual_weight: weight,
        completed: true,
      };
      if (result.status === "synced") {
        const ins = await supabase.from("workout_logs").insert(wl);
        if (ins.error) throw ins.error;
      } else {
        void supabase.from("workout_logs").insert(wl).catch(() => {});
      }
      await (supabase as any).from("workout_sessions").update({ current_exercise_index: exerciseIndex }).eq("id", sessionId);
      volumeRef.current += vol;
      setsRef.current += 1;
      return {
        syncedAt: result.status === "synced" ? sessionLogSyncTs(result.row) : new Date().toISOString(),
      };
    },
  });

  const completeSet = useCallback(
    async (weight: number, reps: number, opts?: { extraRestSeconds?: number; rpe?: number }) => {
      const ex = plan[exerciseIndex];
      if (!ex) return;
      const k = setKey(ex.exerciseId, setWithinExercise);
      const rollback = { ...completedRef.current };
      setCompleted((prev) => ({ ...prev, [k]: { weight, reps } }));

      try {
        const sync = await insertSetMutation.mutateAsync({ weight, reps, exercise: ex, setNum: setWithinExercise });
        if (sync?.syncedAt) {
          setCompleted((prev) => ({
            ...prev,
            [k]: { weight, reps, syncedAt: sync.syncedAt },
          }));
        }
        const rpe =
          opts?.rpe ??
          useWorkoutStore.getState().rpeByExerciseId[ex.exerciseId] ??
          7;
        const { primary, secondary } = resolveExerciseMuscleGroups({
          muscleGroup: ex.muscleGroup,
          name: ex.name,
        });
        useWorkoutStore.getState().applyFatigueFromSet(clientId, primary, secondary, weight * reps, rpe);
      } catch {
        setCompleted(rollback);
        return;
      }

      const isLastSet = setWithinExercise >= ex.sets;
      const isLastEx = exerciseIndex >= plan.length - 1;

      if (!isLastSet) {
        if (ex.restSeconds > 0) {
          scheduleRestPhase(ex.restSeconds, opts);
        } else {
          setSetWithinExercise((s) => s + 1);
        }
        return;
      }

      if (!isLastEx) {
        if (ex.restSeconds > 0) {
          scheduleRestPhase(ex.restSeconds, opts);
        } else {
          setAwaitingNextExercise(true);
        }
        return;
      }

      if (ex.restSeconds > 0) {
        scheduleRestPhase(ex.restSeconds, opts);
      } else {
        setPhase("complete");
      }
    },
    [plan, exerciseIndex, setWithinExercise, insertSetMutation, scheduleRestPhase, clientId]
  );

  const skipRest = useCallback(() => {
    setRestRemaining(0);
    setRestEndsAtMs(null);
    setRestPaused(false);
    pausedRemainingMsRef.current = 0;
  }, []);

  const addRestSeconds = useCallback((n: number) => {
    if (restPaused) {
      pausedRemainingMsRef.current += n * 1000;
      setRestRemaining((r) => r + n);
      setRestTotalSeconds((t) => t + n);
      return;
    }
    setRestEndsAtMs((prev) => {
      const anchor = prev ?? Date.now() + restRemaining * 1000;
      return anchor + n * 1000;
    });
    setRestRemaining((r) => r + n);
    setRestTotalSeconds((t) => t + n);
  }, [restPaused, restRemaining]);

  const pauseRest = useCallback(() => {
    if (phase !== "rest" || restPaused || !restEndsAtMs) return;
    pausedRemainingMsRef.current = Math.max(0, restEndsAtMs - Date.now());
    setRestPaused(true);
    setRestEndsAtMs(null);
  }, [phase, restPaused, restEndsAtMs]);

  const resumeRest = useCallback(() => {
    if (!restPaused || pausedRemainingMsRef.current <= 0) return;
    setRestEndsAtMs(Date.now() + pausedRemainingMsRef.current);
    setRestPaused(false);
  }, [restPaused]);

  const goNextExercise = useCallback(() => {
    if (exerciseIndex >= plan.length - 1) return;
    setAwaitingNextExercise(false);
    setExerciseIndex((i) => i + 1);
    setSetWithinExercise(1);
    setPreviewOffset(0);
    void (supabase as any)
      .from("workout_sessions")
      .update({ current_exercise_index: exerciseIndex + 1 })
      .eq("id", sessionId!);
  }, [exerciseIndex, plan.length, sessionId]);

  const goPrevExercise = useCallback(() => {
    if (exerciseIndex <= 0) return;
    setAwaitingNextExercise(false);
    setExerciseIndex((i) => i - 1);
    setSetWithinExercise(1);
    setPreviewOffset(0);
    void (supabase as any)
      .from("workout_sessions")
      .update({ current_exercise_index: exerciseIndex - 1 })
      .eq("id", sessionId!);
  }, [exerciseIndex, sessionId]);

  const finalizeWorkout = useCallback(async () => {
    if (!sessionId) return;
    const durationMin = Math.max(1, Math.round(elapsedMs / 60000));
    await finishSession(sessionId, {
      duration_minutes: durationMin,
      total_volume: volumeRef.current,
      total_sets: setsRef.current,
    });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    void useWorkoutStore.getState().persistIndexedSnapshot(null);
    await useWorkoutStore.getState().syncMuscleStatusToSupabase(clientId);
    queryClient.invalidateQueries({ queryKey: ["user-muscle-status", clientId] });
    queryClient.invalidateQueries({ queryKey: ["muscle-recovery", clientId] });
  }, [sessionId, elapsedMs, clientId, queryClient]);

  const finalizeAndExit = useCallback(async () => {
    await finalizeWorkout();
    onClose();
  }, [finalizeWorkout, onClose]);

  const totalVolume = useMemo(() => {
    return Object.values(completed).reduce((s, v) => s + v.weight * v.reps, 0);
  }, [completed]);

  const totalSetsLogged = useMemo(() => Object.keys(completed).length, [completed]);

  const value = useMemo(
    (): Ctx => ({
      phase: loadError ? "loading" : phase,
      loadError,
      sessionId,
      clientId,
      portalToken,
      plan,
      programDayId,
      programName,
      trainerId,
      exerciseIndex,
      setWithinExercise,
      completed,
      restRemaining,
      restTotalSeconds,
      restEndsAtMs,
      restPaused,
      pauseRest,
      resumeRest,
      elapsedMs,
      totalVolume,
      totalSetsLogged,
      drawerOpen,
      setDrawerOpen,
      previewOffset,
      setPreviewOffset,
      completeSet,
      skipRest,
      addRestSeconds,
      goNextExercise,
      goPrevExercise,
      awaitingNextExercise,
      finalizeAndExit,
      finalizeWorkout,
      onClose,
      highlightedSetKey,
      lastLiveAction,
      trainerOnline,
      traineeOnline,
    }),
    [
      phase,
      loadError,
      sessionId,
      clientId,
      portalToken,
      plan,
      programDayId,
      programName,
      trainerId,
      exerciseIndex,
      setWithinExercise,
      completed,
      restRemaining,
      restTotalSeconds,
      restEndsAtMs,
      restPaused,
      pauseRest,
      resumeRest,
      elapsedMs,
      totalVolume,
      totalSetsLogged,
      drawerOpen,
      previewOffset,
      completeSet,
      skipRest,
      addRestSeconds,
      goNextExercise,
      goPrevExercise,
      awaitingNextExercise,
      finalizeAndExit,
      finalizeWorkout,
      onClose,
      highlightedSetKey,
      lastLiveAction,
      trainerOnline,
      traineeOnline,
    ]
  );

  if (loadError) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6" style={{ background: "#0A0A0A" }} dir="rtl">
        <p className="text-center text-base text-white">{loadError}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-[12px] px-6 py-3 text-sm font-bold text-white transition active:scale-95"
          style={{ background: "#161616" }}
        >
          إغلاق
        </button>
      </div>
    );
  }

  return <WorkoutSessionContext.Provider value={value}>{children}</WorkoutSessionContext.Provider>;
}

export function useWorkoutSession(): Ctx {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) throw new Error("useWorkoutSession outside provider");
  return ctx;
}

export { countExercisesFullyDone, setKey };
