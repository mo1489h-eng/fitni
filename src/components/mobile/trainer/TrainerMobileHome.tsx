import { useAuth } from "@/hooks/useAuth";
import { Users, CalendarDays, TrendingUp, Activity, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CopilotAlerts from "../copilot/CopilotAlerts";
import { useTrainerDashboardQuery } from "@/hooks/useTrainerDashboardQuery";

const BG_CARD = "#111111";
const ACCENT = "#22C55E";

function StatSkeleton() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: BG_CARD }}>
      <div className="mb-3 h-9 w-9 rounded-xl bg-white/10" />
      <div className="h-8 w-16 rounded bg-white/10" />
      <div className="mt-2 h-3 w-24 rounded bg-white/5" />
    </div>
  );
}

const TrainerMobileHome = () => {
  const { profile, user } = useAuth();
  const { data: dash, isLoading, isFetching, error } = useTrainerDashboardQuery(user?.id);

  const firstName = profile?.full_name?.split(" ")[0] || "المدرب";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 17) return "مساء الخير";
    return "أهلاً";
  })();

  const showSkeleton = isLoading && !dash;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm" style={{ color: "#666" }}>
          {greeting}
        </p>
        <motion.h1
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {firstName} 👋
        </motion.h1>
        {error && (
          <p className="mt-2 text-xs text-red-400/90">تعذّر تحميل البيانات — اسحب للتحديث لاحقاً</p>
        )}
      </div>

      <CopilotAlerts />

      <div className="grid grid-cols-2 gap-3">
        {showSkeleton ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <AnimatePresence mode="popLayout">
            {[
              {
                label: "العملاء النشطين",
                value: dash?.clientCount ?? 0,
                icon: Users,
                color: ACCENT,
                sub: "إجمالي العملاء المسجّلين",
              },
              {
                label: "جلسات اليوم",
                value: dash?.todaySessionCount ?? 0,
                icon: CalendarDays,
                color: "#3B82F6",
                sub: "من جدول التدريب",
              },
              {
                label: "معدل الالتزام",
                value: `${dash?.adherencePct ?? 0}%`,
                icon: TrendingUp,
                color: "#F59E0B",
                sub: "من لديهم برنامج — نشاط 7 أيام",
              },
              {
                label: "الأداء",
                value: dash?.performanceGrade ?? "—",
                icon: Activity,
                color: "#8B5CF6",
                sub: `درجة مركّبة (${dash?.performanceScore ?? 0}/100)`,
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl p-4"
                style={{ background: BG_CARD }}
              >
                <div
                  className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: `${stat.color}15` }}
                >
                  <stat.icon className="h-4.5 w-4.5" style={{ color: stat.color }} strokeWidth={1.5} />
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
                <p className="mt-0.5 text-xs" style={{ color: "#666" }}>
                  {stat.label}
                </p>
                <p className="mt-1 text-[10px] leading-snug" style={{ color: "#555" }}>
                  {stat.sub}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {isFetching && !isLoading && (
        <p className="text-center text-[10px] text-white/45">جاري المزامنة…</p>
      )}

      <div>
        <h2 className="mb-3 text-base font-bold text-white">جلسات اليوم</h2>
        {showSkeleton ? (
          <div className="h-32 rounded-2xl animate-pulse bg-white/5" />
        ) : !dash?.todaySessions.length ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl px-5 py-8 text-center"
            style={{ background: BG_CARD }}
          >
            <CalendarDays className="mx-auto mb-3 h-10 w-10" style={{ color: "#333" }} strokeWidth={1.5} />
            <p className="text-sm font-medium text-white/90">لا توجد جلسات اليوم</p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "#666" }}>
              أضف جلسات من التقويم أو خصّص جدولك للعملاء.
            </p>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs font-medium" style={{ color: ACCENT }}>
              <UserPlus className="h-4 w-4" strokeWidth={1.5} />
              انتقل إلى «العملاء» لإضافة عميل جديد
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {dash.todaySessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-xl p-4"
                style={{ background: BG_CARD }}
              >
                <div className="h-10 w-1 rounded-full" style={{ background: ACCENT }} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{session.clientName}</p>
                  <p className="text-xs" style={{ color: "#666" }}>
                    {session.start_time?.slice(0, 5)} · {session.session_type}
                  </p>
                </div>
                <div
                  className="shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-medium"
                  style={{
                    background: session.is_completed ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                    color: session.is_completed ? ACCENT : "#888",
                  }}
                >
                  {session.is_completed ? "مكتمل" : "قادم"}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerMobileHome;
