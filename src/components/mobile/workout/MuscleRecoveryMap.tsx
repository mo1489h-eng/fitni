import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkoutStore } from "@/store/workout-store";
import { fetchUserMuscleStatus, rowsToStateMap } from "@/lib/user-muscle-status";
import { AdvancedMuscleHeatmapConnected } from "./AdvancedMuscleHeatmap";
import { ELITE } from "./designTokens";

type Props = { clientId: string | null | undefined };

/**
 * Client home muscle command center: hydrates from Supabase + local cache, live linear recovery from Zustand.
 */
export default function MuscleRecoveryMap({ clientId }: Props) {
  useEffect(() => {
    if (!clientId) return;
    useWorkoutStore.getState().setActiveClientForFatigue(clientId);
    useWorkoutStore.getState().loadMuscleStateLocal(clientId);
  }, [clientId]);

  const { isLoading, isError } = useQuery({
    queryKey: ["user-muscle-status", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const rows = await fetchUserMuscleStatus(clientId);
      useWorkoutStore.getState().hydrateMuscleState(clientId, rowsToStateMap(rows));
      useWorkoutStore.getState().persistMuscleStateLocal(clientId);
      return rows;
    },
    enabled: !!clientId,
  });

  if (!clientId) return null;

  if (isLoading) {
    return (
      <div
        className="animate-pulse rounded-[20px] p-6"
        style={{ background: ELITE.cardBg, border: ELITE.border, boxShadow: ELITE.innerShadow }}
      >
        <div className="mx-auto mb-4 h-64 max-w-[220px] rounded-2xl" style={{ background: "#161616" }} />
        <div className="h-3 w-2/3 rounded-lg" style={{ background: "#161616" }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-[20px] p-4"
      style={{ background: ELITE.cardBg, border: ELITE.border, boxShadow: ELITE.innerShadow }}
    >
      <p className="mb-1 text-base font-bold" style={{ color: ELITE.textPrimary }}>
        مركز استشفاء العضلات
      </p>
      <p className="mb-4 text-[12px] leading-relaxed" style={{ color: ELITE.textSecondary }}>
        إجهاد لحظي بعد كل مجموعة — يتحول من لحمي طازج إلى أصفر ثم برتقالي وأحمر عميق. اضغط عضلة للتفاصيل.
      </p>
      {isError && (
        <p className="mb-3 text-[11px] text-amber-400/90">تعذّر مزامنة السحابة — يُعرض التخزين المحلي.</p>
      )}
      <AdvancedMuscleHeatmapConnected />
    </div>
  );
}
