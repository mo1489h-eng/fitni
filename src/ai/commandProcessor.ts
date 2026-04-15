import type { AIAction, CommandContext, ProcessResult } from "./types";

const CARDIO_RE = /كارديو|كاردايو|كارد|كاربو|ركض|دراج|تمرين قلب|cardio/i;
const LEG_RE = /رجل|أرجل|ساق|فخذ|ورك|سمانة|عضلة|quad|leg|leg press|سكوات|squat|لانج|lunge/i;

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** 1-based index from "الثالث", "الخامس", "3" */
function parseOrdinalIndex(text: string, max: number): number | null {
  const n = text.match(/\b(\d+)\b/);
  if (n) {
    const v = parseInt(n[1]!, 10);
    if (v >= 1 && v <= max) return v - 1;
  }
  const arabic: [RegExp, number][] = [
    [/الأول|الاول| الأولى|first/, 0],
    [/الثاني|ثان/, 1],
    [/الثالث|ثالث/, 2],
    [/الرابع|رابع/, 3],
    [/الخامس|خامس/, 4],
    [/السادس|سادس/, 5],
  ];
  for (const [re, idx] of arabic) {
    if (re.test(text) && idx < max) return idx;
  }
  return null;
}

/**
 * Rule-based intent → structured actions (no external LLM). Works with Arabic coaching phrases.
 */
export function processAICommand(input: string, context: CommandContext): ProcessResult {
  const t = normalize(input);
  const actions: AIAction[] = [];
  const lines: string[] = [];
  const ex = context.exercises;

  if (!ex.length) {
    return { actions: [], summary: "" };
  }

  // --- Delete exercise N ---
  if (/(احذف|حذف|شيل|remove|delete)/i.test(t) && /(تمرين|حركة)/i.test(t)) {
    const idx = parseOrdinalIndex(t, ex.length);
    if (idx != null) {
      const target = ex[idx];
      if (target) {
        actions.push({ type: "delete_program_exercise", payload: { id: target.id } });
        lines.push(`حذف التمرين: ${target.name}`);
      }
    }
  }

  // --- Reduce cardio / lighten cardio section ---
  if (
    (CARDIO_RE.test(t) || /خفف|قلل|أخف|أقل|أخفض|خفّض|lighten|reduce/i.test(t)) &&
    (CARDIO_RE.test(t) || /شدة|كارديو|كاردايو|كارد|كاربو|ركض|قلب/i.test(t))
  ) {
    actions.push({
      type: "bulk_adjust_rest",
      payload: { dayId: context.primaryDayId, factor: 0.85, onlyWarmupOrCardio: true },
    });
    lines.push("تقليل راحة/شدة للكارديو والإحماء");
  }

  // --- More leg work ---
  if (LEG_RE.test(t) && /(زود|زيد|أكثر|زيادة|more|add)/i.test(t)) {
    const legEx = ex.filter((e) => LEG_RE.test(e.name));
    const targets = legEx.length ? legEx : ex.slice(0, 2);
    for (const e of targets.slice(0, 2)) {
      actions.push({ type: "add_set_to_exercise", payload: { exerciseId: e.id, delta: 1 } });
    }
    lines.push("زيادة مجموعة لتمارين الأرجل");
  }

  // --- More exercises (general) ---
  if (/(زود|زيد|أكثر|زيادة).*(تمارين|تمريين)/i.test(t) || /^زود التمارين$/i.test(t)) {
    const mid = Math.min(ex.length - 1, Math.max(1, Math.floor(ex.length / 2)));
    const e = ex[mid];
    if (e) {
      actions.push({ type: "add_set_to_exercise", payload: { exerciseId: e.id, delta: 1 } });
      lines.push(`زيادة مجموعة لتمرين: ${e.name}`);
    }
  }

  // --- Reduce intensity (lighter weights) ---
  if (/(خفف|خفّض|قلل|أخف|أقل).*(شدة|وزن|weights)/i.test(t) || /^خفف الشدة$/i.test(t)) {
    actions.push({
      type: "bulk_adjust_weight",
      payload: { dayId: context.primaryDayId, factor: 0.9 },
    });
    lines.push("تخفيض الأوزان ~10%");
  }

  // --- Change exercises (swap intensity) — adjust reps down + rest up slightly ---
  if (/(غير|change|بدّل).*(تمارين|التمارين)/i.test(t) || /^غير التمارين$/i.test(t)) {
    actions.push({
      type: "bulk_adjust_rest",
      payload: { dayId: context.primaryDayId, factor: 1.1, onlyWarmupOrCardio: false },
    });
    lines.push("تعديل تمريني: زيادة راحة قصيرة بين المجموعات");
  }

  // --- Program edit: reduce cardio + more legs (combined example) ---
  if (
    /(عدل|عدّل|عدّلي|تعديل).*(برنامج)/i.test(t) &&
    CARDIO_RE.test(t) &&
    LEG_RE.test(t) &&
    /(زود|زيد|أكثر)/i.test(t)
  ) {
    if (!actions.some((a) => a.type === "bulk_adjust_rest")) {
      actions.push({
        type: "bulk_adjust_rest",
        payload: { dayId: context.primaryDayId, factor: 0.85, onlyWarmupOrCardio: true },
      });
    }
    const legEx = ex.filter((e) => LEG_RE.test(e.name));
    const targets = legEx.length ? legEx.slice(0, 2) : ex.slice(0, 2);
    for (const e of targets) {
      if (!actions.some((a) => a.type === "add_set_to_exercise" && a.payload.exerciseId === e.id)) {
        actions.push({ type: "add_set_to_exercise", payload: { exerciseId: e.id, delta: 1 } });
      }
    }
    lines.push("تخفيف كارديو وزيادة حجم تمارين الأرجل");
  }

  const summary = lines.length ? lines.join(" · ") : "";
  return { actions: dedupeActions(actions), summary };
}

function dedupeActions(actions: AIAction[]): AIAction[] {
  const seen = new Set<string>();
  const out: AIAction[] = [];
  for (const a of actions) {
    const key = JSON.stringify(a);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}
