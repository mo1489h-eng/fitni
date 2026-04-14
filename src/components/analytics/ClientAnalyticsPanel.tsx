import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Bar,
  BarChart,
  ComposedChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Cell,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { FitnessRings } from "./FitnessRings";
import {
  useClientAnalyticsData,
  filterRowsByRange,
  buildStrengthSeries,
  volumeBySession,
  muscleVolumeByMonth,
  repPerformanceBySession,
  weeklyCompliance,
  dayVolumeMap,
  weekdayCounts,
} from "@/hooks/useClientAnalyticsData";
import type { TimeRangeKey } from "@/lib/analytics/calculations";
import { MUSCLE_BUCKETS_AR, bucketsList, type MuscleBucket } from "@/lib/analytics/muscleBuckets";
import { toYmd, streakStats } from "@/lib/analytics/calculations";
import { Flame, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GREEN = "#22C55E";
const PALETTE = ["#22C55E", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"] as const;

const WEEKDAY_SHORT_AR = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

export function ClientAnalyticsPanel({ clientId }: { clientId: string }) {
  const { data, isLoading } = useClientAnalyticsData(clientId);
  const [range, setRange] = useState<TimeRangeKey>("3m");
  const [selectedEx, setSelectedEx] = useState<string[]>([]);

  const rowsFiltered = useMemo(() => {
    if (!data) return [];
    return filterRowsByRange(data.sessionExerciseRows, range);
  }, [data, range]);

  const workoutDays = useMemo(() => {
    const set = new Set<string>();
    rowsFiltered.forEach((r) => set.add(toYmd(new Date(r.session_started_at))));
    return set;
  }, [rowsFiltered]);

  const workoutDaysAll = useMemo(() => {
    const set = new Set<string>();
    (data?.sessionExerciseRows ?? []).forEach((r) => set.add(toYmd(new Date(r.session_started_at))));
    return set;
  }, [data?.sessionExerciseRows]);

  const strength = useMemo(() => buildStrengthSeries(rowsFiltered, null), [rowsFiltered]);
  const exerciseIds = useMemo(() => [...strength.byExercise.keys()].slice(0, 12), [strength]);

  useEffect(() => {
    if (exerciseIds.length && selectedEx.length === 0) {
      setSelectedEx(exerciseIds.slice(0, 3));
    }
  }, [exerciseIds, selectedEx.length, exerciseIds.join()]);

  const strengthChartData = useMemo(() => {
    const dates = new Set<string>();
    selectedEx.forEach((id) => strength.byExercise.get(id)?.forEach((p) => dates.add(p.date)));
    const sorted = [...dates].sort();
    return sorted.map((date) => {
      const row: Record<string, string | number | boolean | null> = { date };
      selectedEx.forEach((id) => {
        const pt = strength.byExercise.get(id)?.find((p) => p.date === date);
        row[`w_${id}`] = pt?.weight ?? null;
        row[`pr_${id}`] = !!pt?.isPr;
      });
      return row;
    });
  }, [strength, selectedEx]);

  const volSeries = useMemo(() => volumeBySession(rowsFiltered), [rowsFiltered]);
  const repSeries = useMemo(() => repPerformanceBySession(rowsFiltered), [rowsFiltered]);
  const muscleNow = useMemo(() => muscleVolumeByMonth(data?.sessionExerciseRows ?? [], 0), [data?.sessionExerciseRows]);
  const musclePrev = useMemo(() => muscleVolumeByMonth(data?.sessionExerciseRows ?? [], 1), [data?.sessionExerciseRows]);
  const compliance = useMemo(
    () => weeklyCompliance(data?.trainerSessions ?? [], workoutDaysAll, 13),
    [data?.trainerSessions, workoutDaysAll],
  );

  const streak = useMemo(() => {
    const days = [...workoutDays].sort();
    return streakStats(days);
  }, [workoutDays]);

  const heatmapDays = useMemo(() => dayVolumeMap(rowsFiltered), [rowsFiltered]);
  const weekdayData = useMemo(() => weekdayCounts(rowsFiltered), [rowsFiltered]);

  const volByDay = useMemo(() => {
    const m = new Map<string, number>();
    volSeries.forEach((v) => {
      m.set(v.date, (m.get(v.date) ?? 0) + v.volume);
    });
    return m;
  }, [volSeries]);

  const radarData = useMemo(() => {
    return bucketsList().map((b: MuscleBucket) => ({
      subject: MUSCLE_BUCKETS_AR[b],
      current: muscleNow[b],
      previous: musclePrev[b],
    }));
  }, [muscleNow, musclePrev]);

  const ringMetrics = useMemo(() => {
    const compliancePct = compliance.length
      ? Math.round(compliance.slice(-4).reduce((s, x) => s + x.pct, 0) / Math.min(4, compliance.length))
      : 0;
    const cutoff = Date.now() - 30 * 86400000;
    let days30 = 0;
    workoutDays.forEach((d) => {
      if (new Date(d + "T12:00:00").getTime() >= cutoff) days30 += 1;
    });
    const attendancePct = Math.min(100, Math.round((days30 / 30) * 100));
    const now = new Date();
    let cur = 0;
    let prev = 0;
    volSeries.forEach((v) => {
      const d = new Date(v.date + "T12:00:00");
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) cur += v.volume;
      const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      if (d.getMonth() === pm && d.getFullYear() === py) prev += v.volume;
    });
    const base = Math.max(prev, 1);
    const volumePct = Math.min(100, Math.round((cur / base) * 70 + 15));
    return { compliancePct, attendancePct, volumePct };
  }, [compliance, workoutDays, volSeries]);

  const maxVol = Math.max(...volSeries.map((v) => v.volume), 1);
  const volBar = volSeries.map((v) => ({
    ...v,
    intensity: Math.round((v.volume / maxVol) * 100),
  }));
  const volBarDisplay = useMemo(() => volBar.slice(-40), [volBar]);

  const emptyStrength = strengthChartData.length === 0 || selectedEx.length === 0;
  const ringsEmpty = rowsFiltered.length === 0;
  const ringCenter = ringsEmpty
    ? "—"
    : `${Math.round((ringMetrics.compliancePct + ringMetrics.attendancePct + ringMetrics.volumePct) / 3)}%`;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12px] text-[#6b7280]">الفترة:</span>
        <Select value={range} onValueChange={(v) => setRange(v as TimeRangeKey)}>
          <SelectTrigger className="w-[200px] border-white/10 bg-[#0a0a0a] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4w">آخر 4 أسابيع</SelectItem>
            <SelectItem value="3m">آخر 3 أشهر</SelectItem>
            <SelectItem value="6m">آخر 6 أشهر</SelectItem>
            <SelectItem value="all">كل الوقت</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[rgba(255,255,255,0.03)] p-6 shadow-sm backdrop-blur-md">
        <h3 className="text-xl font-semibold text-white">حلقات الأداء</h3>
        <p className="mt-1 text-[12px] text-[#6b7280]">التزام أسبوعي، حضور ٣٠ يوماً، وحجم التدريب مقارنة بالشهر الماضي</p>
        <div className="mt-6">
          <FitnessRings
            compliance={ringMetrics.compliancePct}
            attendance={ringMetrics.attendancePct}
            volume={ringMetrics.volumePct}
            centerLabel={ringCenter}
            subLabel="متوسط الأداء"
            size={220}
            empty={ringsEmpty}
          />
        </div>
      </div>

      <ChartCard
        title="تقدّم الأوزان حسب التمرين"
        description="مناطق متدرجة تحت المنحنيات؛ ⭐ عند رقم قياسي — اضغط pills لإظهار/إخفاء التمرين"
        fileName={`strength-${clientId}`}
        loading={isLoading}
        empty={emptyStrength}
      >
        <div className="mb-4 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {exerciseIds.map((id, idx) => {
            const on = selectedEx.includes(id);
            const col = PALETTE[idx % PALETTE.length];
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setSelectedEx((s) => {
                    if (on) {
                      const next = s.filter((x) => x !== id);
                      return next.length === 0 ? s : next;
                    }
                    return [...s, id];
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  on ? "text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : "border-white/10 text-white/45 hover:border-white/20"
                }`}
                style={
                  on
                    ? { borderColor: `${col}66`, background: `${col}18` }
                    : { borderColor: "rgba(255,255,255,0.06)" }
                }
              >
                {strength.exerciseNames.get(id)}
              </button>
            );
          })}
        </div>
        <div className="h-[340px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={strengthChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                {selectedEx.map((id, idx) => (
                  <linearGradient key={id} id={`strength-grad-${clientId}-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE[idx % PALETTE.length]} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PALETTE[idx % PALETTE.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: "كغ", angle: -90, position: "insideLeft", fill: "#6b7280" }}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(17,17,17,0.95)",
                  border: "1px solid #222",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "#fff" }}
                formatter={(v: number, name: string) => [v != null ? `${v} كغ` : "-", String(name).replace(/^w_/, "")]}
              />
              <Legend />
              {selectedEx.map((id, idx) => (
                <Area
                  key={`a-${id}`}
                  type="monotone"
                  dataKey={`w_${id}`}
                  stroke="none"
                  fill={`url(#strength-grad-${clientId}-${id})`}
                  legendType="none"
                  isAnimationActive
                  animationDuration={1000}
                  animationEasing="ease-out"
                  connectNulls
                />
              ))}
              {selectedEx.map((id, idx) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={`w_${id}`}
                  name={strength.exerciseNames.get(id) ?? id}
                  stroke={PALETTE[idx % PALETTE.length]}
                  strokeWidth={2}
                  connectNulls
                  isAnimationActive
                  animationDuration={1000}
                  animationEasing="ease-out"
                  activeDot={{ r: 5 }}
                  dot={(props: { cx?: number; cy?: number; payload?: Record<string, unknown> }) => {
                    const prKey = `pr_${id}`;
                    const isPr = !!props.payload?.[prKey];
                    if (props.cx == null || props.cy == null) return null;
                    if (isPr) {
                      return (
                        <text
                          x={props.cx}
                          y={props.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={13}
                          className="drop-shadow-[0_0_8px_rgba(245,158,11,0.85)]"
                        >
                          ⭐
                        </text>
                      );
                    }
                    return <circle cx={props.cx} cy={props.cy} r={3} fill={PALETTE[idx % PALETTE.length]} />;
                  }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="حجم التدريب لكل جلسة"
        description="الحجم = الوزن × التكرارات لكل مجموعة"
        fileName={`volume-${clientId}`}
        loading={isLoading}
        empty={volBar.length === 0}
      >
        <div className="h-[300px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={volBarDisplay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #222", borderRadius: 12 }}
              />
              <Bar dataKey="volume" name="الحجم" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900}>
                {volBarDisplay.map((entry, index) => (
                  <Cell key={`c-${index}`} fill={`rgba(34, 197, 94, ${0.35 + (entry.intensity / 100) * 0.65})`} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="volume" stroke="#15803d" strokeWidth={2} dot={false} name="اتجاه" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[12px] text-[#6b7280]">
          مقارنة الأحجام تساعد على كشف الإفراط أو قلة الحجم عن مدة سابقة (استخدم الفترة أعلاه).
        </p>
      </ChartCard>

      <ChartCard
        title="توازن العضلات"
        description="حجم التدريب هذا الشهر مقابل الشهر الماضي"
        fileName={`radar-${clientId}`}
        loading={isLoading}
        empty={rowsFiltered.length < 3}
      >
        <div className="analytics-radar-pop mx-auto h-[400px] w-full max-w-[520px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="52%" outerRadius="80%">
              <PolarGrid stroke="#ffffff14" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Radar
                name="الشهر الحالي"
                dataKey="current"
                stroke={GREEN}
                fill={GREEN}
                fillOpacity={0.3}
                isAnimationActive
                animationDuration={1000}
                animationEasing="ease-out"
              />
              <Radar
                name="الشهر الماضي"
                dataKey="previous"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.15}
                isAnimationActive
                animationDuration={1000}
                animationEasing="ease-out"
              />
              <Legend
                wrapperStyle={{ paddingTop: 16 }}
                formatter={(value) => <span className="text-[#d1d5db]">{value}</span>}
              />
              <Tooltip contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #222", borderRadius: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm">
          <span className="flex items-center gap-2 text-[#d1d5db]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" /> الشهر الحالي
          </span>
          <span className="flex items-center gap-2 text-[#d1d5db]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" /> الشهر الماضي
          </span>
        </div>
      </ChartCard>

      <ChartCard
        title="أداء التكرارات مقابل المخطط"
        description="≥100% يقترح زيادة الوزن تدريجياً، دون 80% قد يحتاج تخفيفاً"
        fileName={`reps-${clientId}`}
        loading={isLoading}
        empty={repSeries.length === 0}
      >
        <div className="h-[280px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={repSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 200]} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <ReferenceLine y={100} stroke="#22C55E" strokeDasharray="4 4" opacity={0.6} />
              <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" opacity={0.6} />
              <Tooltip contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #222", borderRadius: 12 }} />
              <Line
                type="monotone"
                dataKey="pct"
                stroke={GREEN}
                strokeWidth={2}
                dot={{ r: 3 }}
                name="%"
                isAnimationActive
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="خريطة الحضور (٦ أشهر)"
        description="الشدة حسب التمارين في اليوم؛ ⭐ اليوم بأعلى حجم تقريبي"
        fileName={`heat-${clientId}`}
        loading={isLoading}
        empty={heatmapDays.size === 0}
      >
        <PremiumClientHeatmap dayMap={heatmapDays} volByDay={volByDay} />
      </ChartCard>

      <ChartCard
        title="الالتزام الأسبوعي"
        description="من الجدولة أو مقارنة حضور تقريبية"
        fileName={`compliance-${clientId}`}
        loading={isLoading}
        empty={compliance.length === 0}
      >
        <div className="h-[260px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={compliance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ffffff08" />
              <XAxis dataKey="weekStart" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <ReferenceLine y={80} stroke="#eab308" strokeDasharray="4 4" opacity={0.6} />
              <Tooltip contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #222", borderRadius: 12 }} />
              <Line
                type="monotone"
                dataKey="pct"
                stroke={GREEN}
                strokeWidth={2}
                name="%"
                isAnimationActive
                animationDuration={1000}
                dot={(p: { cx: number; cy: number; payload: { pct: number } }) =>
                  p.payload.pct < 80 ? (
                    <circle cx={p.cx} cy={p.cy} r={4} fill="#ef4444" />
                  ) : (
                    <circle cx={p.cx} cy={p.cy} r={3} fill={GREEN} />
                  )
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <Flame className="mx-auto mb-2 h-8 w-8 text-orange-500" />
          <p className="text-[12px] text-[#6b7280]">السلسلة الحالية</p>
          <p className="text-3xl font-black text-white">{streak.current}</p>
          <p className="text-xs text-[#6b7280]">يوماً</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 text-[#22C55E]" />
          <p className="text-[12px] text-[#6b7280]">أطول سلسلة</p>
          <p className="text-3xl font-black text-white">{streak.longest}</p>
          <p className="text-xs text-[#6b7280]">يوماً</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-[12px] text-[#6b7280]">معالم</p>
          <p className="mt-2 text-sm text-[#d1d5db]">7 • 30 • 100 يوماً متتالياً</p>
        </div>
      </div>

      <ChartCard
        title="تاريخ السلاسل"
        description="طول كل فترة تتابع فيها أيام التمرين"
        fileName={`streaks-${clientId}`}
        loading={isLoading}
        empty={streak.history.length === 0}
      >
        <div className="h-[220px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={streak.history.map((h, i) => ({ name: `#${i + 1}`, len: h.len, start: h.start }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #222", borderRadius: 12 }} />
              <Bar dataKey="len" fill={GREEN} name="أيام" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="توزيع أيام التمرين"
        description="أي يوم في الأسبوع يتدرب فيه أكثر"
        fileName={`weekday-${clientId}`}
        loading={isLoading}
        empty={weekdayData.every((d) => d.count === 0)}
      >
        <div className="h-[240px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ffffff08" />
              <XAxis dataKey="nameAr" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #222", borderRadius: 12 }} />
              <Bar dataKey="count" fill={GREEN} name="جلسات" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

function PremiumClientHeatmap({ dayMap, volByDay }: { dayMap: Map<string, number>; volByDay: Map<string, number> }) {
  const { weekCols, monthLabels } = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - 179);
    const d0 = new Date(start);
    while (d0.getDay() !== 0) d0.setDate(d0.getDate() - 1);

    const days: { key: string; count: number; vol: number }[] = [];
    for (let d = new Date(d0); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toYmd(d);
      days.push({
        key,
        count: dayMap.get(key) ?? 0,
        vol: volByDay.get(key) ?? 0,
      });
    }
    const maxVol = Math.max(...days.map((x) => x.vol), 1);
    const prThresh = maxVol * 0.92;
    const enriched = days.map((x) => ({ ...x, isPr: x.vol >= prThresh && x.vol > 0 }));
    while (enriched.length % 7 !== 0) {
      enriched.push({ key: `pad-${enriched.length}`, count: 0, vol: 0, isPr: false });
    }

    const cols: (typeof enriched)[] = [];
    for (let i = 0; i < enriched.length; i += 7) {
      cols.push(enriched.slice(i, i + 7));
    }

    const labels: string[] = cols.map((col, ci) => {
      const mid = col[3] ?? col[0];
      if (!mid) return "";
      const dt = new Date(mid.key + "T12:00:00");
      const prevMid = ci > 0 ? cols[ci - 1][3] ?? cols[ci - 1][0] : null;
      if (prevMid) {
        const p = new Date(prevMid.key + "T12:00:00");
        if (dt.getMonth() !== p.getMonth()) {
          return dt.toLocaleDateString("ar-SA", { month: "short" });
        }
      } else if (dt.getDate() <= 7) {
        return dt.toLocaleDateString("ar-SA", { month: "short" });
      }
      return "";
    });

    return { weekCols: cols, monthLabels: labels };
  }, [dayMap, volByDay]);

  const max = Math.max(...[...dayMap.values()], 1);

  return (
    <div className="w-full overflow-x-auto" dir="ltr">
      <div className="flex min-w-0 gap-2 pb-2">
        <div className="flex shrink-0 flex-col justify-between pt-6 text-[10px] leading-none text-[#6b7280]">
          {WEEKDAY_SHORT_AR.map((label) => (
            <span key={label} className="flex h-3 items-center">
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {weekCols.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              <span className="mb-0.5 h-3 text-center text-[9px] text-[#6b7280]">{monthLabels[wi] || "\u00a0"}</span>
              {week.map((c, di) => {
                const isPad = c.key.startsWith("pad-");
                let bg = "#1a1a1a";
                if (!isPad && (c.vol > 0 || c.count > 0)) {
                  if (c.isPr) bg = "#F59E0B";
                  else {
                    const r = c.count / max;
                    bg = r < 0.33 ? "#166534" : r < 0.66 ? "#16a34a" : "#22c55e";
                  }
                }
                return (
                  <div
                    key={`${c.key}-${wi}-${di}`}
                    title={isPad ? undefined : `${c.key} — ${c.count} تمرين — ${Math.round(c.vol)} حجم`}
                    className={`h-3 w-3 rounded-[3px] ${isPad ? "opacity-0" : "analytics-heat-cell transition-transform hover:z-10 hover:scale-125 hover:shadow-[0_0_12px_rgba(34,197,94,0.35)]"}`}
                    style={{
                      background: bg,
                      boxShadow: !isPad && c.isPr ? "0 0 8px rgba(245, 158, 11, 0.35)" : undefined,
                      animationDelay: isPad ? undefined : `${Math.min(wi * 7 + di, 80) * 3}ms`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
