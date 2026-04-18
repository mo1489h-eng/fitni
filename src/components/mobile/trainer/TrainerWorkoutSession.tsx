import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildWorkoutPlanFromDay } from "@/lib/workoutDayPlan";
import WorkoutSessionView from "../shared/WorkoutSessionView";

const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

type Props = {
  clientId: string;
  programId: string;
  onClose: () => void;
};

export default function TrainerWorkoutSession({ clientId, programId, onClose }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["trainer-workout-plan", programId],
    queryFn: async () => {
      const { data: rows, error: qErr } = await supabase
        .from("program_days")
        .select(
          `
          id,
          day_name,
          program_exercises (
            id,
            name,
            sets,
            reps,
            weight,
            rest_seconds,
            exercise_order,
            is_warmup
          )
        `
        )
        .eq("program_id", programId);
      if (qErr) throw qErr;
      const todayName = WEEKDAYS[new Date().getDay()];
      const day = (rows || []).find((d: { day_name: string }) =>
        (d.day_name || "").includes(todayName)
      );
      const exercises = (day as { program_exercises?: { id: string; name: string }[] } | undefined)
        ?.program_exercises;
      if (!day || !exercises?.length) {
        return { plan: null as null, programDayId: null as null, empty: true as const };
      }
      const plan = buildWorkoutPlanFromDay({ id: day.id, exercises });
      return { plan, programDayId: day.id, empty: false as const };
    },
    enabled: !!programId,
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-primary" />
        <p className="mt-4 text-sm text-muted-foreground">جاري تحميل خطة التمرين…</p>
      </div>
    );
  }

  const errMsg = error ? (error as Error).message : null;
  const empty = data?.empty || !data?.plan?.length || !data?.programDayId;

  if (errMsg || empty) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6" dir="rtl">
        <p className="text-center text-sm text-foreground">
          {errMsg || "لا يوجد تمارين مجدولة ليوم اليوم في هذا البرنامج"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-xl bg-card px-6 py-3 text-sm font-bold text-foreground"
        >
          إغلاق
        </button>
      </div>
    );
  }

  return (
    <WorkoutSessionView
      clientId={clientId}
      programDayId={data.programDayId}
      plan={data.plan}
      onClose={onClose}
      variant="trainer"
    />
  );
}
