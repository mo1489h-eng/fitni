import type { WorkoutProgram } from "@/types/workout";

/**
 * Copilot (trainer → client program) prompts and profile checks live in the edge bundle:
 * `supabase/functions/_shared/copilotProgramGeneration.ts` (invoked from `copilot-generate`).
 *
 * This file only formats/refactors existing `WorkoutProgram` JSON for other LLM flows.
 */

/**
 * Serializes the program into readable text for LLM context (Arabic labels for coach UX).
 */
export function formatWorkoutProgramForPrompt(program: WorkoutProgram): string {
  const lines: string[] = [];
  lines.push(`العنوان: ${program.title}`);
  lines.push(`الوصف: ${program.description}`);
  lines.push(`عدد الأسابيع (ميتا): ${program.weeksCount}`);
  lines.push("");
  lines.push("الأيام:");

  for (const day of program.days) {
    lines.push(`- يوم [${day.type}] «${day.title}» (id: ${day.id})`);
    if (day.exercises.length === 0) {
      lines.push("  (لا تمارين)");
      continue;
    }
    for (const we of day.exercises) {
      lines.push(`  • ${we.exercise.name} (${we.exercise.muscleGroup} / ${we.exercise.equipment}) [instanceId: ${we.instanceId}]`);
      if (we.supersetId) lines.push(`    سوبرسيت: ${we.supersetId}`);
      we.sets.forEach((s, i) => {
        lines.push(
          `    مجموعة ${i + 1}: نوع=${s.type} وزن=${s.weight ?? "—"} تكرار=${s.reps ?? "—"} RPE=${s.rpe ?? "—"} راحة=${s.restTime ?? "—"}ث`,
        );
      });
      if (we.notes) lines.push(`    ملاحظات: ${we.notes}`);
    }
  }

  lines.push("");
  lines.push("JSON الكامل (مرجع للهيكل فقط):");
  lines.push(JSON.stringify(program, null, 2));

  return lines.join("\n");
}

const JSON_RESPONSE_RULES = `
You MUST respond with a single JSON object only — no markdown fences, no commentary before or after.
The JSON must validate against this exact TypeScript-shaped structure (field names and types must match):

{
  "id": string,
  "title": string,
  "description": string,
  "weeksCount": number (non-negative integer),
  "days": [
    {
      "id": string,
      "title": string,
      "type": "rest" | "workout" | "active-recovery",
      "exercises": [
        {
          "instanceId": string,
          "notes": string,
          "supersetId": string (optional),
          "exercise": {
            "id": string,
            "name": string,
            "videoUrl": string | null,
            "muscleGroup": "chest"|"back"|"shoulders"|"arms"|"legs"|"core"|"full-body"|"cardio"|"other",
            "equipment": "barbell"|"dumbbell"|"machine"|"cable"|"bodyweight"|"kettlebell"|"band"|"other"
          },
          "sets": [
            {
              "id": string,
              "type": "normal"|"warm-up"|"drop-set",
              "weight": number | null,
              "reps": number | null,
              "rpe": number | null,
              "rir": number | null,
              "restTime": number | null
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Preserve semantic consistency: every workout day of type "workout" should contain at least one exercise with at least one set unless the user explicitly asks for an empty day.
- Generate new unique string ids for "id", "instanceId", day "id", and set "id" when creating or restructuring content.
- Do not omit required fields. Use null only where the schema allows null.
`.trim();

/**
 * Builds the full user message to send to an LLM for refactoring / generating a program revision.
 */
export function buildWorkoutRefactorPrompt(
  currentProgram: WorkoutProgram,
  userInstruction: string,
): string {
  const body = formatWorkoutProgramForPrompt(currentProgram);
  return [
    "You are an expert strength and conditioning coach assistant for the CoachBase app.",
    "The coach works in Arabic; you may use Arabic for exercise names and titles when appropriate.",
    "",
    "### Coach instruction",
    userInstruction.trim(),
    "",
    "### Current program (read carefully)",
    body,
    "",
    "### Output contract",
    JSON_RESPONSE_RULES,
  ].join("\n");
}

/**
 * Tries to extract a JSON object from an LLM reply (handles optional ```json fences).
 */
export function extractJsonObjectFromLlmResponse(text: string): string | null {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (fence) return fence[1]?.trim() ?? null;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return null;
}
