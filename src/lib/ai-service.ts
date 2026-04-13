import { extractJsonObjectFromLlmResponse } from "@/lib/ai-prompt-builder";
import {
  formatWorkoutProgramZodError,
  workoutProgramSchema,
} from "@/lib/validations/workout";
import type { WorkoutProgram } from "@/types/workout";

const EMBEDDED_JSON_MARKER = "JSON الكامل (مرجع للهيكل فقط):";

/**
 * Pulls the JSON snapshot embedded by `formatWorkoutProgramForPrompt` inside a refactor prompt.
 * Used by the mock “Gemini” path; a real API would parse the model’s raw string instead.
 */
export function extractProgramFromRefactorPrompt(prompt: string): unknown {
  const idx = prompt.indexOf(EMBEDDED_JSON_MARKER);
  if (idx === -1) {
    throw new Error("الطلب لا يحتوي على لقطة JSON للبرنامج (marker مفقود).");
  }
  const after = prompt.slice(idx + EMBEDDED_JSON_MARKER.length).trim();
  const start = after.indexOf("{");
  const end = after.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("تعذر استخراج كائن JSON من الطلب.");
  }
  const jsonStr = after.slice(start, end + 1);
  return JSON.parse(jsonStr) as unknown;
}

const MOCK_DELAY_MS = 2000;

/**
 * Calls the AI refactor pipeline. Today this simulates Gemini with a fixed delay and a
 * deterministic revision derived from the embedded program JSON in `prompt`.
 * Replace the body with `fetch` to your Gemini endpoint; parse the reply with
 * `extractJsonObjectFromLlmResponse` then `workoutProgramSchema.safeParse`.
 */
export async function refactorProgramWithAI(prompt: string): Promise<WorkoutProgram> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

  const rawFromPrompt = extractProgramFromRefactorPrompt(prompt);

  // Mock “model output”: clone + visible title tweak (swap for real `responseText`).
  const draft = JSON.parse(JSON.stringify(rawFromPrompt)) as Record<string, unknown>;
  draft.title = `${String(draft.title ?? "")} · (معاينة AI)`;

  const parsed = workoutProgramSchema.safeParse(draft);
  if (!parsed.success) {
    throw new Error(
      `رد الذكاء الاصطناعي لا يطابق مخطط البرنامج: ${formatWorkoutProgramZodError(parsed.error)}`,
    );
  }

  return parsed.data;
}

/**
 * Parses a raw LLM string (optional ```json fences) and validates with Zod.
 * Use this when wiring a real Gemini response.
 */
export function parseAndValidateWorkoutProgramFromLlmText(text: string): WorkoutProgram {
  const extracted = extractJsonObjectFromLlmResponse(text);
  if (!extracted) {
    throw new Error("لم يُعثر على كائن JSON في رد النموذج.");
  }
  let data: unknown;
  try {
    data = JSON.parse(extracted);
  } catch {
    throw new Error("JSON المستخرج من الرد غير صالح.");
  }
  const parsed = workoutProgramSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`البرنامج المُعاد غير صالح: ${formatWorkoutProgramZodError(parsed.error)}`);
  }
  return parsed.data;
}
