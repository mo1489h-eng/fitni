import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CalendarDays, Check, Loader2 } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type SessionRow = {
  id: string;
  start_time: string;
  duration_minutes: number | null;
  session_type: string;
  is_completed: boolean;
  clients: { name: string } | null;
};

function clientName(s: SessionRow) {
  const c = s.clients;
  if (c && typeof c === "object" && "name" in c && c.name) return c.name;
  return "عميل";
}

const TrainerMobileSchedule = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["trainer-mobile-sessions", user?.id, dateStr],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("trainer_sessions")
        .select("id, start_time, duration_minutes, session_type, is_completed, clients(name)")
        .eq("trainer_id", user.id)
        .eq("session_date", dateStr)
        .order("start_time");
      if (error) throw error;
      return (data || []) as SessionRow[];
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase
        .from("trainer_sessions")
        .update({
          is_completed: next,
          confirmation_status: next ? "confirmed" : "pending",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-mobile-sessions"] });
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(subDays(selectedDate, selectedDate.getDay()), i);
    return d;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">الجدول</h1>
        <span className="text-sm" style={{ color: "#666" }}>
          {format(selectedDate, "MMMM yyyy", { locale: ar })}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setSelectedDate(subDays(selectedDate, 7))} className="p-1">
          <ChevronRight className="h-4 w-4" style={{ color: "#555" }} />
        </button>
        <div className="flex flex-1 justify-between">
          {weekDays.map((d) => {
            const isSelected = format(d, "yyyy-MM-dd") === dateStr;
            const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setSelectedDate(d)}
                className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all"
                style={{
                  background: isSelected ? "rgba(34,197,94,0.15)" : "transparent",
                }}
              >
                <span className="text-[10px]" style={{ color: "#666" }}>
                  {format(d, "EEE", { locale: ar }).slice(0, 2)}
                </span>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                  style={{
                    color: isSelected ? "#22C55E" : isToday ? "#fff" : "#888",
                    background: isToday && !isSelected ? "rgba(255,255,255,0.08)" : "transparent",
                  }}
                >
                  {format(d, "d")}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-1">
          <ChevronLeft className="h-4 w-4" style={{ color: "#555" }} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#22C55E" }} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#111111" }}>
          <CalendarDays className="mx-auto mb-2 h-8 w-8" style={{ color: "#333" }} strokeWidth={1.5} />
          <p className="text-sm" style={{ color: "#666" }}>
            لا توجد جلسات في هذا اليوم
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl p-4"
              style={{ background: "#111111" }}
            >
              <div className="text-center" style={{ minWidth: 48 }}>
                <p className="text-sm font-bold text-white">{s.start_time?.slice(0, 5)}</p>
                <p className="text-[10px]" style={{ color: "#555" }}>{s.duration_minutes ?? 60} د</p>
              </div>
              <div className="h-10 w-0.5 rounded-full" style={{ background: "#22C55E" }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{clientName(s)}</p>
                <p className="truncate text-xs" style={{ color: "#666" }}>
                  {s.session_type || "جلسة"}
                </p>
              </div>
              <button
                type="button"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate({ id: s.id, next: !s.is_completed })}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: s.is_completed ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)",
                  color: s.is_completed ? "#22C55E" : "#888",
                }}
              >
                {toggleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" strokeWidth={2} />
                )}
                {s.is_completed ? "حضور" : "تسجيل حضور"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerMobileSchedule;
