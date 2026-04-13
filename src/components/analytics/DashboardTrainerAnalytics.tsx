import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { FitnessRings } from "./FitnessRings";
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
import { MessageCircle, Eye, ArrowUpDown, X, CheckCircle2 } from "lucide-react";
import { formatWhatsApp } from "@/lib/analytics/formatWhatsApp";

const GREEN = "#22C55E";

type SortKey = "compliance" | "volumeMonth" | "streak";
type RevTab = "1m" | "3m" | "6m" | "12m";

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(n) + " ريال";

export function DashboardTrainerAnalytics() {
  const { data, isLoading } = useTrainerAnalyticsData();
  const navigate = useNavigate();

  const clients = data?.clients ?? [];
  const sessions = data?.sessions ?? [];
  const vols = data?.sessionExerciseVolumes ?? [];
  const payments = data?.payments ?? [];

  const active = useMemo(() => activeClientsNow(clients), [clients]);
  const donut = useMemo(() => subscriptionDonut(clients), [clients]);
  const mrr = useMemo(() => projectedMRR(clients), [clients]);
  const leaderboard = useMemo(() => leaderboardRows(clients, sessions, vols), [clients, sessions, vols]);
  const churn = useMemo(() => churnLastMonth(clients), [clients]);
  const growth = useMemo(() => activeClientsByMonth(clients, 12), [clients]);
  const heatAll = useMemo(() => heatmapAllClients(sessions, 180), [sessions]);

  const [revTab, setRevTab] = useState<RevTab>("12m");
  const revMonths = revTab === "1m" ? 1 : revTab === "3m" ? 3 : revTab === "6m" ? 6 : 12;
  const revSeries = useMemo(() => monthlyRevenueSeries(payments, revMonths), [payments, revMonths]);

  const complianceAvg = clients.length
    ? Math.round(leaderboard.reduce((s, r) => s + r.compliance, 0) / clients.length)
    : 0;

  const attendancePct = useMemo(() => {
    const set = new Set<string>();
    const cutoff = Date.now() - 30 * 86400000;
    sessions.forEach((s) => {
      const t = new Date(s.started_at).getTime();
      if (t >= cutoff) set.add(new Date(s.started_at).toISOString().slice(0, 10));
    });
    return Math.min(100, Math.round((set.size / 30) * 100));
  }, [sessions]);

  const volMonth = useMemo(() => {
    const now = new Date();
    let cur = 0;
    let prev = 0;
    vols.forEach((v) => {
      const d = new Date(v.started_at);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) cur += v.volume;
      const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      if (d.getMonth() === pm && d.getFullYear() === py) prev += v.volume;
    });
    const base = Math.max(prev, 1);
    return Math.min(100, Math.round((cur / base) * 70 + 15));
  }, [vols]);

  const [sortKey, setSortKey] = useState<SortKey>("compliance");
  const [sortAsc, setSortAsc] = useState(false);
  const sortedBoard = useMemo(() => {
    const rows = [...leaderboard];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [leaderboard, sortKey, sortAsc]);

  const atRiskInactive = useMemo(
    () =>
      clients
        .filter((c) => Math.ceil((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000) >= 3)
        .map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          kind: "inactive" as const,
          hint: `${Math.ceil((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000)} يوماً دون تمرين`,
        })),
    [clients]
  );
  const atRiskLow = useMemo(
    () =>
      leaderboard
        .filter((r) => r.compliance < 60)
        .map((r) => ({
          id: r.id,
          name: r.name,
          phone: clients.find((c) => c.id === r.id)?.phone || "",
          kind: "low" as const,
          hint: `التزام ${r.compliance}%`,
        })),
    [leaderboard, clients]
  );
  const atRiskExp = useMemo(
    () =>
      clients
        .filter((c) => {
          const days = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
          return days >= 0 && days <= 7;
        })
        .map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          kind: "exp" as const,
          hint: `ينتهي ${new Date(c.subscription_end_date).toLocaleDateString("ar-SA")}`,
        })),
    [clients]
  );

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dismiss = (k: string) => setDismissed((d) => new Set([...d, k]));

  useEffect(() => {
    setDismissed(new Set());
  }, [clients.length]);

  const allAlerts = useMemo(
    () =>
      [
        ...atRiskInactive.map((x) => ({ ...x, key: `inactive-${x.id}` })),
        ...atRiskLow.map((x) => ({ ...x, key: `low-${x.id}` })),
        ...atRiskExp.map((x) => ({ ...x, key: `exp-${x.id}` })),
      ].filter((a) => !dismissed.has(a.key)),
    [atRiskInactive, atRiskLow, atRiskExp, dismissed]
  );

  const top = sortedBoard[0];

  return (
    <div className="space-y-12 bg-[#0A0A0A] py-2">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">نظرة تحليلية</h2>
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <div className="rounded-3xl border border-white/[0.06] bg-[#111111] p-8">
            <p className="mb-6 text-center text-[12px] uppercase tracking-[0.2em] text-[#6b7280]">مؤشر الأداء</p>
            <FitnessRings
              compliance={complianceAvg}
              attendance={attendancePct}
              volume={volMonth}
              centerLabel={`${complianceAvg}%`}
              subLabel="متوسط التزام الفريق"
              size={220}
              empty={!clients.length}
            />
          </div>
          <div className="min-h-[120px] space-y-3">
            <p className="text-sm leading-relaxed text-[#9ca3af]">
              الحلقات الخارجية والوسطى والداخلية تعكس التزاماً تقريبياً، وانتظام الحضور خلال 30 يوماً، ونسبة حجم التدريب مقارنة بالشهر السابق. البيانات من جلسات التمرين المسجّلة في المنصة.
            </p>
            {top ? (
              <p className="text-sm text-[#d1d5db]">
                أفضل متدرب من حيث الالتزام: <span className="font-semibold text-emerald-400">{top.name}</span>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Revenue — Stripe style */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">الإيرادات</h2>
            <p className="mt-1 text-[12px] text-[#6b7280]">مدفوعات محققة — متوسط شهري تقريبي: {fmtMoney(Math.round(mrr))}</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.08] bg-[#111111] p-1">
            {(
              [
                ["1m", "هذا الشهر"],
                ["3m", "3 أشهر"],
                ["6m", "6 أشهر"],
                ["12m", "سنة"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRevTab(k)}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-all duration-300 ${
                  revTab === k ? "bg-white/[0.08] text-white shadow-sm" : "text-[#6b7280] hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-white/[0.06] bg-[#111111] p-6">
          {isLoading ? (
            <div className="analytics-shimmer h-[320px] rounded-2xl" />
          ) : payments.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#6b7280]">لا توجد بيانات كافية</p>
          ) : (
            <div className="h-[320px] w-full animate-in fade-in duration-700" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revSeries} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => new Intl.NumberFormat("ar-SA").format(Number(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(17,17,17,0.95)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                    }}
                    formatter={(value: number) => [fmtMoney(value), "المدفوعات"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke={GREEN} strokeWidth={2.5} fill="url(#revFill)" isAnimationActive animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Alerts */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">تنبيهات المتابعة</h2>
        {allAlerts.length === 0 ? (
          <div className="flex items-center justify-center gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] px-6 py-12 text-emerald-400/90">
            <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
            <span className="text-base font-medium">جميع عملاؤك بخير</span>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {allAlerts.map((a) => {
              const border =
                a.kind === "inactive" ? "border-l-[#EF4444]" : a.kind === "low" ? "border-l-[#F59E0B]" : "border-l-[#3B82F6]";
              const initials = a.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div
                  key={a.key}
                  className={`analytics-alert-in group relative overflow-hidden rounded-2xl border border-white/[0.06] border-l-4 bg-[#111111] p-5 ${border} shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)]`}
                >
                  <button
                    type="button"
                    className="absolute left-3 top-3 rounded-lg p-1 text-[#6b7280] opacity-70 transition hover:bg-white/10 hover:opacity-100"
                    aria-label="إخفاء"
                    onClick={() => dismiss(a.key)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-start gap-4 pr-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5 text-sm font-bold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{a.name}</p>
                      <p className="mt-1 text-[13px] text-[#9ca3af]">{a.hint}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10" asChild>
                      <a href={formatWhatsApp(a.phone)} target="_blank" rel="noreferrer">
                        <MessageCircle className="ml-1 h-4 w-4" strokeWidth={1.5} />
                        واتساب
                      </a>
                    </Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" asChild>
                      <Link to={`/clients/${a.id}`}>
                        <Eye className="ml-1 h-4 w-4" strokeWidth={1.5} />
                        عرض الملف
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">لوحة المتصدرين</h2>
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111111]">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[12px] uppercase tracking-wide text-[#6b7280]">
                  <th className="px-5 py-4">مركز</th>
                  <th className="px-5 py-4">المتدرب</th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[#9ca3af] hover:text-white"
                      onClick={() => {
                        if (sortKey === "compliance") setSortAsc(!sortAsc);
                        else {
                          setSortKey("compliance");
                          setSortAsc(false);
                        }
                      }}
                    >
                      الالتزام
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[#9ca3af] hover:text-white"
                      onClick={() => {
                        if (sortKey === "volumeMonth") setSortAsc(!sortAsc);
                        else {
                          setSortKey("volumeMonth");
                          setSortAsc(false);
                        }
                      }}
                    >
                      الحجم الشهري
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="px-5 py-4">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[#9ca3af] hover:text-white"
                      onClick={() => {
                        if (sortKey === "streak") setSortAsc(!sortAsc);
                        else {
                          setSortKey("streak");
                          setSortAsc(false);
                        }
                      }}
                    >
                      السلسلة
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedBoard.map((row, i) => {
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
                  const bgRank = i === 0 ? "from-amber-500/20" : i === 1 ? "from-zinc-400/15" : i === 2 ? "from-amber-700/15" : "from-transparent";
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]"
                      onClick={() => navigate(`/clients/${row.id}`)}
                    >
                      <td className="px-5 py-4 font-medium text-white">{medal}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${bgRank} to-white/5 text-xs font-bold text-white`}
                          >
                            {row.name.slice(0, 2)}
                          </div>
                          <span className="font-medium text-white">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-l from-emerald-600 to-emerald-400"
                              style={{ width: `${Math.min(100, row.compliance)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-[#d1d5db]">{row.compliance}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 tabular-nums text-[#d1d5db]">{Math.round(row.volumeMonth)}</td>
                      <td className="px-5 py-4 tabular-nums text-[#d1d5db]">{row.streak}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedBoard.length === 0 && !isLoading ? (
            <p className="py-12 text-center text-sm text-[#6b7280]">لا توجد بيانات كافية</p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="توزيع الاشتراكات" fileName="trainer-sub-donut" loading={isLoading} empty={clients.length === 0}>
          <div className="h-[280px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={72} outerRadius={102} paddingAngle={2}>
                  {donut.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-2xl font-bold text-white">{clients.length}</p>
          <p className="text-center text-[12px] text-[#6b7280]">إجمالي سجلات العملاء</p>
        </ChartCard>

        <ChartCard title="خريطة النشاط" description="180 يوماً — كل مربع يوم" fileName="trainer-heat" loading={isLoading} empty={heatAll.size === 0}>
          <PremiumHeatmap map={heatAll} vols={vols} />
        </ChartCard>
      </div>

      <ChartCard
        title="قيمة الاشتراك الشهرية"
        description="أعلى العملاء نشاطاً"
        fileName="trainer-client-value"
        loading={isLoading}
        empty={active.length === 0}
      >
        <div className="h-[300px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={[...active].sort((a, b) => b.subscription_price - a.subscription_price).slice(0, 12).map((c) => ({ name: c.name, v: c.subscription_price }))}
              margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #222", borderRadius: 12 }} />
              <Bar dataKey="v" fill={GREEN} radius={[0, 6, 6, 0]} name="ر.س" isAnimationActive animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="النمو التقديري للعملاء النشطين" fileName="trainer-growth" loading={isLoading} empty={clients.length === 0}>
        <div className="h-[260px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growth} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 12 }} />
              <Line type="monotone" dataKey="count" stroke={GREEN} strokeWidth={2.5} dot={false} name="نشط" isAnimationActive animationDuration={1000} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[12px] text-[#6b7280]">
          هجران تقريبي: {churn.churned} اشتراك — {churn.rate}%
        </p>
      </ChartCard>
    </div>
  );
}

/** Premium heatmap with volume-based greens + PR highlight */
function PremiumHeatmap({ map, vols }: { map: Map<string, number>; vols: { started_at: string; volume: number }[] }) {
  const cells = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 180);
    const list: { key: string; count: number; vol: number }[] = [];
    const volByDay = new Map<string, number>();
    vols.forEach((v) => {
      const k = new Date(v.started_at).toISOString().slice(0, 10);
      volByDay.set(k, (volByDay.get(k) ?? 0) + v.volume);
    });
    const maxVol = Math.max(...volByDay.values(), 1);
    const prThresh = maxVol * 0.92;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const vol = volByDay.get(key) ?? 0;
      list.push({ key, count: map.get(key) ?? 0, vol });
    }
    return list.map((c) => ({ ...c, isPr: c.vol >= prThresh && c.vol > 0 }));
  }, [map, vols]);

  const max = Math.max(...cells.map((c) => c.count), 1);

  return (
    <div className="flex flex-wrap gap-[4px]">
      {cells.map((c, idx) => {
        let bg = "#1a1a1a";
        if (c.vol > 0) {
          if (c.isPr) bg = "#F59E0B";
          else {
            const r = c.count / max;
            bg = r < 0.33 ? "#166534" : r < 0.66 ? "#16a34a" : "#22c55e";
          }
        }
        return (
          <div
            key={c.key}
            title={`${c.key} — ${c.vol ? `${Math.round(c.vol)} حجم` : "لا نشاط"}`}
            className="analytics-heat-cell h-3 w-3 rounded-[3px] transition-transform hover:z-10 hover:scale-125 hover:shadow-[0_0_12px_rgba(34,197,94,0.35)]"
            style={{
              background: bg,
              animationDelay: `${Math.min(idx * 2, 400)}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
