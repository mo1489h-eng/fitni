import { useAuth } from "@/hooks/useAuth";
import { Users, CalendarDays, TrendingUp, Activity, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CopilotAlerts from "../copilot/CopilotAlerts";
import { useTrainerDashboardQuery } from "@/hooks/useTrainerDashboardQuery";
import { EliteCard } from "../elite/EliteCard";
import { Pressable } from "../elite/Pressable";
import { EmptyStateIllustration } from "../elite/EmptyStateIllustration";
import { eliteSpring } from "../elite/spring";
import { ELITE } from "../workout/designTokens";

const ACCENT = "#22C55E";

type TrainerMobileHomeProps = {
  onGoSchedule?: () => void;
};

function StatSkeleton() {
  return (
    <EliteCard glow="none" className="p-4">
      <div className="animate-pulse">
        <div className="mb-4 h-10 w-10 rounded-2xl bg-white/[0.08]" />
        <div className="h-8 w-16 rounded-lg bg-white/[0.08]" />
        <div className="mt-4 h-3 w-24 rounded bg-white/[0.05]" />
        <div className="mt-2 h-3 w-full max-w-[140px] rounded bg-white/[0.04]" />
      </div>
    </EliteCard>
  );
}

const TrainerMobileHome = ({ onGoSchedule }: TrainerMobileHomeProps) => {
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
    <div className="space-y-8">
      <div>
        <p className="text-sm" style={{ color: ELITE.textSecondary }}>
          {greeting}
        </p>
        <motion.h1
          className="text-2xl font-bold"
          style={{ color: ELITE.textPrimary }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={eliteSpring}
        >
          {firstName} 👋
        </motion.h1>
        {error && (
          <p className="mt-2 text-xs text-red-400/90">تعذّر تحميل البيانات — اسحب للتحديث لاحقاً</p>
        )}
      </div>

      <CopilotAlerts />

      <div className="grid grid-cols-2 gap-4">
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
                glow: "emerald" as const,
              },
              {
                label: "جلسات اليوم",
                value: dash?.todaySessionCount ?? 0,
                icon: CalendarDays,
                color: "#3B82F6",
                sub: "من جدول التدريب",
                glow: "blue" as const,
              },
              {
                label: "معدل الالتزام",
                value: `${dash?.adherencePct ?? 0}%`,
                icon: TrendingUp,
                color: "#F59E0B",
                sub: "من لديهم برنامج — نشاط 7 أيام",
                glow: "amber" as const,
              },
              {
                label: "الأداء",
                value: dash?.performanceGrade ?? "—",
                icon: Activity,
                color: "#8B5CF6",
                sub: `درجة مركّبة (${dash?.performanceScore ?? 0}/100)`,
                glow: "violet" as const,
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={eliteSpring}
              >
                <EliteCard glow={stat.glow} className="p-4">
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ background: `${stat.color}18` }}
                  >
                    <stat.icon className="h-5 w-5" style={{ color: stat.color }} strokeWidth={1.5} />
                  </div>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: ELITE.textPrimary }}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: ELITE.textSecondary }}>
                    {stat.label}
                  </p>
                  <p className="mt-2 text-[10px] leading-snug" style={{ color: ELITE.textTertiary }}>
                    {stat.sub}
                  </p>
                </EliteCard>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {isFetching && !isLoading && (
        <p className="text-center text-[10px]" style={{ color: ELITE.textTertiary }}>
          جاري المزامنة…
        </p>
      )}

      <div>
        <h2 className="mb-4 text-base font-bold" style={{ color: ELITE.textPrimary }}>
          جلسات اليوم
        </h2>
        {showSkeleton ? (
          <EliteCard className="p-4">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-1/3 rounded bg-white/[0.08]" />
              <div className="h-16 w-full rounded-2xl bg-white/[0.06]" />
              <div className="h-16 w-full rounded-2xl bg-white/[0.05]" />
            </div>
          </EliteCard>
        ) : !dash?.todaySessions.length ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={eliteSpring}>
            <EliteCard className="px-6 py-8 text-center">
              <EmptyStateIllustration className="mb-6" />
              <p className="text-sm font-medium" style={{ color: ELITE.textPrimary }}>
                لا توجد جلسات اليوم
              </p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: ELITE.textSecondary }}>
                جدول أول جلسة من التقويم أو خصّص أسبوع عملائك.
              </p>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs font-medium" style={{ color: ACCENT }}>
                <UserPlus className="h-4 w-4" strokeWidth={1.5} />
                انتقل إلى «العملاء» لإضافة عميل جديد
              </p>
              {onGoSchedule && (
                <Pressable
                  onClick={onGoSchedule}
                  className="mt-6 w-full rounded-[20px] py-4 text-sm font-semibold text-[#0a0a0a]"
                  style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
                >
                  ابدأ بجدولة جلسة
                </Pressable>
              )}
            </EliteCard>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {dash.todaySessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={eliteSpring}
              >
                <EliteCard className="flex items-center gap-4 p-4">
                  <div className="h-12 w-1 shrink-0 rounded-full" style={{ background: ACCENT }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: ELITE.textPrimary }}>
                      {session.clientName}
                    </p>
                    <p className="text-xs" style={{ color: ELITE.textSecondary }}>
                      {session.start_time?.slice(0, 5)} · {session.session_type}
                    </p>
                  </div>
                  <div
                    className="shrink-0 rounded-2xl px-3 py-2 text-[10px] font-medium"
                    style={{
                      background: session.is_completed ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                      color: session.is_completed ? ACCENT : ELITE.textTertiary,
                    }}
                  >
                    {session.is_completed ? "مكتمل" : "قادم"}
                  </div>
                </EliteCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerMobileHome;
