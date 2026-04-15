import { supabase } from "@/integrations/supabase/client";
import { enqueueSessionLogRetry } from "@/lib/sessionLogRetryQueue";
import type { Database } from "@/integrations/supabase/types";

export type SessionLogRow = Database["public"]["Tables"]["session_logs"]["Row"];

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

/** Canonical timestamp for merge / last-write-wins (DB `updated_at`, fallback `created_at`). */
export function sessionLogSyncTs(row: { updated_at?: string | null; created_at: string }): string {
  return row.updated_at ?? row.created_at;
}

/**
 * Upserts one set row (last write wins on conflict). Sets `updated_by` from current auth user.
 * DB trigger mirrors into `workout_session_exercises` and maintains `updated_at`.
 */
export async function upsertSessionLogInternal(params: UpsertSessionLogParams): Promise<SessionLogRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
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
  return data;
}

/**
 * Same as {@link upsertSessionLogInternal}, but enqueues for retry when the network write fails.
 * Does not throw on failure — returns `{ status: 'queued' }` after enqueue.
 */
export async function upsertSessionLog(params: UpsertSessionLogParams): Promise<SessionLogUpsertResult> {
  try {
    const row = await upsertSessionLogInternal(params);
    return { status: "synced", row };
  } catch {
    enqueueSessionLogRetry(params);
    return { status: "queued" };
  }
}
