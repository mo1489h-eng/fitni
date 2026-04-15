import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ProgramExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  rest_seconds: number | null;
  exercise_order: number;
  notes: string | null;
  is_warmup: boolean;
};

type ProgramDay = {
  id: string;
  day_name: string;
  day_order: number;
  program_exercises: ProgramExercise[] | null;
};

const TrainerMobileWorkouts = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["trainer-mobile-programs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, description, weeks, difficulty, created_at, delivery_mode")
        .eq("trainer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: programDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["trainer-program-detail", detailId],
    queryFn: async () => {
      if (!detailId) return null;
      const { data, error } = await supabase
        .from("programs")
        .select(
          `
          id, name, description, weeks, difficulty, delivery_mode,
          program_days (
            id, day_name, day_order,
            program_exercises (
              id, name, sets, reps, weight, rest_seconds, exercise_order, notes, is_warmup
            )
          )
        `
        )
        .eq("id", detailId)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        name: string;
        description: string | null;
        weeks: number | null;
        difficulty: string | null;
        delivery_mode?: "online" | "in_person";
        program_days: ProgramDay[] | null;
      };
    },
    enabled: !!detailId,
  });

  const deliveryMutation = useMutation({
    mutationFn: async (mode: "online" | "in_person") => {
      if (!detailId) return;
      const { error } = await supabase.from("programs").update({ delivery_mode: mode }).eq("id", detailId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["trainer-program-detail", detailId] });
      void qc.invalidateQueries({ queryKey: ["trainer-mobile-programs", user?.id] });
    },
  });

  if (detailId && programDetail) {
    const days = [...(programDetail.program_days || [])].sort((a, b) => a.day_order - b.day_order);
    const dm = programDetail.delivery_mode === "in_person" ? "in_person" : "online";
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setDetailId(null)}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: "#22C55E" }}
        >
          <ChevronRight className="h-4 w-4" />
          العودة للبرامج
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{programDetail.name}</h1>
          {programDetail.description && (
            <p className="mt-1 text-xs" style={{ color: "#666" }}>
              {programDetail.description}
            </p>
          )}
          <p className="mt-2 text-[10px] font-medium uppercase tracking-wide" style={{ color: "#666" }}>
            نوع التسليم
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              disabled={deliveryMutation.isPending}
              onClick={() => deliveryMutation.mutate("online")}
              className="flex-1 rounded-xl py-2.5 text-xs font-bold transition"
              style={{
                background: dm === "online" ? "rgba(34,197,94,0.2)" : "#1a1a1a",
                color: dm === "online" ? "#22C55E" : "#888",
                border: `1px solid ${dm === "online" ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              أونلاين
            </button>
            <button
              type="button"
              disabled={deliveryMutation.isPending}
              onClick={() => deliveryMutation.mutate("in_person")}
              className="flex-1 rounded-xl py-2.5 text-xs font-bold transition"
              style={{
                background: dm === "in_person" ? "rgba(34,197,94,0.2)" : "#1a1a1a",
                color: dm === "in_person" ? "#22C55E" : "#888",
                border: `1px solid ${dm === "in_person" ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              حضوري (وضع الجلسة)
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className="rounded-lg px-2 py-1 text-[10px] font-medium"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}
            >
              {programDetail.weeks ?? "—"} أسابيع
            </span>
            {programDetail.difficulty && (
              <span
                className="rounded-lg px-2 py-1 text-[10px] font-medium"
                style={{ background: "rgba(255,255,255,0.05)", color: "#888" }}
              >
                {programDetail.difficulty}
              </span>
            )}
          </div>
        </div>
        {detailLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#22C55E" }} />
          </div>
        ) : (
          <div className="space-y-4">
            {days.map((day) => {
              const exercises = [...(day.program_exercises || [])].sort(
                (a, b) => a.exercise_order - b.exercise_order
              );
              return (
                <div key={day.id} className="overflow-hidden rounded-2xl" style={{ background: "#111111" }}>
                  <div
                    className="border-b px-4 py-3"
                    style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(34,197,94,0.06)" }}
                  >
                    <p className="text-sm font-bold text-white">{day.day_name}</p>
                    <p className="text-[10px]" style={{ color: "#666" }}>
                      {exercises.length} تمرين
                    </p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {exercises.length === 0 ? (
                      <p className="px-4 py-4 text-center text-xs" style={{ color: "#555" }}>
                        لا تمارين في هذا اليوم
                      </p>
                    ) : (
                      exercises.map((ex) => (
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
                            {ex.sets} × {ex.reps} · {ex.weight > 0 ? `${ex.weight} كجم` : "وزن الجسم"}
                            {ex.rest_seconds ? ` · راحة ${ex.rest_seconds}ث` : ""}
                          </p>
                          {ex.notes && (
                            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#666" }}>
                              {ex.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (detailId && detailLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#22C55E" }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">البرامج</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl" style={{ background: "#161616" }} />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#111111" }}>
          <Dumbbell className="mx-auto mb-2 h-8 w-8" style={{ color: "#333" }} strokeWidth={1.5} />
          <p className="text-sm" style={{ color: "#666" }}>
            لا توجد برامج بعد
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((p: { id: string; name: string; description: string | null; weeks: number | null; difficulty: string | null; delivery_mode?: string }) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDetailId(p.id)}
              className="w-full rounded-2xl p-4 text-right transition-all active:scale-[0.98]"
              style={{ background: "#111111" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-white">{p.name}</h3>
                  {p.description && (
                    <p className="mt-1 truncate text-xs" style={{ color: "#666" }}>
                      {p.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    {p.delivery_mode === "in_person" && (
                      <span
                        className="rounded-lg px-2 py-1 text-[10px] font-medium"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
                      >
                        حضوري
                      </span>
                    )}
                    <span
                      className="rounded-lg px-2 py-1 text-[10px] font-medium"
                      style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}
                    >
                      {p.weeks ?? "—"} أسابيع
                    </span>
                    {p.difficulty && (
                      <span
                        className="rounded-lg px-2 py-1 text-[10px] font-medium"
                        style={{ background: "rgba(255,255,255,0.05)", color: "#888" }}
                      >
                        {p.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 shrink-0" style={{ color: "#333" }} strokeWidth={1.5} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerMobileWorkouts;
