import { supabase } from "@/integrations/supabase/client";
import { mapMuscleToBucket, type MuscleBucket } from "@/lib/analytics/muscleBuckets";
import { toYmd } from "@/lib/analytics/calculations";
import { muscleFieldToTokens, normalizeSecondaryMuscles } from "@/lib/muscleHeatmapExerciseMapping";
import type { MuscleGroupId } from "@/store/workout-store";

export type MuscleRecoveryVisualState =
  | "fresh"
  | "recovered"
  | "training_today"
  | "fatigued"
  | "very_fatigued";

/** سلاسل `react-body-highlighter` الحرفية. */
export type LibraryMuscle =
  | "chest"
  | "biceps"
  | "triceps"
  | "forearm"
  | "abs"
  | "obliques"
  | "front-deltoids"
  | "back-deltoids"
  | "quadriceps"
  | "hamstring"
  | "calves"
  | "gluteal"
  | "trapezius"
  | "upper-back"
  | "lower-back";

export type FitbodState = MuscleRecoveryVisualState;

export interface MuscleRecoveryData {
  recoveryPercent: number;
  lastTrainedDaysAgo: number | null;
  state: MuscleRecoveryVisualState;
}

const BUCKETS: MuscleGroupId[] = ["chest", "back", "shoulders", "arms", "core", "legs"];

const STATE_RANK: Record<MuscleRecoveryVisualState, number> = {
  fresh: 0,
  recovered: 1,
  training_today: 2,
  fatigued: 3,
  very_fatigued: 4,
};

function moreFatigued(a: MuscleRecoveryVisualState, b: MuscleRecoveryVisualState): MuscleRecoveryVisualState {
  return STATE_RANK[a] >= STATE_RANK[b] ? a : b;
}

/**
 * قيم `muscle_group` من ExerciseDB / المكتبة (مفتاح مُطبّع) → عضلات المكتبة.
 */
export const MUSCLE_TO_LIBRARY: Record<string, LibraryMuscle[]> = {
  pectorals: ["chest"],
  pecs: ["chest"],
  pectoral: ["chest"],
  chest: ["chest"],
  lats: ["upper-back"],
  "latissimus dorsi": ["upper-back"],
  "upper back": ["upper-back"],
  rhomboids: ["upper-back"],
  traps: ["trapezius"],
  trap: ["trapezius"],
  trapezius: ["trapezius"],
  "lower back": ["lower-back"],
  "erector spinae": ["lower-back"],
  spine: ["lower-back"],
  delts: ["front-deltoids", "back-deltoids"],
  deltoids: ["front-deltoids", "back-deltoids"],
  shoulders: ["front-deltoids", "back-deltoids"],
  "anterior deltoid": ["front-deltoids"],
  "rear deltoid": ["back-deltoids"],
  "posterior deltoid": ["back-deltoids"],
  biceps: ["biceps"],
  "biceps brachii": ["biceps"],
  triceps: ["triceps"],
  "triceps brachii": ["triceps"],
  forearms: ["forearm"],
  forearm: ["forearm"],
  abs: ["abs"],
  "rectus abdominis": ["abs"],
  obliques: ["obliques"],
  abdominals: ["abs"],
  core: ["abs", "obliques"],
  quads: ["quadriceps"],
  quadriceps: ["quadriceps"],
  hamstrings: ["hamstring"],
  hamstring: ["hamstring"],
  glutes: ["gluteal"],
  "gluteus maximus": ["gluteal"],
  gluteal: ["gluteal"],
  calves: ["calves"],
  gastrocnemius: ["calves"],
  legs: ["quadriceps", "hamstring"],

  // Arabic labels as stored in exercise_library.muscle_group
  "صدر": ["chest"],
  "ظهر": ["upper-back", "lower-back"],
  "أكتاف": ["front-deltoids", "back-deltoids"],
  "اكتاف": ["front-deltoids", "back-deltoids"],
  "بايسبس": ["biceps"],
  "ترايسبس": ["triceps"],
  "أرجل": ["quadriceps", "hamstring", "calves", "gluteal"],
  "ارجل": ["quadriceps", "hamstring", "calves", "gluteal"],
  "فخذ أمامي": ["quadriceps"],
  "فخذ امامي": ["quadriceps"],
  "فخذ خلفي": ["hamstring"],
  "سمانة": ["calves"],
  "ألوية": ["gluteal"],
  "الوية": ["gluteal"],
  "كور": ["abs", "obliques"],
  "بطن": ["abs"],
  "معدة": ["abs"],
};

