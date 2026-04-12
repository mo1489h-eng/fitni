import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { ar } from "date-fns/locale";

const TrainerMobileSchedule = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("trainer_sessions")
        .select("*, clients(name)")
        .eq("trainer_id", user.id)
        .eq("session_date", dateStr)
        .order("start_time");
      setSessions(data || []);
    };
    fetch();
  }, [user, dateStr]);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(
      subDays(selectedDate, selectedDate.getDay()),
      i
    );
    return d;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">الجدول</h1>
        <span className="text-sm" style={{ color: "#666" }}>
          {format(selectedDate, "MMMM yyyy", { locale: ar })}
        </span>
      </div>

      {/* Week Strip */}
      <div className="flex items-center gap-1">
        <button onClick={() => setSelectedDate(subDays(selectedDate, 7))} className="p-1">
          <ChevronRight className="h-4 w-4" style={{ color: "#555" }} />
        </button>
        <div className="flex flex-1 justify-between">
          {weekDays.map((d) => {
            const isSelected = format(d, "yyyy-MM-dd") === dateStr;
            const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            return (
              <button
                key={d.toISOString()}
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
        <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-1">
          <ChevronLeft className="h-4 w-4" style={{ color: "#555" }} />
        </button>
      </div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#111111" }}>
          <CalendarDays className="mx-auto mb-2 h-8 w-8" style={{ color: "#333" }} strokeWidth={1.5} />
          <p className="text-sm" style={{ color: "#666" }}>لا توجد جلسات في هذا اليوم</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl p-4" style={{ background: "#111111" }}>
              <div className="text-center" style={{ minWidth: 48 }}>
                <p className="text-sm font-bold text-white">{s.start_time?.slice(0, 5)}</p>
                <p className="text-[10px]" style={{ color: "#555" }}>{s.duration_minutes || 60} د</p>
              </div>
              <div className="h-10 w-0.5 rounded-full" style={{ background: "#22C55E" }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{(s.clients as any)?.name}</p>
                <p className="text-xs" style={{ color: "#666" }}>{s.session_type}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerMobileSchedule;
