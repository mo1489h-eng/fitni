import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, TrendingUp, Activity } from "lucide-react";
import CopilotAlerts from "../copilot/CopilotAlerts";

const TrainerMobileHome = () => {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({ clients: 0, sessions: 0, revenue: 0 });
  const [todaySessions, setTodaySessions] = useState<any[]>([]);

  const firstName = profile?.full_name?.split(" ")[0] || "المدرب";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 17) return "مساء الخير";
    return "أهلاً";
  })();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [{ count: clientCount }, { data: sessions }] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("trainer_id", user.id),
        supabase
          .from("trainer_sessions")
          .select("*, clients(name)")
          .eq("trainer_id", user.id)
          .eq("session_date", new Date().toISOString().split("T")[0])
          .order("start_time"),
      ]);

      setStats((s) => ({ ...s, clients: clientCount || 0 }));
      setTodaySessions(sessions || []);
    };

    fetchData();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm" style={{ color: "#666" }}>{greeting}</p>
        <h1 className="text-2xl font-bold text-white">{firstName} 👋</h1>
      </div>

      <CopilotAlerts />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "العملاء النشطين", value: stats.clients, icon: Users, color: "#22C55E" },
          { label: "جلسات اليوم", value: todaySessions.length, icon: CalendarDays, color: "#3B82F6" },
          { label: "معدل الالتزام", value: "87%", icon: TrendingUp, color: "#F59E0B" },
          { label: "الأداء", value: "A+", icon: Activity, color: "#8B5CF6" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4"
            style={{ background: "#111111" }}
          >
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: `${stat.color}15` }}
            >
              <stat.icon className="h-4.5 w-4.5" style={{ color: stat.color }} strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-0.5 text-xs" style={{ color: "#666" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Today's Sessions */}
      <div>
        <h2 className="mb-3 text-base font-bold text-white">جلسات اليوم</h2>
        {todaySessions.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "#111111" }}>
            <CalendarDays className="mx-auto mb-2 h-8 w-8" style={{ color: "#333" }} strokeWidth={1.5} />
            <p className="text-sm" style={{ color: "#666" }}>لا توجد جلسات اليوم</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-xl p-4"
                style={{ background: "#111111" }}
              >
                <div
                  className="h-10 w-1 rounded-full"
                  style={{ background: "#22C55E" }}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {(session.clients as any)?.name || "عميل"}
                  </p>
                  <p className="text-xs" style={{ color: "#666" }}>
                    {session.start_time?.slice(0, 5)} - {session.session_type}
                  </p>
                </div>
                <div
                  className="rounded-lg px-2.5 py-1 text-[10px] font-medium"
                  style={{
                    background: session.is_completed ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                    color: session.is_completed ? "#22C55E" : "#888",
                  }}
                >
                  {session.is_completed ? "مكتمل" : "قادم"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerMobileHome;
