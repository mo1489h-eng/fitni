import type { SyntheticEvent } from "react";
import type { MuscleGroupId } from "@/store/workout-store";
import type { MuscleRecoveryVisualState } from "@/lib/muscleHeatmapRecovery";

/** Alias for heatmap props (matches Fitbod-style recovery states). */
export type FitbodState = MuscleRecoveryVisualState;

export type MuscleHeatmapProps = {
  muscleStates: Record<MuscleGroupId, FitbodState>;
  onMuscleTap: (muscleId: MuscleGroupId, event?: SyntheticEvent) => void;
  view: "front" | "back";
};
