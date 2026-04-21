import { useEffect } from "react";
import { useWorkoutStore } from "@/store/workout-store";
import { AnatomyEngine } from "@/components/recovery/AnatomyEngine";

type Props = { clientId: string | null | undefined };

/**
 * Mobile home integration wrapper for the Muscle Recovery Center.
 * The engine owns its own visual chrome (header, toggle, stage, HUD) and
 * is safe to mount without a `clientId` — it renders the neutral state.
 */
export default function MuscleRecoveryMap({ clientId }: Props) {
  useEffect(() => {
    if (!clientId) return;
    useWorkoutStore.getState().setActiveClientForFatigue(clientId);
    useWorkoutStore.getState().loadMuscleStateLocal(clientId);
  }, [clientId]);

  return <AnatomyEngine clientId={clientId ?? null} />;
}
