import { useEffect, useMemo, useState } from "react";
import {
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
  type TimeRangeKey,
} from "@/hooks/useClientAnalyticsData";
import { MUSCLE_BUCKETS_AR, bucketsList, type MuscleBucket } from "@/lib/analytics/muscleBuckets";
import { toYmd, streakStats } from "@/lib/analytics/calculations";
import { Flame, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const GREEN = "#22C55E";
const MUTED = "#333";

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
    [data?.trainerSessions, workoutDaysAll]
  );

  const streak = useMemo(() => {
    const days = [...workoutDays].sort();
    return streakStats(days);
  }, [workoutDays]);

  const heatmapDays = useMemo(() => dayVolumeMap(rowsFiltered), [rowsFiltered]);
  const weekdayData = useMemo(() => weekdayCounts(rowsFiltered), [rowsFiltered]);

  const radarData = useMemo(() => {
    return bucketsList().map((b: MuscleBucket) => ({
      subject: MUSCLE_BUCKETS_AR[b],
      current: muscleNow[b],
      previous: musclePrev[b],
    }));
  }, [muscleNow, musclePrev]);

  const maxVol = Math.max(...volSeries.map((v) => v.volume), 1);
  const volBar = volSeries.map((v) => ({
    ...v,
    intensity: Math.round((v.volume / maxVol) * 100),
  }));
  const volBarDisplay = useMemo(() => volBar.slice(-40), [volBar]);

  const emptyStrength = strengthChartData.length === 0 || selectedEx.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-white/60">الفترة:</span>
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

      {/* Strength */}
      <ChartCard
        title="تقدّم الأوزان حسب التمرين"
        description="خطوط متعددة؛ النجمة = رقم قياسي شخصي في التمرين"
        fileName={`strength-${clientId}`}
        loading={isLoading}
        empty={emptyStrength}
      >
        <div className="mb-3 max-h-28 space-y-2 overflow-y-auto">
          <p className="text-xs text-white/50">اختر التمارين المعروضة</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {exerciseIds.map((id) => (
              <label key={id} className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
                <Checkbox
                  checked={selectedEx.includes(id)}
                  onCheckedChange={(c) => {
                    if (c === true) setSelectedEx((s) => [...s, id]);
                    else setSelectedEx((s) => s.filter((x) => x !== id));
                  }}
                />
                <span className="truncate">{strength.exerciseNames.get(id)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="h-[320px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={strengthChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={MUTED} />
              <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 10 }} />
              <YAxis tick={{ fill: "#888", fontSize: 10 }} label={{ value: "كغ", angle: -90, position: "insideLeft", fill: "#666" }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #333" }}
                labelStyle={{ color: "#fff" }}
                formatter={(v: number, name: string) => [v != null ? `${v} كغ` : "-", name.replace("w_", "")]}
              />
              <Legend />
              {selectedEx.map((id, idx) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={`w_${id}`}
                  name={strength.exerciseNames.get(id) ?? id}
                  stroke={["#22C55E", "#4ade80", "#86efac", "#eab308", "#38bdf8"][idx % 5]}
                  strokeWidth={2}
                  dot={(props: { cx?: number; cy?: number; payload?: Record<string, unknown> }) => {
                    const prKey = `pr_${id}`;
                    const isPr = !!props.payload?.[prKey];
                    if (props.cx == null || props.cy == null) return null;
                    return (
                      <circle cx={props.cx} cy={props.cy} r={isPr ? 6 : 3} fill={isPr ? "#fbbf24" : ["#22C55E", "#4ade80", "#86efac", "#eab308", "#38bdf8"][idx % 5]} stroke={isPr ? "#fff" : "none"} strokeWidth={isPr ? 1 : 0} />
                    );
                  }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Volume */}
      <ChartCard title="حجم التدريب لكل جلسة" description="الحجم = الوزن × التكرارات لكل مجموعة" fileName={`volume-${clientId}`} loading={isLoading} empty={volBar.length === 0}>
        <div className="h-[300px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={volBarDisplay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={MUTED} />
              <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 10 }} />
              <YAxis tick={{ fill: "#888", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
              <Bar dataKey="volume" name="الحجم" radius={[4, 4, 0, 0]}>
                {volBarDisplay.map((entry, index) => (
                  <Cell key={`c-${index}`} fill={`rgba(34, 197, 94, ${0.35 + (entry.intensity / 100) * 0.65})`} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="volume" stroke="#15803d" strokeWidth={2} dot={false} name="اتجاه" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-white/45">
          مقارنة الأحجام تساعد على كشف الإفراط أو قلة الحجم عن مدة سابقة (استخدم الفترة أعلاه).
        </p>
      </ChartCard>

      {/* Radar */}
      <ChartCard title="توازن العضلات" description="حجم التدريب هذا الشهر مقابل الشهر الماضي" fileName={`radar-${clientId}`} loading={isLoading} empty={rowsFiltered.length < 3}>
        <div className="h-[320px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#aaa", fontSize: 11 }} />
              <Radar name="الشهر الحالي" dataKey="current" stroke={GREEN} fill={GREEN} fillOpacity={0.35} />
              <Radar name="الشهر الماضي" dataKey="previous" stroke="#64748b" fill="#64748b" fillOpacity={0.2} />
              <Legend />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Reps */}
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
              <CartesianGrid strokeDasharray="3 3" stroke={MUTED} />
              <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 10 }} />
              <YAxis domain={[0, 200]} tick={{ fill: "#888", fontSize: 10 }} />
              <ReferenceLine y={100} stroke="#22C55E" strokeDasharray="4 4" label={{ value: "100%", fill: "#666", position: "right" }} />
              <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "80%", fill: "#666", position: "right" }} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
              <Line type="monotone" dataKey="pct" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} name="%" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Heatmap */}
      <ChartCard title="خريطة الحضور (6 أشهر)" description="اللون يعكس عدد التمارين في اليوم" fileName={`heat-${clientId}`} loading={isLoading} empty={heatmapDays.size === 0}>
        <HeatmapGrid dayMap={heatmapDays} />
      </ChartCard>

      {/* Compliance */}
      <ChartCard title="الالتزام الأسبوعي" description="من الجدولة أو مقارنة حضور تقريبية" fileName={`compliance-${clientId}`} loading={isLoading} empty={compliance.length === 0}>
        <div className="h-[260px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={compliance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={MUTED} />
              <XAxis dataKey="weekStart" tick={{ fill: "#888", fontSize: 9 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#888", fontSize: 10 }} />
              <ReferenceLine y={80} stroke="#eab308" strokeDasharray="4 4" />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
              <Line type="monotone" dataKey="pct" stroke={GREEN} strokeWidth={2} name="%" dot={(p: any) => (p.payload.pct < 80 ? <circle cx={p.cx} cy={p.cy} r={4} fill="#ef4444" /> : <circle cx={p.cx} cy={p.cy} r={3} fill={GREEN} />)} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Streak */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[hsl(0_0%_12%)] bg-[#111] p-4 text-center">
          <Flame className="mx-auto mb-2 h-8 w-8 text-orange-500" />
          <p className="text-xs text-white/50">السلسلة الحالية</p>
          <p className="text-3xl font-black text-white">{streak.current}</p>
          <p className="text-xs text-white/40">يوماً</p>
        </div>
        <div className="rounded-2xl border border-[hsl(0_0%_12%)] bg-[#111] p-4 text-center">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 text-[#22C55E]" />
          <p className="text-xs text-white/50">أطول سلسلة</p>
          <p className="text-3xl font-black text-white">{streak.longest}</p>
          <p className="text-xs text-white/40">يوماً</p>
        </div>
        <div className="rounded-2xl border border-[hsl(0_0%_12%)] bg-[#111] p-4 text-center">
          <p className="text-xs text-white/50">معالم</p>
          <p className="mt-2 text-sm text-white/70">7 • 30 • 100 يوماً متتالياً</p>
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
            <BarChart
              data={streak.history.map((h, i) => ({ name: `#${i + 1}`, len: h.len, start: h.start }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={MUTED} />
              <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#888", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
              <Bar dataKey="len" fill={GREEN} name="أيام" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="توزيع أيام التمرين" description="أي يوم في الأسبوع يتدرب فيه أكثر" fileName={`weekday-${clientId}`} loading={isLoading} empty={weekdayData.every((d) => d.count === 0)}>
        <div className="h-[240px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={MUTED} />
              <XAxis dataKey="nameAr" tick={{ fill: "#888", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#888", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
              <Bar dataKey="count" fill={GREEN} name="جلسات" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

function HeatmapGrid({ dayMap }: { dayMap: Map<string, number> }) {
  const cells = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 180);
    const list: { key: string; count: number }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toYmd(d);
      list.push({ key, count: dayMap.get(key) ?? 0 });
    }
    return list;
  }, [dayMap]);

  const max = Math.max(...cells.map((c) => c.count), 1);

  return (
    <div className="flex flex-wrap gap-[3px]">
      {cells.map((c) => {
        const intensity = c.count === 0 ? 0 : 0.25 + (c.count / max) * 0.75;
        const bg = c.count === 0 ? "#1a1a1a" : `rgba(34, 197, 94, ${intensity})`;
        return (
          <div
            key={c.key}
            title={`${c.key}: ${c.count}`}
            className="h-3 w-3 rounded-sm"
            style={{ background: bg }}
          />
        );
      })}
    </div>
  );
}
