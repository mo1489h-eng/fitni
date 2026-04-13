import type { Exercise, WorkoutProgram } from "@/types/workout";

const bench: Exercise = {
  id: "ex-bench",
  name: "ضغط بار مستوي",
  videoUrl: "https://example.com/videos/bench.mp4",
  muscleGroup: "chest",
  equipment: "barbell",
};

const row: Exercise = {
  id: "ex-row",
  name: "تجديف بار",
  videoUrl: null,
  muscleGroup: "back",
  equipment: "barbell",
};

export const exerciseLibrary: Exercise[] = [
  bench,
  row,
  {
    id: "ex-squat",
    name: "سكوات بار",
    videoUrl: null,
    muscleGroup: "legs",
    equipment: "barbell",
  },
  {
    id: "ex-ohp",
    name: "ضغط أكتاف",
    videoUrl: null,
    muscleGroup: "shoulders",
    equipment: "barbell",
  },
  {
    id: "ex-incline-db",
    name: "ضغط دامبل مائل",
    videoUrl: null,
    muscleGroup: "chest",
    equipment: "dumbbell",
  },
  {
    id: "ex-tricep-pushdown",
    name: "ثلاثي حبل",
    videoUrl: null,
    muscleGroup: "arms",
    equipment: "cable",
  },
  {
    id: "ex-cable-fly",
    name: "فلاي كابل",
    videoUrl: null,
    muscleGroup: "chest",
    equipment: "cable",
  },
  {
    id: "ex-lateral-raise",
    name: "رفعة جانبية",
    videoUrl: null,
    muscleGroup: "shoulders",
    equipment: "dumbbell",
  },
  {
    id: "ex-rdl",
    name: "ددلفت روماني",
    videoUrl: null,
    muscleGroup: "legs",
    equipment: "barbell",
  },
  {
    id: "ex-lat-pulldown",
    name: "سحب علوي",
    videoUrl: null,
    muscleGroup: "back",
    equipment: "cable",
  },
  {
    id: "ex-leg-curl",
    name: "فخذ خلفي",
    videoUrl: null,
    muscleGroup: "legs",
    equipment: "machine",
  },
  {
    id: "ex-bicep-curl",
    name: "بايسب دامبل",
    videoUrl: null,
    muscleGroup: "arms",
    equipment: "dumbbell",
  },
];

/** Single sample program for Phase 2 UI / schema validation. */
export const sampleHypertrophyProgram: WorkoutProgram = {
  id: "prog-sample-1",
  title: "برنامج ضخامة — أسبوع تجريبي",
  description: "تمرينان عليا سفلى، تمبوس ومجموعات متدرجة.",
  weeksCount: 4,
  days: [
    {
      id: "day-push",
      title: "دفع",
      type: "workout",
      exercises: [
        {
          instanceId: "we-bench-1",
          exercise: bench,
          notes: "احتفظ بقوام مستقر",
          sets: [
            {
              id: "s1",
              type: "warm-up",
              weight: 40,
              reps: 12,
              rpe: 6,
              rir: 4,
              restTime: 90,
            },
            {
              id: "s2",
              type: "normal",
              weight: 80,
              reps: 8,
              rpe: 8,
              rir: 2,
              restTime: 180,
            },
            {
              id: "s3",
              type: "drop-set",
              weight: 60,
              reps: 10,
              rpe: 9,
              rir: 1,
              restTime: 120,
            },
          ],
        },
      ],
    },
    {
      id: "day-pull",
      title: "سحب",
      type: "workout",
      exercises: [
        {
          instanceId: "we-row-1",
          exercise: row,
          notes: "",
          sets: [
            {
              id: "s4",
              type: "normal",
              weight: 70,
              reps: 10,
              rpe: 7,
              rir: 3,
              restTime: 150,
            },
          ],
        },
      ],
    },
    {
      id: "day-rest",
      title: "راحة",
      type: "rest",
      exercises: [],
    },
  ],
};
