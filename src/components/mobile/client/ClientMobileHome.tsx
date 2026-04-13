import { useMemo } from "react";
import { useMobilePortalToken } from "@/hooks/useMobilePortalToken";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, TrendingUp, Flame, Target, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import MuscleRecoveryMap from "../workout/MuscleRecoveryMap";

const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

type HomeProps = {
  onStartWorkout?: () => void;
  canStartWorkout?: boolean;
};

const ClientMobileHome = ({ onStartWorkout, canStartWorkout }: HomeProps) => {
  const token = useMobilePortalToken();

  const { data: clientRow } = useQuery({
    queryKey: ["mobile-portal-client", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_client_by_portal_token" as never, { p_token: token } as never);
      if (error) throw error;
      const row = Array.isArray(data) ? (data as Record<string, unknown>[])[0] : null;
      return row as {
        id: string;
        name: string;
        days_per_week: number | null;
        week_number: number | null;
      } | null;
    },
    enabled: !!token,
  });

  const { data: programSummary } = useQuery({
    queryKey: ["mobile-portal-program", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_portal_program" as never, { p_token: token } as never);
      if (error) return null;
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (!parsed?.days?.length) return { todayLabel: null as string | null, totalDays: 0 };
      const todayName = WEEKDAYS[new Date().getDay()];
      const todayDay = parsed.days.find((d: { day_name: string }) =>
        (d.day_name || "").includes(todayName)
      );
      const ex = todayDay?.exercises?.[0];
      const todayLabel = todayDay
        ? `${todayDay.day_name}${ex ? ` — ${ex.name}` : ""}`
        : "لا يوجد تمرين باسم اليوم في البرنامج";
      return {
        todayLabel,
        totalDays: parsed.days?.length ?? 0,
        programName: parsed.name as string,
      };
    },
    enabled: !!token,
  });

  const { data: workoutStats } = useQuery({
    queryKey: ["mobile-portal-workout-stats", token],
    queryFn: async () => {
      if (!token) return { total_workouts: 0, current_streak: 0 };
      const { data, error } = await supabase.rpc("get_portal_workout_stats" as never, { p_token: token } as never);
      if (error || !data || typeof data !== "object") return { total_workouts: 0, current_streak: 0 };
      const j = data as { total_workouts?: number; current_streak?: number };
      return {
        total_workouts: j.total_workouts ?? 0,
        current_streak: j.current_streak ?? 0,
      };
    },
    enabled: !!token,
  });

  const { data: compliancePct } = useQuery({
    queryKey: ["mobile-compliance", clientRow?.id],
    queryFn: async () => {
      if (!clientRow?.id) return 0;
      const since = new Date();
      since.setDate(since.getDate() - 28);
      const { count, error } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientRow.id)
        .not("completed_at", "is", null)
        .gte("completed_at", since.toISOString());
      if (error) return 0;
      const done = count ?? 0;
      const daysPerWeek = clientRow.days_per_week ?? 3;
      const expected = Math.max(1, Math.round((daysPerWeek / 7) * 28));
      return Math.min(100, Math.round((done / expected) * 100));
    },
    enabled: !!clientRow?.id,
  });

  const { data: lastWorkout } = useQuery({
    queryKey: ["mobile-last-workout", clientRow?.id],
    queryFn: async () => {
      if (!clientRow?.id) return null;
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("completed_at, total_volume, duration_minutes")
        .eq("client_id", clientRow.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!clientRow?.id,
  });

  const name = clientRow?.name?.split(" ")[0] || "المتدرب";

  const stats = useMemo(
    () => [
      {
        label: "الالتزام",
        value: `${compliancePct ?? 0}%`,
        icon: Target,
        color: "#22C55E",
        sub: "آخر 28 يوم",
      },
      {
        label: "السلسلة",
        value: `${workoutStats?.current_streak ?? 0} يوم`,
        icon: Flame,
        color: "#F59E0B",
      },
      {
        label: "تمارين مكتملة",
        value: String(workoutStats?.total_workouts ?? 0),
        icon: Dumbbell,
        color: "#3B82F6",
      },
      {
        label: "الأسبوع",
        value: String(clientRow?.week_number ?? 1),
        icon: TrendingUp,
        color: "#8B5CF6",
      },
    ],
    [compliancePct, workoutStats, clientRow?.week_number]
  );

  if (!token) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ background: "#111111", color: "#888" }}>
        لم يتم العثور على رمز البوابة. سجّل الخروج ثم الدخول مرة أخرى.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm" style={{ color: "#666" }}>
          مرحباً
        </p>
        <h1 className="text-2xl font-bold text-white">{name} 👋</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "#111111" }}>
            <div
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: `${s.color}15` }}
            >
              <s.icon className="h-4 w-4" style={{ color: s.color }} strokeWidth={1.5} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[11px]" style={{ color: "#666" }}>
              {s.label}
            </p>
            {"sub" in s && s.sub && (
              <p className="mt-0.5 text-[10px]" style={{ color: "#555" }}>
                {s.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))",
          border: "1px solid rgba(34,197,94,0.1)",
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Dumbbell className="h-5 w-5" style={{ color: "#22C55E" }} strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-white">تمرين اليوم</h3>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#999" }}>
          {programSummary?.todayLabel || "لا يوجد تمرين مجدول لليوم"}
        </p>
        {programSummary?.programName && (
          <p className="mt-2 text-[11px]" style={{ color: "#666" }}>
            البرنامج: {programSummary.programName}
          </p>
        )}
        {onStartWorkout && (
          <button
            type="button"
            disabled={!canStartWorkout}
            onClick={onStartWorkout}
            className="mt-4 w-full rounded-[12px] py-4 text-[16px] font-black text-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              boxShadow: "0 8px 28px rgba(34,197,94,0.35)",
            }}
          >
            ابدأ تمرين اليوم
          </button>
        )}
      </div>

      {lastWorkout && (
        <div className="rounded-[16px] p-4" style={{ background: "#111111", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: "#22C55E" }} />
            <h3 className="text-[16px] font-bold text-white">آخر تمرين</h3>
          </div>
          <p className="text-[12px]" style={{ color: "#888" }}>
            {lastWorkout.completed_at
              ? new Date(lastWorkout.completed_at).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })
              : "—"}
          </p>
          <p className="mt-2 text-[14px] text-white">
            الحجم: {Math.round(Number(lastWorkout.total_volume) || 0)} كجم
            {lastWorkout.duration_minutes != null ? ` · ${lastWorkout.duration_minutes} د` : ""}
          </p>
        </div>
      )}

      <MuscleRecoveryMap clientId={clientRow?.id} />
    </div>
  );
};

export default ClientMobileHome;
