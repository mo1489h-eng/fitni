import { loadCommandContext } from "./loadCommandContext";
import { processAICommand } from "./commandProcessor";
import { executeAIActions } from "./actionExecutor";

/**
 * Runs CoachBase AI command pipeline for a trainer-scoped client when the message looks actionable.
 */
export async function runCoachBaseAICommands(
  trainerId: string,
  clientId: string | null | undefined,
  input: string
): Promise<{ executed: boolean; assistantNote: string }> {
  if (!clientId?.trim()) return { executed: false, assistantNote: "" };

  const ctx = await loadCommandContext(trainerId, clientId);
  if (!ctx) return { executed: false, assistantNote: "" };

  const { actions, summary } = processAICommand(input, ctx);
  if (!actions.length) return { executed: false, assistantNote: "" };

  const result = await executeAIActions(actions, ctx);
  if (!result.ok) {
    return {
      executed: false,
      assistantNote: `تعذّر تنفيذ التعديل: ${result.error ?? "خطأ"}`,
    };
  }

  const detail = result.lines.join(" · ");
  const note = summary
    ? `**CoachBase AI** · ${summary}${detail ? `\n${detail}` : ""}`
    : `**CoachBase AI** · ${detail || "تم التنفيذ"}`;

  return { executed: true, assistantNote: note };
}
