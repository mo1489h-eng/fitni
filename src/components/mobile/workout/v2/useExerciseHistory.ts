import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PrevBestRow = {
  actualWeight: number;
  actualReps: number;
  loggedAt: string;
};

/** Latest logged set + best-ever weight for one (client, exercise). */
export function useExerciseHistory(clientId: string, exerciseId: string | null | undefined) {
  return useQuery({
    queryKey: ["exercise-history", clientId, exerciseId],
    enabled: !!clientId && !!exerciseId,
    staleTime: 30_000,
    queryFn: async (): Promise<{ latest: PrevBestRow | null; bestWeight: number }> => {
      if (!exerciseId) return { latest: null, bestWeight: 0 };

      const latestQ = supabase
        .from("workout_logs")
        .select("actual_weight, actual_reps, logged_at")
        .eq("client_id", clientId)
        .eq("exercise_id", exerciseId)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const bestQ = supabase
        .from("workout_logs")
        .select("actual_weight")
        .eq("client_id", clientId)
        .eq("exercise_id", exerciseId)
        .not("actual_weight", "is", null)
        .order("actual_weight", { ascending: false })
        .limit(1)
        .maybeSingle();

      const [latestRes, bestRes] = await Promise.all([latestQ, bestQ]);

      const latest: PrevBestRow | null =
        latestRes.data && latestRes.data.actual_weight != null
          ? {
              actualWeight: Number(latestRes.data.actual_weight) || 0,
              actualReps: Number(latestRes.data.actual_reps) || 0,
              loggedAt: latestRes.data.logged_at,
            }
          : null;
      const bestWeight = bestRes.data?.actual_weight != null ? Number(bestRes.data.actual_weight) : 0;
      return { latest, bestWeight };
    },
  });
}
