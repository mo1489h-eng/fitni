import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapMuscleToBucket, type MuscleBucket } from "@/lib/analytics/muscleBuckets";
import {
  parseYmd,
  rangeStartDate,
  setVolumeKg,
  type TimeRangeKey as TimeRangeKeyImport,
  toYmd,
  weekKeyMonday,
} from "@/lib/analytics/calculations";

export type SessionExerciseRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  weight_used: number;
  reps_completed: number;
  set_number: number;
  completed_at: string;
  session_started_at: string;
  session_completed_at: string | null;
  exercise_name: string;
  target_reps: number;
  target_sets: number;
  muscle_bucket: MuscleBucket | "other";
};

export type WorkoutSessionLite = {
  id: string;
  started_at: string;
  completed_at: string | null;
  total_volume: number | null;
};

export type TrainerSessionRow = {
  id: string;
  session_date: string;
  is_completed: boolean;
};

async function fetchClientAnalyticsBundle(clientId: string) {
  const { data: sessions, error: sErr } = await supabase
    .from("workout_sessions")
    .select("id, started_at, completed_at, total_volume")
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: true });

  if (sErr) throw sErr;
  const sessionList = (sessions ?? []) as WorkoutSessionLite[];
  const sessionIds = sessionList.map((s) => s.id);
  if (sessionIds.length === 0) {
    return {
      sessions: sessionList,
      sessionExerciseRows: [] as SessionExerciseRow[],
      trainerSessions: [] as TrainerSessionRow[],
    };
  }

  const wseRows: any[] = [];
  const chunk = 150;
  for (let i = 0; i < sessionIds.length; i += chunk) {
    const part = sessionIds.slice(i, i + chunk);
    const { data: wse, error: wErr } = await supabase
      .from("workout_session_exercises")
      .select("id, session_id, exercise_id, weight_used, reps_completed, set_number, completed_at")
      .in("session_id", part);
    if (wErr) throw wErr;
    wseRows.push(...(wse ?? []));
  }
  const exerciseIds = [...new Set(wseRows.map((r) => r.exercise_id))];

  const peMap = new Map<
    string,
    { name: string; reps: number; sets: number; exercise_library_id: string | null }
  >();
  if (exerciseIds.length > 0) {
    const { data: pes, error: pErr } = await supabase
      .from("program_exercises")
      .select("id, name, reps, sets, exercise_library_id")
      .in("id", exerciseIds);
    if (pErr) throw pErr;
    (pes ?? []).forEach((p: any) => {
      peMap.set(p.id, {
        name: p.name,
        reps: p.reps ?? 0,
        sets: p.sets ?? 0,
        exercise_library_id: p.exercise_library_id,
      });
    });
  }

  const libIds = [...new Set([...peMap.values()].map((v) => v.exercise_library_id).filter(Boolean))] as string[];
  const libMap = new Map<string, string>();
  if (libIds.length > 0) {
    const { data: libs, error: lErr } = await supabase
      .from("exercise_library")
      .select("id, muscle_group")
      .in("id", libIds);
    if (lErr) throw lErr;
    (libs ?? []).forEach((row: any) => libMap.set(row.id, row.muscle_group));
  }

  const sessionTime = new Map(sessionList.map((s) => [s.id, s]));

  const sessionExerciseRows: SessionExerciseRow[] = wseRows.map((row: any) => {
    const pe = peMap.get(row.exercise_id);
    const libId = pe?.exercise_library_id;
    const mg = libId ? libMap.get(libId) : undefined;
    const bucket = mapMuscleToBucket(mg);
    const s = sessionTime.get(row.session_id);
    return {
      id: row.id,
      session_id: row.session_id,
      exercise_id: row.exercise_id,
      weight_used: Number(row.weight_used) || 0,
      reps_completed: Number(row.reps_completed) || 0,
      set_number: Number(row.set_number) || 0,
      completed_at: row.completed_at,
      session_started_at: s?.started_at ?? "",
      session_completed_at: s?.completed_at ?? null,
      exercise_name: pe?.name ?? "تمرين",
      target_reps: pe?.reps ?? 0,
      target_sets: pe?.sets ?? 0,
      muscle_bucket: bucket,
    };
  });

  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const { data: tsRows, error: tsErr } = await supabase
    .from("trainer_sessions")
    .select("id, session_date, is_completed")
    .eq("client_id", clientId)
    .gte("session_date", since.toISOString().slice(0, 10));

  if (tsErr) throw tsErr;

  return {
    sessions: sessionList,
    sessionExerciseRows,
    trainerSessions: (tsRows ?? []) as TrainerSessionRow[],
  };
}

export function useClientAnalyticsData(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-analytics-bundle", clientId],
    queryFn: () => fetchClientAnalyticsBundle(clientId!),
    enabled: !!clientId,
  });
}

/** Filter rows by time range on session date. */
export function filterRowsByRange(rows: SessionExerciseRow[], key: TimeRangeKey): SessionExerciseRow[] {
  const start = rangeStartDate(key);
  if (!start) return rows;
  const t = start.getTime();
  return rows.filter((r) => new Date(r.session_started_at).getTime() >= t);
}

export type StrengthPoint = { date: string; weight: number; label: string; isPr: boolean };

