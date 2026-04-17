import { supabase } from "@/integrations/supabase/client";
import { enqueueSessionLogRetry } from "@/lib/sessionLogRetryQueue";

/** Generic session log row shape (table may not exist yet in types). */
export type SessionLogRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  completed: boolean;
  created_at: string;
  updated_at?: string | null;
  updated_by?: string | null;
};

export type UpsertSessionLogParams = {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  completed?: boolean;
};

export type SessionLogUpsertResult =
  | { status: "synced"; row: SessionLogRow }
  | { status: "queued" };

/** Canonical timestamp for merge / last-write-wins. */
export function sessionLogSyncTs(row: { updated_at?: string | null; created_at: string }): string {
  return row.updated_at ?? row.created_at;
}

/**
 * Upserts one set row. Uses `as any` because session_logs may not be in generated types yet.
 */
export async function upsertSessionLogInternal(params: UpsertSessionLogParams): Promise<SessionLogRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("session_logs")
    .upsert(
      {
        session_id: params.sessionId,
        exercise_id: params.exerciseId,
        set_number: params.setNumber,
        reps: params.reps,
        weight: params.weight,
        completed: params.completed ?? true,
        updated_by: user?.id ?? null,
      },
      { onConflict: "session_id,exercise_id,set_number" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as SessionLogRow;
}

export async function upsertSessionLog(params: UpsertSessionLogParams): Promise<SessionLogUpsertResult> {
  try {
    const row = await upsertSessionLogInternal(params);
    return { status: "synced", row };
  } catch {
    enqueueSessionLogRetry(params);
    return { status: "queued" };
  }
}