const BUCKET_TO_LIBRARY: Record<MuscleBucket, LibraryMuscle[]> = {
  chest: ["chest"],
  back: ["upper-back", "lower-back", "trapezius"],
  shoulders: ["front-deltoids", "back-deltoids"],
  arms: ["biceps", "triceps", "forearm"],
  core: ["abs", "obliques"],
  legs: ["quadriceps", "hamstring", "calves", "gluteal"],
};

const GROUP_TO_LIBRARY_MUSCLES: Record<MuscleGroupId, LibraryMuscle[]> = {
  chest: ["chest"],
  shoulders: ["front-deltoids", "back-deltoids"],
  arms: ["biceps", "triceps", "forearm"],
  core: ["abs", "obliques"],
  legs: ["quadriceps", "hamstring", "calves", "gluteal"],
  back: ["upper-back", "lower-back", "trapezius"],
};

export function mapMuscleToLibrary(muscleGroup: string): LibraryMuscle[] {
  const key = muscleGroup.toLowerCase().trim().replace(/\s+/g, " ");
  const hit = MUSCLE_TO_LIBRARY[key];
  return hit ? [...hit] : [];
}

function tokensToLibraryMuscles(
  muscle_group: string | null | undefined,
  secondary_muscles: string[] | string | null | undefined
): LibraryMuscle[] {
  const out = new Set<LibraryMuscle>();
  const tokens = [
    ...muscleFieldToTokens(muscle_group ?? null),
    ...normalizeSecondaryMuscles(secondary_muscles),
  ];
  for (const raw of tokens) {
    const libs = mapMuscleToLibrary(raw);
    if (libs.length) {
      libs.forEach((l) => out.add(l));
      continue;
    }
    const bucket = mapMuscleToBucket(raw);
    if (bucket !== "other") {
      BUCKET_TO_LIBRARY[bucket].forEach((l) => out.add(l));
    }
  }
  return [...out];
}

