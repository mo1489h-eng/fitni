/** Local calendar date YYYY-MM-DD (avoid UTC drift vs session_date). */
export function localDateYMD(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const t = new Date(isoDate);
  if (Number.isNaN(t.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - t.getTime()) / 86400000);
}

/**
 * Share of clients (with an assigned program) who logged activity in the last `windowDays` days.
 */
export function adherencePercent(
  clients: { program_id: string | null; last_workout_date: string | null }[],
  windowDays = 7
): number {
  const withProgram = clients.filter((c) => c.program_id);
  if (!withProgram.length) return 0;
  let ok = 0;
  for (const c of withProgram) {
    const days = daysBetween(c.last_workout_date ?? undefined);
    if (days != null && days <= windowDays) ok++;
  }
  return Math.round((ok / withProgram.length) * 100);
}

/**
 * Composite 0–100 score: adherence + recent workout completion density.
 */
export function performanceScore(input: {
  adherencePct: number;
  completedWorkoutsLast14d: number;
  clientCount: number;
}): number {
  const { adherencePct, completedWorkoutsLast14d, clientCount } = input;
  const density = clientCount > 0 ? Math.min(100, (completedWorkoutsLast14d / Math.max(1, clientCount * 2)) * 50) : 0;
  return Math.round(Math.min(100, adherencePct * 0.65 + density));
}

export function gradeFromScore(score: number): "A" | "B" | "C" | "D" {
  if (score >= 85) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}
