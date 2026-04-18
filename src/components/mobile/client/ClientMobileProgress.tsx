import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Flame } from "lucide-react";

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Consecutive calendar days (ending today) with at least one completed session */
function consecutiveDayStreak(completedAtIso: string[]): number {
  const keys = new Set<string>();
  for (const iso of completedAtIso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    keys.add(dayKey(d));
  }
  let streak = 0;
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  for (;;) {
    if (!keys.has(dayKey(cur))) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
    if (streak > 365) break;
  }
  return streak;
}

/** Completed sessions on distinct days in the current calendar week (Sun–Sat, local) */
function completionsThisWeek(completedAtIso: string[]): number {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const days = new Set<string>();
  for (const iso of completedAtIso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    if (d >= start && d < end) days.add(dayKey(d));
  }
  return days.size;
}

const ClientMobileProgress = () => {
  const { user } = useAuth();

  const { data: clientId, isLoading: loadingClient } = useQuery({
    queryKey: ["mobile-trainee-client-id", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!user,
  });

  const { data: totalCompleted = 0, isLoading: loadingTotal } = useQuery({
    queryKey: ["mobile-trainee-workout-total", clientId],
    queryFn: async () => {
      if (!clientId) return 0;
      const { count, error } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .not("completed_at", "is", null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!clientId,
  });

  const { data: sessionRows = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["mobile-trainee-workouts-recent", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, completed_at, duration_minutes, created_at")
        .eq("client_id", clientId)
        .not("completed_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as { id: string; completed_at: string; duration_minutes: number | null; created_at: string }[];
    },
    enabled: !!clientId,
  });

  const completedTimes = sessionRows.map((s) => s.completed_at).filter(Boolean) as string[];
  const streak = consecutiveDayStreak(completedTimes);
  const weekActiveDays = completionsThisWeek(completedTimes);
  const lastSeven = sessionRows.slice(0, 7);

  const loading = loadingClient || (clientId != null && (loadingTotal || loadingRecent));

  if (!user) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
        سجّل الدخول لعرض التقدم.
      </div>
    );
  }

  if (loadingClient || (loading && !clientId)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-foreground">تقدمي</h1>
        <div className="rounded-2xl bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            لم يُربط حسابك بملف متدرب بعد. أكمل التسجيل من رابط المدرب أو تواصل مع الدعم.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">تقدمي</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">إجمالي التمارين</p>
          <p className="mt-2 text-2xl font-black tabular-nums text-foreground">{totalCompleted}</p>
        </div>
        <div className="rounded-2xl bg-card p-4">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Flame className="h-3 w-3 text-amber-400" />
            أيام متتالية
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums text-foreground">{streak}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
        <p className="text-xs text-muted-foreground">
          هذا الأسبوع: <span className="font-semibold text-foreground">{weekActiveDays}</span> يوماً بتمرين مكتمل
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-foreground/90">آخر التمارين</h2>
        {lastSeven.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">
            لا توجد تمارين مكتملة بعد. ابدأ من تبويب «تمريني».
          </div>
        ) : (
          <ul className="space-y-2">
            {lastSeven.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {s.completed_at
                      ? new Date(s.completed_at).toLocaleString("ar-SA", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.duration_minutes != null ? `${s.duration_minutes} دقيقة` : "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ClientMobileProgress;
