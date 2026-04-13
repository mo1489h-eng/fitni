import { supabase } from "@/integrations/supabase/client";
import { extractJsonObjectFromLlmResponse } from "@/lib/ai-prompt-builder";
import {
  formatWorkoutProgramZodError,
  workoutProgramSchema,
} from "@/lib/validations/workout";
import type { WorkoutProgram } from "@/types/workout";

const EMBEDDED_JSON_MARKER = "JSON الكامل (مرجع للهيكل فقط):";

/**
 * Pulls the JSON snapshot embedded by `formatWorkoutProgramForPrompt` inside a refactor prompt.
 * Useful for debugging or tests; the live path uses the edge function + Zod.
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

type CopilotWorkoutResponse = {
  reply?: string;
  error?: string;
};

/**
 * Sends the full refactor prompt through Supabase Edge (`ai-copilot`) with server-side Gemini + JSON mode.
 */
export async function refactorProgramWithAI(prompt: string): Promise<WorkoutProgram> {
  let data: CopilotWorkoutResponse | null = null;
  try {
    const { data: resData, error } = await supabase.functions.invoke<CopilotWorkoutResponse>("ai-copilot", {
      body: { role: "trainer", message: prompt, context: "workout_builder" },
    });
    if (error) {
      throw new Error(`فشل الاتصال بخدمة مساعد التمارين: ${error.message}`);
    }
    data = resData ?? null;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`فشل الاتصال بخدمة مساعد التمارين: ${msg}`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const text = typeof data?.reply === "string" ? data.reply.trim() : "";
  if (!text) {
    throw new Error("رد Gemini فارغ.");
  }

  return parseAndValidateWorkoutProgramFromLlmText(text);
}

/**
 * Parses a raw LLM string (optional ```json fences) and validates with Zod.
 */
export function parseAndValidateWorkoutProgramFromLlmText(text: string): WorkoutProgram {
  const extracted = extractJsonObjectFromLlmResponse(text);
  if (!extracted) {
    throw new Error("لم يُعثر على كائن JSON في رد النموذج.");
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extracted);
  } catch {
    throw new Error("JSON المستخرج من الرد غير صالح.");
  }
  const parsed = workoutProgramSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(`البرنامج المُعاد غير صالح: ${formatWorkoutProgramZodError(parsed.error)}`);
  }
  return parsed.data;
}