function calendarDaysBetween(last: Date, today: Date): number {
  const a = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** نسبة استشفاء معتمدة على الأيام منذ آخر تمرين (0–100). */
export function recoveryPercentFromDaysSinceTraining(days: number | null): number {
  if (days == null) return 100;
  return Math.min(100, Math.round((days / 5) * 100));
}

/** منهجية Fitbod: تدرّج الحالة حسب أيام التقويم منذ آخر جلسة. */
export function fitbodStateFromDaysSinceTraining(days: number | null): MuscleRecoveryVisualState {
  if (days == null) return "fresh";
  if (days <= 0) return "very_fatigued";
  if (days === 1) return "fatigued";
  if (days === 2) return "training_today";
  if (days === 3 || days === 4) return "recovered";
  return "fresh";
}

/** @deprecated استخدم fitbodStateFromDaysSinceTraining */
export function fitbodStateForMuscle(
  _muscle: MuscleGroupId,
  lastSessionDate: Date | undefined,
  today: Date,
  _inTodayWorkout: boolean
): MuscleRecoveryVisualState {
  if (!lastSessionDate) return "fresh";
  const days = calendarDaysBetween(lastSessionDate, today);
  return fitbodStateFromDaysSinceTraining(days);
}

export type MuscleHeatmapRecoveryBundle = {
  /** استشفاء لكل عضلة مكتبة (المُدرَّبة فقط؛ غير الموجودة = مرتاح افتراضياً). */
  recoveryByLibraryMuscle: Partial<Record<LibraryMuscle, MuscleRecoveryData>>;
  recoveryByMuscle: Record<MuscleGroupId, MuscleRecoveryVisualState>;
  lastTrainedDaysAgo: Partial<Record<MuscleGroupId, number | null>>;
  recentExerciseNamesArByMuscle: Record<MuscleGroupId, string[]>;
  todayYmd: string;
};

/**
 * سلسلة الربط (مؤكدة من `types.ts`: `workout_session_exercises_exercise_id_fkey` → `program_exercises.id`):
 * **B)** `wse.exercise_id` = `program_exercises.id` → `exercise_library_id` → `exercise_library`.
 * **C)** ربط `exercise_library.id = wse.exercise_id` غير صحيح مع المخطط الحالي.
 *
 * تحقق SQL (شغّل في Supabase → SQL Editor):
 * ```sql
 * SELECT DISTINCT muscle_group FROM exercise_library WHERE muscle_group IS NOT NULL ORDER BY muscle_group;
 *
 * SELECT wse.id, wse.exercise_id, pe.exercise_library_id, el.name, el.muscle_group
 * FROM workout_session_exercises wse
 * LEFT JOIN program_exercises pe ON pe.id = wse.exercise_id
 * LEFT JOIN exercise_library el ON el.id = pe.exercise_library_id
 * LIMIT 10;
 * ```
 */
export async function fetchMuscleHeatmapRecovery(clientId: string): Promise<MuscleHeatmapRecoveryBundle> {
  const today = new Date();
  const todayYmd = toYmd(today);

  const { data: sessions, error: sErr } = await supabase
    .from("workout_sessions")
    .select("id, started_at, completed_at")
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: false });

  if (sErr) throw sErr;

  const sessionList = sessions ?? [];
  const sessionIds = sessionList.map((s) => s.id);

  const lastDateByLibraryMuscle: Partial<Record<LibraryMuscle, Date>> = {};

  const emptyBundle = (): MuscleHeatmapRecoveryBundle => {
    const recoveryByMuscle = Object.fromEntries(BUCKETS.map((m) => [m, "fresh" as const])) as Record<
      MuscleGroupId,
      MuscleRecoveryVisualState
    >;
    return {
      recoveryByLibraryMuscle: {},
      recoveryByMuscle,
      lastTrainedDaysAgo: {},
      recentExerciseNamesArByMuscle: Object.fromEntries(BUCKETS.map((m) => [m, []])) as Record<
        MuscleGroupId,
        string[]
      >,
      todayYmd,
    };
  };

  if (sessionIds.length === 0) {
    return emptyBundle();
  }

  const wseRows: any[] = [];
  const chunk = 150;
  for (let i = 0; i < sessionIds.length; i += chunk) {
    const part = sessionIds.slice(i, i + chunk);
    const { data: wse, error: wErr } = await supabase
      .from("workout_session_exercises")
      .select("id, session_id, exercise_id, completed_at")
      .in("session_id", part);
    if (wErr) throw wErr;
    wseRows.push(...(wse ?? []));
  }

  const sessionById = new Map(sessionList.map((s) => [s.id, s]));
  const exerciseIds = [...new Set(wseRows.map((r) => r.exercise_id))];

  const peMap = new Map<string, { exercise_library_id: string | null }>();
  if (exerciseIds.length > 0) {
    const { data: pes, error: pErr } = await supabase
      .from("program_exercises")
      .select("id, exercise_library_id")
      .in("id", exerciseIds);
    if (pErr) throw pErr;
    (pes ?? []).forEach((p: any) => {
      peMap.set(p.id, { exercise_library_id: p.exercise_library_id });
    });
  }

  const libIds = [...new Set([...peMap.values()].map((v) => v.exercise_library_id).filter(Boolean))] as string[];
  type LibRow = { id: string; muscle_group: string; name_ar: string; secondary_muscles: string[] | null };
  const libInfoById = new Map<string, LibRow>();
  if (libIds.length > 0) {
    const { data: libs, error: lErr } = await supabase
      .from("exercise_library")
      .select("id, muscle_group, name_ar, secondary_muscles")
      .in("id", libIds);
    if (lErr) throw lErr;
    (libs ?? []).forEach((row: LibRow) => {
      libInfoById.set(row.id, row);
    });
  }

  for (const row of wseRows) {
    const pe = peMap.get(row.exercise_id);
    const libId = pe?.exercise_library_id;
    const info = libId ? libInfoById.get(libId) : undefined;
    const libs = info ? tokensToLibraryMuscles(info.muscle_group, info.secondary_muscles) : [];

    const sess = sessionById.get(row.session_id);
    if (!sess?.completed_at) continue;
    const sessionDay = new Date(sess.completed_at);

    for (const lib of libs) {
      const prev = lastDateByLibraryMuscle[lib];
      if (!prev || sessionDay > prev) {
        lastDateByLibraryMuscle[lib] = sessionDay;
      }
    }
  }

  const recoveryByLibraryMuscle: Partial<Record<LibraryMuscle, MuscleRecoveryData>> = {};
  for (const lib of Object.keys(lastDateByLibraryMuscle) as LibraryMuscle[]) {
    const last = lastDateByLibraryMuscle[lib];
    if (!last) continue;
    const days = calendarDaysBetween(last, today);
    const lastTrainedDaysAgo = days;
    const state = fitbodStateFromDaysSinceTraining(days);
    const recoveryPercent = recoveryPercentFromDaysSinceTraining(days);
    recoveryByLibraryMuscle[lib] = {
      recoveryPercent,
      lastTrainedDaysAgo,
      state,
    };
  }

  const recoveryByMuscle = {} as Record<MuscleGroupId, MuscleRecoveryVisualState>;
  const lastTrainedDaysAgo: Partial<Record<MuscleGroupId, number | null>> = {};

  for (const m of BUCKETS) {
    const libs = GROUP_TO_LIBRARY_MUSCLES[m];
    let aggState: MuscleRecoveryVisualState = "fresh";
    let minDays: number | null = null;

    for (const lib of libs) {
      const d = recoveryByLibraryMuscle[lib];
      if (d) {
        aggState = moreFatigued(aggState, d.state);
        if (d.lastTrainedDaysAgo != null) {
          minDays = minDays == null ? d.lastTrainedDaysAgo : Math.min(minDays, d.lastTrainedDaysAgo);
        }
      }
    }

    recoveryByMuscle[m] = aggState;
    lastTrainedDaysAgo[m] = minDays;
  }

  const recentExerciseNamesArByMuscle = {} as Record<MuscleGroupId, string[]>;
  for (const m of BUCKETS) {
    recentExerciseNamesArByMuscle[m] = [];
  }

  const libToGroup = (lib: LibraryMuscle): MuscleGroupId | null => {
    for (const m of BUCKETS) {
      if (GROUP_TO_LIBRARY_MUSCLES[m].includes(lib)) return m;
    }
    return null;
  };

  const sortedSessions = [...sessionList]
    .filter((s) => s.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  const maxNamesPerMuscle = 5;
  for (const s of sortedSessions) {
    const rows = wseRows.filter((r) => r.session_id === s.id);
    for (const row of rows) {
      const pe = peMap.get(row.exercise_id);
      const libId = pe?.exercise_library_id;
      if (!libId) continue;
      const info = libInfoById.get(libId);
      if (!info?.name_ar) continue;
      const libs = tokensToLibraryMuscles(info.muscle_group, info.secondary_muscles);
      const name = info.name_ar.trim();
      const groupsHit = new Set<MuscleGroupId>();
      for (const lib of libs) {
        const g = libToGroup(lib);
        if (g) groupsHit.add(g);
      }
      for (const muscle of groupsHit) {
        const list = recentExerciseNamesArByMuscle[muscle];
        if (list.length >= maxNamesPerMuscle) continue;
        if (name && !list.includes(name)) list.push(name);
      }
    }
  }

  return { recoveryByLibraryMuscle, recoveryByMuscle, lastTrainedDaysAgo, recentExerciseNamesArByMuscle, todayYmd };
}

export const FITBOD_STATE_LABELS_AR: Record<MuscleRecoveryVisualState, string> = {
  fresh: "مرتاح",
  recovered: "جاهز",
  training_today: "تدريب اليوم",
  fatigued: "متعب",
  very_fatigued: "مجهد",
};

export const FITBOD_STATE_STYLES: Record<
  MuscleRecoveryVisualState,
  { fill: string; stroke: string; useGlow: boolean }
> = {
  fresh: { fill: "#1A1A1A", stroke: "rgba(255,255,255,0.08)", useGlow: false },
  recovered: { fill: "#2D4A30", stroke: "rgba(79,111,82,0.3)", useGlow: false },
  training_today: { fill: "#4F6F52", stroke: "rgba(79,111,82,0.6)", useGlow: true },
  fatigued: { fill: "#8B4513", stroke: "rgba(139,69,19,0.5)", useGlow: false },
  very_fatigued: { fill: "#B22222", stroke: "rgba(178,34,34,0.5)", useGlow: false },
};
