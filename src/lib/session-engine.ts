import { supabase } from "@/integrations/supabase/client";

const sessionStartLocks = new Map<string, Promise<string>>();

export async function startSession(params: {
  clientId: string;
  programDayId: string;
  trainerId: string | null;
}): Promise<{ id: string }> {
  const lockKey = `${params.clientId}:${params.programDayId}`;
  const existing = sessionStartLocks.get(lockKey);
  if (existing) {
    const id = await existing;
    return { id };
  }
  const p = (async () => {
    const { data: active } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("client_id", params.clientId)
      .eq("program_day_id", params.programDayId)
      .eq("is_active", true)
      .maybeSingle();
    if (active?.id) return active.id;

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        client_id: params.clientId,
        program_day_id: params.programDayId,
        trainer_id: params.trainerId,
        started_at: new Date().toISOString(),
        is_active: true,
        current_exercise_index: 0,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  })();
  sessionStartLocks.set(lockKey, p);
  try {
    const id = await p;
    return { id };
  } finally {
    sessionStartLocks.delete(lockKey);
  }
}

export async function finishSession(
  sessionId: string,
  totals: { duration_minutes: number; total_volume: number; total_sets: number },
): Promise<void> {
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      completed_at: new Date().toISOString(),
      duration_minutes: totals.duration_minutes,
      total_volume: totals.total_volume,
      total_sets: totals.total_sets,
      is_active: false,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export function validateSessionState(args: { sessionId: string | null; programDayId: string | null; planLength: number }): boolean {
  return !!args.sessionId && !!args.programDayId && args.planLength > 0;
}

/** Before creating a new workout_sessions row */
export function validateSessionStartArgs(args: { programDayId: string | null; planLength: number }): boolean {
  return !!args.programDayId && args.planLength > 0;
}
