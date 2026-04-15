import { supabase } from "@/integrations/supabase/client";
import type { MuscleGroupId } from "@/lib/muscle-fatigue-engine";
import type { MuscleRecoveryState } from "@/lib/muscle-fatigue-engine";

export type UserMuscleStatusRow = {
  muscle_group: MuscleGroupId;
  initial_fatigue: number;
  total_recovery_hours: number;
  last_stimulus_at: string;
};

export async function fetchUserMuscleStatus(clientId: string): Promise<UserMuscleStatusRow[]> {
  const { data, error } = await supabase
    .from("user_muscle_status" as never)
    .select("muscle_group, initial_fatigue, total_recovery_hours, last_stimulus_at")
    .eq("client_id", clientId);
  if (error) throw error;
  return (data ?? []) as UserMuscleStatusRow[];
}

export function rowsToStateMap(rows: UserMuscleStatusRow[]): Partial<Record<MuscleGroupId, MuscleRecoveryState>> {
  const out: Partial<Record<MuscleGroupId, MuscleRecoveryState>> = {};
  for (const r of rows) {
    out[r.muscle_group] = {
      initialFatigue: r.initial_fatigue,
      totalRecoveryHours: r.total_recovery_hours,
      lastStimulusAt: r.last_stimulus_at,
    };
  }
  return out;
}

export async function upsertUserMuscleStatusBatch(
  clientId: string,
  entries: Array<{ muscle: MuscleGroupId; state: MuscleRecoveryState }>
): Promise<void> {
  if (!entries.length) return;
  const rows = entries.map((e) => ({
    client_id: clientId,
    muscle_group: e.muscle,
    initial_fatigue: e.state.initialFatigue,
    total_recovery_hours: e.state.totalRecoveryHours,
    last_stimulus_at: e.state.lastStimulusAt,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("user_muscle_status" as never).upsert(rows as never, {
    onConflict: "client_id,muscle_group",
  });
  if (error) throw error;
}
