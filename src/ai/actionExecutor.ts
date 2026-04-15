import { supabase } from "@/integrations/supabase/client";
import type { AIAction, CommandContext, ExecuteResult } from "./types";

const CARDIO_NAME = /كارديو|كاردايو|كارد|ركض|دراج|تمرين قلب|cardio|jump|jumping|burpee/i;

export async function executeAIActions(
  actions: AIAction[],
  ctx: CommandContext
): Promise<ExecuteResult> {
  if (!actions.length) return { ok: true, lines: [] };
  const lines: string[] = [];

  for (const action of actions) {
    const r = await runOne(action, ctx);
    if (r.error) return { ok: false, lines, error: r.error };
    if (r.line) lines.push(r.line);
  }

  return { ok: true, lines };
}

async function runOne(
  action: AIAction,
  ctx: CommandContext
): Promise<{ line?: string; error?: string }> {
  switch (action.type) {
    case "update_program_exercise": {
      const { error } = await supabase
        .from("program_exercises")
        .update(action.payload.patch)
        .eq("id", action.payload.id);
      if (error) return { error: error.message };
      return { line: "تم تحديث التمرين" };
    }
    case "delete_program_exercise": {
      const { error } = await supabase.from("program_exercises").delete().eq("id", action.payload.id);
      if (error) return { error: error.message };
      return { line: "تم حذف التمرين" };
    }
    case "bulk_adjust_rest": {
      const { dayId, factor, onlyWarmupOrCardio } = action.payload;
      const targets = ctx.exercises.filter((e) => e.dayId === dayId);
      for (const e of targets) {
        const match =
          onlyWarmupOrCardio === true
            ? e.is_warmup || CARDIO_NAME.test(e.name)
            : true;
        if (!match) continue;
        const next = Math.max(15, Math.round(e.rest_seconds * factor));
        const { error } = await supabase
          .from("program_exercises")
          .update({ rest_seconds: next })
          .eq("id", e.id);
        if (error) return { error: error.message };
      }
      return { line: "تم تعديل أوقات الراحة" };
    }
    case "bulk_adjust_weight": {
      const { dayId, factor } = action.payload;
      const targets = ctx.exercises.filter((e) => e.dayId === dayId);
      for (const e of targets) {
        const next = Math.max(0, Math.round(e.weight * factor));
        const { error } = await supabase
          .from("program_exercises")
          .update({ weight: next })
          .eq("id", e.id);
        if (error) return { error: error.message };
      }
      return { line: "تم تعديل الأوزان" };
    }
    case "add_set_to_exercise": {
      const ex = ctx.exercises.find((e) => e.id === action.payload.exerciseId);
      if (!ex) return { error: "تمرين غير موجود" };
      const next = Math.max(1, ex.sets + action.payload.delta);
      const { error } = await supabase
        .from("program_exercises")
        .update({ sets: next })
        .eq("id", ex.id);
      if (error) return { error: error.message };
      return { line: `مجموعات ${ex.name}: ${next}` };
    }
    default:
      return {};
  }
}
