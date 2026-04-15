import { supabase } from "@/integrations/supabase/client";
import type { CommandContext } from "./types";

type DayRow = {
  id: string;
  day_name: string;
  day_order: number;
  program_exercises: {
    id: string;
    name: string;
    sets: number;
    reps: number;
    weight: number;
    rest_seconds: number;
    exercise_order: number;
    is_warmup: boolean;
    day_id: string;
  }[] | null;
};

/**
 * Loads the client's assigned program and flattens exercises for command parsing (trainer-scoped).
 */
export async function loadCommandContext(
  trainerId: string,
  clientId: string
): Promise<CommandContext | null> {
  const { data: client, error: cErr } = await supabase
    .from("clients")
    .select("id, program_id")
    .eq("id", clientId)
    .eq("trainer_id", trainerId)
    .maybeSingle();
  if (cErr || !client?.program_id) return null;

  const { data: program, error: pErr } = await supabase
    .from("programs")
    .select(
      `
      id,
      name,
      delivery_mode,
      program_days (
        id,
        day_name,
        day_order,
        program_exercises (
          id,
          day_id,
          name,
          sets,
          reps,
          weight,
          rest_seconds,
          exercise_order,
          is_warmup
        )
      )
    `
    )
    .eq("id", client.program_id)
    .eq("trainer_id", trainerId)
    .maybeSingle();

  if (pErr || !program) return null;

  const days = ((program as { program_days?: DayRow[] | null }).program_days ?? []).slice().sort(
    (a, b) => a.day_order - b.day_order
  );
  if (!days.length) return null;

  const primary = days[0]!;
  const ex = (primary.program_exercises ?? [])
    .slice()
    .sort((a, b) => a.exercise_order - b.exercise_order)
    .map((e) => ({
      id: e.id,
      dayId: e.day_id,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight,
      rest_seconds: e.rest_seconds ?? 60,
      exercise_order: e.exercise_order,
      is_warmup: e.is_warmup,
    }));

  const dm = (program as { delivery_mode?: string }).delivery_mode;
  const deliveryMode: "online" | "in_person" = dm === "in_person" ? "in_person" : "online";

  return {
    trainerId,
    clientId,
    programId: program.id,
    programName: (program as { name: string }).name,
    deliveryMode,
    primaryDayId: primary.id,
    primaryDayName: primary.day_name,
    exercises: ex,
  };
}
