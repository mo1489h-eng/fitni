import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Invalidates program-related queries when `program_exercises` rows change for the given program.
 */
export function useProgramRealtimeSync(programId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!programId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: days } = await supabase.from("program_days").select("id").eq("program_id", programId);
      if (cancelled || !days?.length) return;

      const ch = supabase.channel(`program-exercises-${programId}`);
      for (const d of days) {
        ch.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "program_exercises",
            filter: `day_id=eq.${d.id}`,
          },
          () => {
            void qc.invalidateQueries({ queryKey: ["trainer-mobile-programs"] });
            void qc.invalidateQueries({ queryKey: ["trainer-program-detail"] });
            void qc.invalidateQueries({ queryKey: ["trainer-workout-plan"] });
            void qc.invalidateQueries({ queryKey: ["trainer-client-detail"] });
          }
        );
      }
      await ch.subscribe();
      channel = ch;
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [programId, qc]);
}
