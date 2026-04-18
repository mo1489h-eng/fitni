import { useMobilePortalToken } from "@/hooks/useMobilePortalToken";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  rest_seconds?: number | null;
  notes?: string | null;
  is_warmup?: boolean;
  exercise_order: number;
};

type Day = {
  id: string;
  day_name: string;
  day_order: number;
  exercises: Exercise[];
};

const ClientMobileProgram = () => {
  const token = useMobilePortalToken();

  const { data, isLoading, error } = useQuery({
    queryKey: ["mobile-portal-program-full", token],
    queryFn: async () => {
      if (!token) return null;
      const { data: raw, error: e } = await supabase.rpc("get_portal_program", { p_token: token });
      if (e) throw e;
      if (!raw) return null;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return parsed as {
        id: string;
        name: string;
        weeks: number | null;
        week_number: number | null;
        days: Day[];
      };
    },
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ background: "#111111", color: "#888" }}>
        لم يتم العثور على رمز البوابة. سجّل الخروج ثم الدخول مرة أخرى.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4f6f52" }} />
      </div>
    );
  }

  if (error || !data?.days?.length) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-white">برنامجي</h1>
        <div className="rounded-2xl p-8 text-center" style={{ background: "#111111" }}>
          <Dumbbell className="mx-auto mb-3 h-10 w-10" style={{ color: "#333" }} strokeWidth={1.5} />
          <p className="text-sm" style={{ color: "#666" }}>
            لا يوجد برنامج مخصص. تواصل مع مدربك لإسناد برنامج.
          </p>
        </div>
      </div>
    );
  }

  const days = [...data.days].sort((a, b) => a.day_order - b.day_order);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">برنامجي</h1>
        <p className="mt-1 text-sm" style={{ color: "#666" }}>
          {data.name}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className="rounded-lg px-2 py-1 text-[10px] font-medium"
            style={{ background: "rgba(79,111,82,0.12)", color: "#4f6f52" }}
          >
            الأسبوع {data.week_number ?? 1} من {data.weeks ?? "—"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((day) => {
          const exercises = [...(day.exercises || [])].sort((a, b) => a.exercise_order - b.exercise_order);
          return (
            <div key={day.id} className="overflow-hidden rounded-2xl" style={{ background: "#111111" }}>
              <div
                className="border-b px-4 py-3"
                style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(79,111,82,0.06)" }}
              >
                <p className="text-sm font-bold text-white">{day.day_name}</p>
                <p className="text-[10px]" style={{ color: "#666" }}>
                  {exercises.length} تمرين
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {exercises.map((ex) => (
                  <div key={ex.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{ex.name}</p>
                      {ex.is_warmup && (
                        <span className="shrink-0 text-[10px]" style={{ color: "#F59E0B" }}>
                          إحماء
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "#888" }}>
                      {ex.sets} × {ex.reps}
                      {ex.weight > 0 ? ` · ${ex.weight} كجم` : " · وزن الجسم"}
                      {ex.rest_seconds ? ` · راحة ${ex.rest_seconds}ث` : ""}
                    </p>
                    {ex.notes && (
                      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#666" }}>
                        {ex.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientMobileProgram;
