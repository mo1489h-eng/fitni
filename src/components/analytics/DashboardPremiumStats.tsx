import { useMemo } from "react";
import { useTrainerAnalyticsData, activeClientsNow, leaderboardRows } from "@/hooks/useTrainerAnalyticsData";
import { PremiumStatCard } from "./PremiumStatCard";

/** Stripe + Fitness summary row for dashboard — real Supabase data */
export function DashboardPremiumStats() {
  const { data, isLoading } = useTrainerAnalyticsData();

  const clients = data?.clients ?? [];
  const sessions = data?.sessions ?? [];
  const vols = data?.sessionExerciseVolumes ?? [];
  const payments = data?.payments ?? [];

  const active = useMemo(() => activeClientsNow(clients), [clients]);
  const leaderboard = useMemo(() => leaderboardRows(clients, sessions, vols), [clients, sessions, vols]);
  const workoutCountByClient = useMemo(() => {
    const m = new Map<string, number>();
    sessions.forEach((s) => m.set(s.client_id, (m.get(s.client_id) ?? 0) + 1));
    return m;
  }, [sessions]);
  const growth = useMemo(() => {
    // last 8 months active count for spark — from hook we could add; use payment months as proxy
    const now = new Date();
    const pts: { v: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = clients.filter(
        (c) =>
          new Date(c.created_at) <= monthEnd &&
          new Date(c.subscription_end_date) >= new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1)
      ).length;
      pts.push({ v: count });
    }
    return pts;
  }, [clients]);

  const revSpark = useMemo(() => {
    const now = new Date();
    const pts: { a: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let a = 0;
      payments.forEach((p) => {
        const pd = new Date(p.created_at);
        if (`${pd.getFullYear()}-${pd.getMonth()}` === key) a += Number(p.amount) || 0;
      });
      pts.push({ a });
    }
    return pts;
  }, [payments]);

  const mrr = useMemo(() => active.reduce((s, c) => s + (Number(c.subscription_price) || 0), 0), [active]);

  const mrrPrev = useMemo(() => {
    const now = new Date();
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrev = new Date(now.getFullYear(), now.getMonth(), 0);
    return clients
      .filter((c) => {
        const end = new Date(c.subscription_end_date);
        return end >= startPrev && new Date(c.created_at) <= endPrev;
      })
      .reduce((s, c) => s + (Number(c.subscription_price) || 0), 0);
  }, [clients]);

  const complianceAvg = useMemo(() => {
    const eligible = clients.filter((c) => (workoutCountByClient.get(c.id) ?? 0) >= 3);
    if (eligible.length === 0) return null;
    const eligibleIds = new Set(eligible.map((c) => c.id));
    const rows = leaderboard.filter((r) => eligibleIds.has(r.id));
    if (rows.length === 0) return null;
    return Math.round(rows.reduce((s, r) => s + r.compliance, 0) / rows.length);
  }, [clients, leaderboard, workoutCountByClient]);

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  /** Share of active subscribers who logged ≥1 session that month (real Supabase sessions). */
  const complianceSpark = useMemo(() => {
    const pts: { c: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(y, m - i, 1);
      const monthEnd = new Date(y, m - i + 1, 0, 23, 59, 59, 999);
      const activeThen = clients.filter(
        (c) => new Date(c.created_at) <= monthEnd && new Date(c.subscription_end_date) >= monthStart,
      ).length;
      const trained = new Set(
        sessions
          .filter((s) => {
            const d = new Date(s.started_at);
            return d >= monthStart && d <= monthEnd;
          })
          .map((s) => s.client_id),
      ).size;
      pts.push({ c: activeThen > 0 ? Math.round((trained / activeThen) * 100) : 0 });
    }
    return pts;
  }, [clients, sessions, y, m]);

  const complianceTrend =
    complianceSpark.length >= 2
      ? (() => {
          const prev = complianceSpark[complianceSpark.length - 2].c;
          const last = complianceSpark[complianceSpark.length - 1].c;
          if (prev === 0 && last === 0) return null;
          if (prev === 0) return last > 0 ? 100 : null;
          return Math.round(((last - prev) / prev) * 100);
        })()
      : null;

  const sessionsThisMonth = sessions.filter((s) => {
    const d = new Date(s.started_at);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;

  const sessionsPrevMonth = sessions.filter((s) => {
    const d = new Date(s.started_at);
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    return d.getFullYear() === py && d.getMonth() === pm;
  }).length;

  const sessSpark = useMemo(() => {
    const pts: { s: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(y, m - i + 1, 0);
      const monthStart = new Date(y, m - i, 1);
      const n = sessions.filter((s) => {
        const d = new Date(s.started_at);
        return d >= monthStart && d <= monthEnd;
      }).length;
      pts.push({ s: n });
    }
    return pts;
  }, [sessions, y, m]);

  const activeTrend = growth.length >= 2 ? Math.round(((growth[growth.length - 1].v - growth[growth.length - 2].v) / Math.max(1, growth[growth.length - 2].v)) * 100) : 0;
  const mrrTrend = mrrPrev > 0 ? Math.round(((mrr - mrrPrev) / mrrPrev) * 100) : null;
  const sessTrend = sessionsPrevMonth > 0 ? Math.round(((sessionsThisMonth - sessionsPrevMonth) / sessionsPrevMonth) * 100) : sessionsThisMonth > 0 ? 100 : 0;

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <PremiumStatCard
        label="إجمالي العملاء النشطين"
        value={active.length}
        sublabel={`من ${clients.length} عميل مسجّل`}
        sparklineData={growth}
        dataKey="v"
        trendPct={activeTrend}
        loading={isLoading}
      />
      <PremiumStatCard
        label="الإيراد الشهري (ريال)"
        value={Math.round(mrr).toLocaleString("ar-SA")}
        suffix="ر.س"
        sublabel="مجموع اشتراكات العملاء النشطين"
        sparklineData={revSpark}
        dataKey="a"
        trendPct={mrrTrend}
        loading={isLoading}
      />
      <PremiumStatCard
        label="متوسط الالتزام"
        value={complianceAvg != null ? `${complianceAvg}%` : "—"}
        sublabel={complianceAvg != null ? "متوسط بين من لديهم 3+ جلسات مكتملة" : "لا توجد بيانات كافية بعد"}
        sparklineData={complianceSpark}
        dataKey="c"
        trendPct={complianceTrend}
        loading={isLoading}
      />
      <PremiumStatCard
        label="جلسات هذا الشهر"
        value={sessionsThisMonth}
        sublabel="جلسات تمرين مكتملة"
        sparklineData={sessSpark}
        dataKey="s"
        trendPct={sessTrend}
        loading={isLoading}
      />
    </section>
  );
}