export function buildStrengthSeries(
  rows: SessionExerciseRow[],
  exerciseIdsFilter: string[] | null
): { byExercise: Map<string, StrengthPoint[]>; exerciseNames: Map<string, string> } {
  const byExercise = new Map<string, StrengthPoint[]>();
  const names = new Map<string, string>();
  const relevant = exerciseIdsFilter?.length
    ? rows.filter((r) => exerciseIdsFilter.includes(r.exercise_id))
    : rows;

  const grouped = new Map<string, SessionExerciseRow[]>();
  relevant.forEach((r) => {
    const arr = grouped.get(r.exercise_id) ?? [];
    arr.push(r);
    grouped.set(r.exercise_id, arr);
  });

  grouped.forEach((list, eid) => {
    names.set(eid, list[0]?.exercise_name ?? eid);
    const byDay = new Map<string, number>();
    list.forEach((r) => {
      const day = toYmd(new Date(r.session_started_at));
      const w = r.weight_used;
      const prev = byDay.get(day) ?? 0;
      if (w >= prev) byDay.set(day, w);
    });
    const days = [...byDay.keys()].sort();
    let maxSoFar = 0;
    const points: StrengthPoint[] = [];
    days.forEach((day) => {
      const weight = byDay.get(day) ?? 0;
      const isPr = weight > maxSoFar && weight > 0;
      if (weight > maxSoFar) maxSoFar = weight;
      points.push({ date: day, weight, label: names.get(eid) ?? "", isPr });
    });
    byExercise.set(eid, points);
  });

  return { byExercise, exerciseNames: names };
}

export function volumeBySession(rows: SessionExerciseRow[]): { date: string; volume: number; session_id: string }[] {
  const map = new Map<string, { volume: number; session_id: string; date: string }>();
  rows.forEach((r) => {
    const v = setVolumeKg(r.weight_used, r.reps_completed);
    const cur = map.get(r.session_id);
    const day = toYmd(new Date(r.session_started_at));
    if (!cur) {
      map.set(r.session_id, { volume: v, session_id: r.session_id, date: day });
    } else {
      cur.volume += v;
    }
  });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function muscleVolumeByMonth(
  rows: SessionExerciseRow[],
  monthOffset: 0 | 1
): Record<MuscleBucket, number> {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const y = target.getFullYear();
  const m = target.getMonth();

  const buckets: Record<MuscleBucket, number> = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
    core: 0,
  };

  rows.forEach((r) => {
    const d = new Date(r.session_started_at);
    if (d.getFullYear() !== y || d.getMonth() !== m) return;
    if (r.muscle_bucket === "other") return;
    buckets[r.muscle_bucket] += setVolumeKg(r.weight_used, r.reps_completed);
  });

  return buckets;
}

export function repPerformanceBySession(rows: SessionExerciseRow[]): {
  date: string;
  pct: number;
}[] {
  const bySession = new Map<string, SessionExerciseRow[]>();
  rows.forEach((r) => {
    const arr = bySession.get(r.session_id) ?? [];
    arr.push(r);
    bySession.set(r.session_id, arr);
  });

  const out: { date: string; pct: number }[] = [];
  bySession.forEach((list) => {
    const target = list.reduce((s, r) => s + Math.max(1, r.target_reps) * Math.max(1, r.target_sets), 0);
    const actual = list.reduce((s, r) => s + Math.max(0, r.reps_completed), 0);
    const pct = target > 0 ? Math.min(200, Math.round((actual / target) * 100)) : 0;
    const date = toYmd(new Date(list[0].session_started_at));
    out.push({ date, pct });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function weeklyCompliance(
  trainerSessions: TrainerSessionRow[],
  workoutDays: Set<string>,
  weeksBack: number
): { weekStart: string; pct: number; planned: number; done: number }[] {
  const out: { weekStart: string; pct: number; planned: number; done: number }[] = [];
  const today = new Date();
  for (let w = weeksBack - 1; w >= 0; w--) {
    const anchor = new Date(today);
    anchor.setDate(anchor.getDate() - w * 7);
    const monday = weekKeyMonday(anchor);
    const start = parseYmd(monday);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    let planned = 0;
    let done = 0;
    trainerSessions.forEach((ts) => {
      const d = parseYmd(ts.session_date);
      if (d >= start && d < end) {
        planned += 1;
        if (ts.is_completed) done += 1;
      }
    });

    let workoutDaysInWeek = 0;
    workoutDays.forEach((day) => {
      const x = parseYmd(day);
      if (x >= start && x < end) workoutDaysInWeek += 1;
    });

    const softTarget = 3;
    let pct: number;
    let displayPlanned = planned;
    let displayDone = done;
    if (planned > 0) {
      pct = Math.round((done / planned) * 100);
    } else if (workoutDaysInWeek > 0) {
      displayPlanned = softTarget;
      displayDone = Math.min(workoutDaysInWeek, softTarget);
      pct = Math.min(100, Math.round((workoutDaysInWeek / softTarget) * 100));
    } else {
      pct = 0;
    }
    out.push({ weekStart: monday, pct, planned: displayPlanned, done: displayDone });
  }
  return out;
}

export function dayVolumeMap(rows: SessionExerciseRow[]): Map<string, number> {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const day = toYmd(new Date(r.session_started_at));
    const v = setVolumeKg(r.weight_used, r.reps_completed);
    m.set(day, (m.get(day) ?? 0) + v);
  });
  return m;
}

export function weekdayCounts(rows: SessionExerciseRow[]): { day: number; nameAr: string; count: number }[] {
  const names = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  rows.forEach((r) => {
    const wd = new Date(r.session_started_at).getDay();
    counts[wd] += 1;
  });
  return counts.map((count, day) => ({ day, nameAr: names[day], count }));
}
