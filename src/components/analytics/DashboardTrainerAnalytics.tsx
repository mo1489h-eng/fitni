import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";
import {
  useTrainerAnalyticsData,
  activeClientsNow,
  subscriptionDonut,
  monthlyRevenueSeries,
  projectedMRR,
  leaderboardRows,
  churnLastMonth,
  activeClientsByMonth,
  heatmapAllClients,
} from "@/hooks/useTrainerAnalyticsData";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown, MessageCircle, TrendingDown, Eye } from "lucide-react";
import { formatWhatsApp } from "@/lib/analytics/formatWhatsApp";

const GREEN = "#22C55E";

export function DashboardTrainerAnalytics() {
  const { data, isLoading } = useTrainerAnalyticsData();

  const clients = data?.clients ?? [];
  const sessions = data?.sessions ?? [];
  const vols = data?.sessionExerciseVolumes ?? [];
  const payments = data?.payments ?? [];

  const active = useMemo(() => activeClientsNow(clients), [clients]);
  const donut = useMemo(() => subscriptionDonut(clients), [clients]);
  const rev12 = useMemo(() => monthlyRevenueSeries(payments, 12), [payments]);
  const mrr = useMemo(() => projectedMRR(clients), [clients]);
  const leaderboard = useMemo(() => leaderboardRows(clients, sessions, vols), [clients, sessions, vols]);
  const sortedBoard = useMemo(
    () => [...leaderboard].sort((a, b) => b.compliance - a.compliance),
    [leaderboard]
  );
  const churn = useMemo(() => churnLastMonth(clients), [clients]);
  const growth = useMemo(() => activeClientsByMonth(clients, 12), [clients]);
  const heatAll = useMemo(() => heatmapAllClients(sessions, 180), [sessions]);

  const spark7 = useMemo(() => {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    return days.map((day) => ({
      day,
      n: sessions.filter((s) => s.started_at.slice(0, 10) === day).length,
    }));
  }, [sessions]);

  const atRiskInactive = useMemo(
    () =>
      clients.filter((c) => {
        const d = Math.ceil((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000);
        return d >= 3;
      }),
    [clients]
  );

  const atRiskLow = useMemo(
    () => leaderboard.filter((r) => r.compliance < 60).slice(0, 8),
    [leaderboard]
  );

  const expiring = useMemo(
    () =>
      clients.filter((c) => {
        const days = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
        return days >= 0 && days <= 7;
      }),
    [clients]
  );

  const top = sortedBoard[0];

  return (
    <div className="space-y-8">
      {/* Summary sparkline cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SparkCard title="العملاء النشطون (اشتراك ساري)" value={active.length} sub={`إجمالي السجلات: ${clients.length}`} data={growth.slice(-7)} dataKey="count" loading={isLoading} />
        <SparkCard
          title="الإيراد الشهري المتوقع (MRR)"
          value={`${Math.round(mrr)}`}
          suffix="ر.س"
          sub="مجموع أسعار الاشتراك للعملاء النشطين"
          data={rev12.slice(-7)}
          dataKey="amount"
          loading={isLoading}
        />
        <SparkCard
          title="جلسات مكتملة (٧ أيام)"
          value={sessions.filter((s) => new Date(s.started_at) >= new Date(Date.now() - 7 * 86400000)).length}
          sub="من سجل التمارين"
          data={spark7}
          dataKey="n"
          loading={isLoading}
        />
        <div className="rounded-2xl border border-[hsl(0_0%_12%)] bg-[#111] p-5">
          <p className="text-xs text-white/50">معدل الالتزام (تقريبي)</p>
          <p className="mt-2 text-3xl font-black text-white">
            {clients.length ? Math.round(sortedBoard.reduce((s, r) => s + r.compliance, 0) / clients.length) : 0}%
          </p>
          <p className="mt-1 text-xs text-white/40">بحسب آخر نشاط</p>
        </div>
      </div>

      {/* At-risk */}
      <div className="rounded-2xl border border-amber-500/25 bg-[#0d0d0d] p-5">
        <div className="mb-4 flex items-center gap-2 text-amber-500">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
          <h3 className="text-lg font-bold text-white">يحتاج متابعة</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <AtRiskList
            title="لم يتدرب 3+ أيام"
            rows={atRiskInactive.slice(0, 6).map((c) => ({ id: c.id, name: c.name, phone: c.phone || "", hint: `${Math.ceil((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000)} يوماً` }))}
          />
          <AtRiskList
            title='التزام أسبوعي أقل من 60%'
            rows={atRiskLow.map((r) => ({
              id: r.id,
              name: r.name,
              phone: clients.find((c) => c.id === r.id)?.phone || "",
              hint: `${r.compliance}%`,
            }))}
          />
          <AtRiskList
            title="اشتراك ينتهي خلال 7 أيام"
            rows={expiring.slice(0, 6).map((c) => ({
              id: c.id,
              name: c.name,
              phone: c.phone || "",
              hint: new Date(c.subscription_end_date).toLocaleDateString("ar-SA"),
            }))}
          />
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-[hsl(0_0%_12%)] bg-[#111] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
          <Crown className="h-5 w-5 text-amber-400" />
          لوحة المتصدرين
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="p-2">#</th>
                <th className="p-2">العميل</th>
                <th className="p-2">الالتزام (تقريبي)</th>
                <th className="p-2">الحجم (الشهر)</th>
                <th className="p-2">السلسلة</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {sortedBoard.map((row, i) => (
                <tr key={row.id} className={`border-b border-white/5 ${i === 0 ? "bg-emerald-500/10" : ""}`}>
                  <td className="p-2">{i === 0 ? "🏆" : i + 1}</td>
                  <td className="p-2 font-medium text-white">{row.name}</td>
                  <td className="p-2 tabular-nums">{row.compliance}%</td>
                  <td className="p-2 tabular-nums">{Math.round(row.volumeMonth)}</td>
                  <td className="p-2 tabular-nums">{row.streak}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
                      <Link to={`/clients/${row.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedBoard.length === 0 && !isLoading ? (
            <p className="py-8 text-center text-white/45">لا توجد بيانات كافية</p>
          ) : null}
        </div>
        {top ? <p className="mt-3 text-xs text-white/45">أفضل أداء التزام هذا الشهر: {top.name}</p> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="الإيرادات الشهرية (مدفوعات محققة)" description="آخر 12 شهراً" fileName="trainer-revenue-bars" loading={isLoading} empty={payments.length === 0}>
          <div className="h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rev12} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                <Bar dataKey="amount" fill={GREEN} name="المدفوعات" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="amount" stroke="#15803d" strokeWidth={2} dot={false} name="اتجاه" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-white/45">المتكرر من اشتراكات العملاء النشطين تقريباً: {Math.round(mrr)} ر.س / شهر</p>
        </ChartCard>

        <ChartCard title="حالة الاشتراكات" fileName="trainer-sub-donut" loading={isLoading} empty={clients.length === 0}>
          <div className="h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2}>
                  {donut.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-2xl font-black text-white">{clients.length}</p>
          <p className="text-center text-xs text-white/45">إجمالي العملاء</p>
        </ChartCard>
      </div>

      <ChartCard
        title="قيمة العملاء الشهرية (اشتراك)"
        description="ترتيب حسب سعر الاشتراك للمشتركين النشطين"
        fileName="trainer-client-value"
        loading={isLoading}
        empty={active.length === 0}
      >
        <div className="h-[320px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={[...active].sort((a, b) => b.subscription_price - a.subscription_price).slice(0, 12).map((c) => ({ name: c.name, v: c.subscription_price }))}
              margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" tick={{ fill: "#888", fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#aaa", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
              <Bar dataKey="v" fill={GREEN} radius={[0, 4, 4, 0]} name="ر.س" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="نمو العملاء النشطين (تقدير شهري)" description="عدد من يملكون اشتراكاً سارياً في نهاية كل شهر" fileName="trainer-growth" loading={isLoading} empty={clients.length === 0}>
          <div className="h-[280px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#888", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                <Line type="monotone" dataKey="count" stroke={GREEN} strokeWidth={2} name="نشط" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-white/45">
            هجران تقريبي (اشتراكات انتهت الشهر الماضي): {churn.churned} — {churn.rate}%
          </p>
        </ChartCard>

        <ChartCard title="خريطة التمارين (جميع العملاء)" description="180 يوماً" fileName="trainer-heat" loading={isLoading} empty={heatAll.size === 0}>
          <TrainerHeatmap map={heatAll} />
        </ChartCard>
      </div>
    </div>
  );
}

function SparkCard({
  title,
  value,
  suffix,
  sub,
  data,
  dataKey,
  loading,
}: {
  title: string;
  value: string | number;
  suffix?: string;
  sub: string;
  data: { [k: string]: string | number }[];
  dataKey: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(0_0%_12%)] bg-[#111] p-5">
      <p className="text-xs text-white/50">{title}</p>
      <p className="mt-2 text-3xl font-black text-white tabular-nums">
        {value}
        {suffix ? <span className="mr-1 text-lg font-medium text-white/60">{suffix}</span> : null}
      </p>
      <p className="mt-1 text-xs text-white/35">{sub}</p>
      <div className="mt-3 h-[48px]" dir="ltr">
        {loading ? null : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <Area type="monotone" dataKey={dataKey} stroke={GREEN} fill={GREEN} fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function AtRiskList({ title, rows }: { title: string; rows: { id: string; name: string; phone: string; hint: string }[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-white/80">{title}</p>
      <ul className="space-y-2">
        {rows.length === 0 ? <li className="text-xs text-white/35">لا يوجد</li> : null}
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-2 text-xs">
            <div>
              <span className="font-medium text-white">{r.name}</span>
              <span className="mr-2 text-white/45">{r.hint}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href={formatWhatsApp(r.phone)} target="_blank" rel="noreferrer" aria-label="واتساب">
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to={`/clients/${r.id}`}>
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrainerHeatmap({ map }: { map: Map<string, number> }) {
  const cells = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 180);
    const list: { key: string; count: number }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      list.push({ key, count: map.get(key) ?? 0 });
    }
    return list;
  }, [map]);
  const max = Math.max(...cells.map((c) => c.count), 1);
  return (
    <div className="flex flex-wrap gap-[3px]">
      {cells.map((c) => {
        const intensity = c.count === 0 ? 0 : 0.2 + (c.count / max) * 0.8;
        const bg = c.count === 0 ? "#1a1a1a" : `rgba(34, 197, 94, ${intensity})`;
        return <div key={c.key} title={`${c.key}: ${c.count}`} className="h-3 w-3 rounded-sm" style={{ background: bg }} />;
      })}
    </div>
  );
}
