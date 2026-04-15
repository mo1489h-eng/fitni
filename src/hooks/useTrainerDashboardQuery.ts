import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  adherencePercent,
  gradeFromScore,
  localDateYMD,
  performanceScore,
} from "@/lib/trainerDashboardMetrics";

export type TrainerDashboardData = {
  clientCount: number;
  todaySessionCount: number;
  todaySessions: {
    id: string;
    session_date: string;
    start_time: string;
    session_type: string;
    is_completed: boolean;
    clientName: string;
  }[];
  adherencePct: number;
  performanceGrade: "A" | "B" | "C" | "D";
  performanceScore: number;
};

async function fetchDashboard(trainerId: string): Promise<TrainerDashboardData> {
  const today = localDateYMD();
  const fourteenAgo = new Date();
  fourteenAgo.setDate(fourteenAgo.getDate() - 14);
  const fourteenIso = fourteenAgo.toISOString();

  const { data: clients, error: cErr } = await supabase
    .from("clients")
    .select("id, program_id, last_workout_date")
    .eq("trainer_id", trainerId);
  if (cErr) throw cErr;
  const list = clients ?? [];

  const { data: sessions, error: sErr } = await supabase
    .from("trainer_sessions")
    .select("id, session_date, start_time, session_type, is_completed, client_id, clients(name)")
    .eq("trainer_id", trainerId)
    .eq("session_date", today)
    .order("start_time", { ascending: true });
  if (sErr) throw sErr;

  const clientIds = list.map((c) => c.id);
  let completedLast14 = 0;
  if (clientIds.length) {
    const { count, error: wErr } = await supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .in("client_id", clientIds)
      .not("completed_at", "is", null)
      .gte("completed_at", fourteenIso);
    if (wErr) throw wErr;
    completedLast14 = count ?? 0;
  }

  const adherencePct = adherencePercent(list, 7);
  const score = performanceScore({
    adherencePct,
    completedWorkoutsLast14d: completedLast14,
    clientCount: list.length,
  });

  const todaySessions = (sessions ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    session_date: row.session_date as string,
    start_time: row.start_time as string,
    session_type: row.session_type as string,
    is_completed: row.is_completed as boolean,
    clientName: (row.clients as { name?: string } | null)?.name ?? "عميل",
  }));

  return {
    clientCount: list.length,
    todaySessionCount: todaySessions.length,
    todaySessions,
    adherencePct,
    performanceGrade: gradeFromScore(score),
    performanceScore: score,
  };
}

/**
 * Dashboard metrics + Supabase Realtime invalidation for trainer-scoped rows.
 */
export function useTrainerDashboardQuery(trainerId: string | undefined) {
  const qc = useQueryClient();
  const key = ["trainer-dashboard", trainerId] as const;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchDashboard(trainerId!),
    enabled: !!trainerId,
    staleTime: 30_000,
    refetchInterval: 45_000,
  });

  useEffect(() => {
    if (!trainerId) return;
    let cancelled = false;

    (async () => {
      const ch = supabase.channel(`trainer-dash-${trainerId}`);
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients", filter: `trainer_id=eq.${trainerId}` },
        () => void qc.invalidateQueries({ queryKey: key })
      );
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trainer_sessions", filter: `trainer_id=eq.${trainerId}` },
        () => void qc.invalidateQueries({ queryKey: key })
      );

      const { data: idRows } = await supabase.from("clients").select("id").eq("trainer_id", trainerId);
      if (cancelled) return;
      for (const row of (idRows ?? []).slice(0, 48)) {
        ch.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workout_sessions",
            filter: `client_id=eq.${row.id}`,
          },
          () => void qc.invalidateQueries({ queryKey: key })
        );
      }

      await ch.subscribe();
      channelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      const c = channelRef.current;
      channelRef.current = null;
      if (c) void supabase.removeChannel(c);
    };
  }, [trainerId, qc, key]);

  return query;
}
