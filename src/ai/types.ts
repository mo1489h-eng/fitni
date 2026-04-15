/**
 * CoachBase AI — structured actions executed against Supabase (programs / program_exercises).
 */
export type CommandContext = {
  trainerId: string;
  clientId: string;
  programId: string;
  programName: string;
  deliveryMode: "online" | "in_person";
  /** Primary editable day (first by day_order) */
  primaryDayId: string;
  primaryDayName: string;
  exercises: {
    id: string;
    dayId: string;
    name: string;
    sets: number;
    reps: number;
    weight: number;
    rest_seconds: number;
    exercise_order: number;
    is_warmup: boolean;
  }[];
};

export type AIAction =
  | { type: "update_program_exercise"; payload: { id: string; patch: Record<string, unknown> } }
  | { type: "delete_program_exercise"; payload: { id: string } }
  | { type: "bulk_adjust_rest"; payload: { dayId: string; factor: number; onlyWarmupOrCardio?: boolean } }
  | { type: "bulk_adjust_weight"; payload: { dayId: string; factor: number } }
  | { type: "add_set_to_exercise"; payload: { exerciseId: string; delta: number } };

export type ProcessResult = {
  actions: AIAction[];
  /** Arabic summary for UI */
  summary: string;
};

export type ExecuteResult = {
  ok: boolean;
  lines: string[];
  error?: string;
};
