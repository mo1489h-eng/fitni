export interface SetDetail {
  setNumber: number;
  weight: number;
  reps: number;
  tempo: string;
  rest: number;
}

export interface LocalExercise {
  id: string;
  name: string;
  name_en?: string;
  muscle: string;
  gifUrl?: string;
  exerciseDbId?: string;
  sets: number;
  reps: number;
  weight: number;
  video_url: string;
  rest_seconds: number;
  tempo: string;
  rpe: number | null;
  notes: string;
  supersetWith?: string;
  is_warmup: boolean;
  setDetails?: SetDetail[];
}

export interface LocalDay {
  dayName: string;
  isRest: boolean;
  exercises: LocalExercise[];
  warmup: LocalExercise[];
  label: string;
}

export interface ProgramMeta {
  name: string;
  goal: string;
  level: string;
  weeks: number;
  description: string;
  daysPerWeek: number;
}

export const GOALS = [
  { value: "تخسيس", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { value: "بناء عضلات", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "لياقة عامة", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "قوة", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "تأهيل", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
] as const;

export const LEVELS = [
  { value: "مبتدئ", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "متوسط", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "متقدم", color: "bg-red-500/10 text-red-400 border-red-500/20" },
] as const;

export const WEEK_DAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"] as const;

let _eid = 0;
export const genId = () => `ex_${Date.now()}_${_eid++}`;
