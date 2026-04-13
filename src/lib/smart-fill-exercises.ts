import type { Exercise } from "@/types/workout";
import type { TrainingGoal } from "@/lib/workout-builder-utils";

/** Stable five-exercise picks per goal (mock). IDs must exist in `exerciseLibrary`. */
const HYPERTROPHY_IDS = [
  "ex-bench",
  "ex-incline-db",
  "ex-tricep-pushdown",
  "ex-cable-fly",
  "ex-lateral-raise",
];

const STRENGTH_IDS = [
  "ex-bench",
  "ex-row",
  "ex-squat",
  "ex-ohp",
  "ex-rdl",
];

export function pickFiveForSmartFill(
  library: Exercise[],
  goal: TrainingGoal,
): Exercise[] {
  const ids = goal === "strength" ? STRENGTH_IDS : HYPERTROPHY_IDS;
  const map = new Map(library.map((e) => [e.id, e]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Exercise[];
}
