import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Dumbbell,
  Flame,
  Loader2,
  Scale,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useMobilePortalToken } from "@/hooks/useMobilePortalToken";
import { supabase } from "@/integrations/supabase/client";
import ProgressPhotos from "@/components/ProgressPhotos";
import MobileInBodyScan from "@/components/mobile/client/MobileInBodyScan";
import { formatArabicShortDate } from "@/lib/programStartDate";

const BG = "#0E0E0F";
const CARD_BG = "#111111";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#4F6F52";
const ACCENT_SOFT = "rgba(79,111,82,0.12)";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const MUTED = "#888";
const FAINT = "#555";

type Client = { id: string; name?: string | null; trainer_id?: string | null };

type WorkoutStats = { total_workouts: number; current_streak: number };

type BodyScan = {
  id: string;
  scan_date: string;
  weight: number | null;
  body_fat: number | null;
  muscle_mass: number | null;
  bmi: number | null;
};

type AttendanceRow = { workout_date: string; day_name: string | null };

type StrengthRow = {
  exercise_name: string;
  first_weight: number | null;
  latest_weight: number | null;
  first_date: string;
  latest_date: string;
  sessions_count: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function pctChange(first: number, latest: number): number {
  if (!first || first <= 0) return 0;
  return ((latest - first) / first) * 100;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Build the 4×7 grid anchored to today's local day (rightmost = today).
 * Returns rows of 7 days each, oldest row first.
 */
function buildLastFourWeeks(trainedSet: ReadonlySet<string>): Array<
  Array<{ date: Date; trained: boolean; isToday: boolean; isFuture: boolean }>
> {
  const today = localMidnight(new Date());
  const todayKey = dayKey(today);
  const totalCells = 28;
  const startDate = new Date(today.getTime() - (totalCells - 1) * MS_PER_DAY);
  const cells: Array<{ date: Date; trained: boolean; isToday: boolean; isFuture: boolean }> = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(startDate.getTime() + i * MS_PER_DAY);
    const k = dayKey(date);
    cells.push({
      date,
      trained: trainedSet.has(k),
      isToday: k === todayKey,
      isFuture: false,
    });
  }
  const rows: typeof cells[] = [];
  for (let i = 0; i < 4; i++) rows.push(cells.slice(i * 7, (i + 1) * 7));
  return rows;
}

const ClientMobileProgress = () => {
  const token = useMobilePortalToken();

  const { data: client, isLoading: loadingClient } = useQuery<Client | null>({
    queryKey: ["mobile-portal-client", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_client_by_portal_token", { p_token: token });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return (row as Client) ?? null;
    },
    enabled: !!token,
  });

  const { data: stats } = useQuery<WorkoutStats>({
    queryKey: ["mobile-portal-workout-stats", token],
    queryFn: async () => {
      if (!token) return { total_workouts: 0, current_streak: 0 };
      const { data, error } = await supabase.rpc(
        "get_portal_workout_stats" as never,
        { p_token: token } as never,
      );
      if (error || !data || typeof data !== "object") return { total_workouts: 0, current_streak: 0 };
      const j = data as { total_workouts?: number; current_streak?: number };
      return {
        total_workouts: j.total_workouts ?? 0,
        current_streak: j.current_streak ?? 0,
      };
    },
    enabled: !!token,
  });

  const { data: scans = [] } = useQuery<BodyScan[]>({
    queryKey: ["mobile-portal-body-scans", token],
    queryFn: async () => {
      if (!token) return [];
      const { data, error } = await supabase.rpc("get_portal_body_scans" as never, { p_token: token } as never);
      if (error) throw error;
      return (data ?? []) as BodyScan[];
    },
    enabled: !!token,
  });

  const { data: attendance = [] } = useQuery<AttendanceRow[]>({
    queryKey: ["mobile-portal-attendance", token, 28],
    queryFn: async () => {
      if (!token) return [];
      const { data, error } = await supabase.rpc(
        "get_portal_attendance" as never,
        { p_token: token, p_days: 28 } as never,
      );
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
    enabled: !!token,
  });

  const { data: strength = [] } = useQuery<StrengthRow[]>({
    queryKey: ["mobile-portal-strength-progress", token],
    queryFn: async () => {
      if (!token) return [];
      const { data, error } = await supabase.rpc(
        "get_portal_strength_progress" as never,
        { p_token: token } as never,
      );
      if (error) throw error;
      return (data ?? []) as StrengthRow[];
    },
    enabled: !!token,
  });

  /* ─────────── body stats ─────────── */
  const sortedScans = useMemo(
    () => [...scans].sort((a, b) => new Date(a.scan_date).getTime() - new Date(b.scan_date).getTime()),
    [scans],
  );
  const firstScan = sortedScans[0] ?? null;
  const latestScan = sortedScans[sortedScans.length - 1] ?? null;

  const weightChartData = useMemo(
    () =>
      sortedScans
        .filter((s) => typeof s.weight === "number" && s.weight != null)
        .map((s) => ({
          date: new Date(s.scan_date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
          weight: Number(s.weight),
        })),
    [sortedScans],
  );

  /* ─────────── attendance / consistency ─────────── */
  const trainedSet = useMemo(() => {
    const s = new Set<string>();
    for (const row of attendance) if (row?.workout_date) s.add(row.workout_date);
    return s;
  }, [attendance]);

  const weeksGrid = useMemo(() => buildLastFourWeeks(trainedSet), [trainedSet]);

  const sessionsThisMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return attendance.filter((row) => {
      if (!row?.workout_date) return false;
      const d = new Date(row.workout_date);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
  }, [attendance]);

  /* ─────────── strength deltas ─────────── */
  const topMovers = useMemo(() => {
    return [...strength]
      .map((row) => {
        const first = Number(row.first_weight ?? 0);
        const latest = Number(row.latest_weight ?? 0);
        return { ...row, first, latest, delta: pctChange(first, latest) };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [strength]);

  /* ─────────── guards ─────────── */
  if (!token) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ background: CARD_BG, color: MUTED }}>
        لم يتم العثور على رمز البوابة. سجّل الخروج ثم الدخول مرة أخرى.
      </div>
    );
  }

  if (loadingClient && !client) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-5" dir="rtl">
        <h1 className="text-2xl font-bold text-white">تقدمي</h1>
        <div className="rounded-2xl p-8 text-center" style={{ background: CARD_BG }}>
          <p className="text-sm" style={{ color: MUTED }}>
            لم يُربط حسابك بملف متدرب بعد. أكمل التسجيل من رابط المدرب أو تواصل مع الدعم.
          </p>
        </div>
      </div>
    );
  }

  const totalCompleted = stats?.total_workouts ?? 0;
  const streak = stats?.current_streak ?? 0;

  return (
    <div className="space-y-6" style={{ background: BG }} dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white">تقدمي</h1>
        <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
          رحلتك في الأرقام — مقارنة بين نقطة البداية وحيث أنت اليوم.
        </p>
      </div>

      {/* ─────────── SECTION 1 · BODY STATS + InBody scan ─────────── */}
      <section className="space-y-3">
        <MobileInBodyScan token={token} />
        <BodyStatsSection first={firstScan} latest={latestScan} />
        <ScanHistorySection scans={sortedScans} />
      </section>

      {/* ─────────── SECTION 2 · STRENGTH PROGRESS ─────────── */}
      <StrengthSection rows={topMovers} />

      {/* ─────────── SECTION 3 · CONSISTENCY ─────────── */}
      <ConsistencySection
        streak={streak}
        totalCompleted={totalCompleted}
        sessionsThisMonth={sessionsThisMonth}
        weeksGrid={weeksGrid}
      />

      {/* ─────────── SECTION 4 · PROGRESS PHOTOS ─────────── */}
      <section>
        <SectionHeader title="صور التقدم" />
        <div className="overflow-hidden rounded-2xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <ProgressPhotos
            clientId={client.id}
            uploadedBy="client"
            trainerId={client.trainer_id ?? undefined}
            portalToken={token}
          />
        </div>
      </section>

      {/* ─────────── SECTION 5 · WEIGHT CHART ─────────── */}
      <WeightChartSection data={weightChartData} firstWeight={firstScan?.weight ?? null} latestWeight={latestScan?.weight ?? null} />
    </div>
  );
};

/* ═══════════════════════ sub-components ═══════════════════════ */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold text-white">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function ScanHistorySection({ scans }: { scans: BodyScan[] }) {
  if (scans.length === 0) return null;
  const recent = [...scans].slice(-5).reverse();
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-white">سجل فحوصات InBody</h3>
        <span className="text-[10px]" style={{ color: FAINT }}>
          آخر {recent.length}
        </span>
      </div>
      <ul className="space-y-2">
        {recent.map((s) => {
          const bmi = Number(s.bmi ?? 0);
          const cat =
            bmi < 18.5
              ? { label: "نقص", color: "#60A5FA" }
              : bmi < 25
                ? { label: "طبيعي", color: ACCENT }
                : bmi < 30
                  ? { label: "زيادة", color: "#F59E0B" }
                  : { label: "سمنة", color: "#EF4444" };
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-2xl p-3"
              style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px]" style={{ color: FAINT }}>
                  {new Date(s.scan_date).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="mt-0.5 truncate text-[12px] font-semibold text-white tabular-nums">
                  {s.weight != null ? `${Number(s.weight)} كغ` : "—"}
                  <span className="mx-1" style={{ color: FAINT }}>
                    ·
                  </span>
                  <span style={{ color: MUTED }}>BMI {bmi || "—"}</span>
                  <span className="mx-1" style={{ color: FAINT }}>
                    ·
                  </span>
                  <span style={{ color: MUTED }}>
                    دهون {s.body_fat != null ? `${Number(s.body_fat)}%` : "—"}
                  </span>
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ background: `${cat.color}1a`, color: cat.color }}
              >
                {cat.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BodyStatsSection({ first, latest }: { first: BodyScan | null; latest: BodyScan | null }) {
  const hasAny = !!first || !!latest;
  const isFirstAndLatestSame = !!first && !!latest && first.id === latest.id;

  const cards: Array<{ label: string; first: number | null; latest: number | null; unit: string; icon: typeof Scale; preferDown?: boolean }>= [
    { label: "الوزن", first: first?.weight ?? null, latest: latest?.weight ?? null, unit: "كجم", icon: Scale, preferDown: true },
    { label: "نسبة الدهون", first: first?.body_fat ?? null, latest: latest?.body_fat ?? null, unit: "%", icon: Activity, preferDown: true },
    { label: "الكتلة العضلية", first: first?.muscle_mass ?? null, latest: latest?.muscle_mass ?? null, unit: "كجم", icon: Dumbbell },
  ];

  return (
    <section>
      <SectionHeader
        title="ملخص الجسم"
        subtitle={
          first && latest && !isFirstAndLatestSame
            ? `من ${formatArabicShortDate(new Date(first.scan_date))} إلى ${formatArabicShortDate(new Date(latest.scan_date))}`
            : hasAny
              ? "أكمل قياساً آخر لتحصل على مقارنة"
              : "لا توجد قياسات بعد"
        }
      />

      {!hasAny ? (
        <EmptyCard
          icon={Scale}
          text="لم يتم تسجيل قياسات الجسم بعد. اطلب من مدربك إضافة قياس InBody."
        />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {cards.map((c) => {
            const firstNum = c.first != null ? Number(c.first) : null;
            const latestNum = c.latest != null ? Number(c.latest) : null;
            const showDelta = firstNum != null && latestNum != null && !isFirstAndLatestSame;
            const delta = showDelta ? Number((latestNum as number) - (firstNum as number)) : 0;
            const improved = c.preferDown ? delta < 0 : delta > 0;
            const deltaColor = !showDelta || delta === 0 ? MUTED : improved ? ACCENT : RED;
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className="rounded-2xl p-3"
                style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
              >
                <div
                  className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: ACCENT_SOFT }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: ACCENT }} strokeWidth={1.75} />
                </div>
                <p className="text-[10px]" style={{ color: MUTED }}>
                  {c.label}
                </p>
                <p className="text-base font-bold tabular-nums text-white">
                  {latestNum != null ? `${round1(latestNum)}${c.unit === "%" ? "%" : ""}` : "—"}
                  {latestNum != null && c.unit !== "%" ? (
                    <span className="mr-1 text-[10px] font-normal" style={{ color: MUTED }}>
                      {c.unit}
                    </span>
                  ) : null}
                </p>
                {showDelta ? (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-bold tabular-nums" style={{ color: deltaColor }}>
                    {delta > 0 ? (
                      <TrendingUp className="h-3 w-3" strokeWidth={2.25} />
                    ) : delta < 0 ? (
                      <TrendingDown className="h-3 w-3" strokeWidth={2.25} />
                    ) : null}
                    {delta > 0 ? "+" : ""}
                    {round1(delta)}
                    {c.unit === "%" ? "%" : ""}
                  </p>
                ) : firstNum != null ? (
                  <p className="mt-1 text-[10px]" style={{ color: FAINT }}>
                    البداية {round1(firstNum)}
                    {c.unit === "%" ? "%" : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StrengthSection({ rows }: { rows: Array<StrengthRow & { first: number; latest: number; delta: number }> }) {
  return (
    <section>
      <SectionHeader
        title="تقدم القوة"
        subtitle={rows.length > 0 ? "أعلى التحسّنات في أوزانك" : undefined}
      />
      {rows.length === 0 ? (
        <EmptyCard
          icon={Dumbbell}
          text="ستظهر هنا مقارنة أوزانك بعد أن تسجّل نفس التمرين في تمرينين أو أكثر."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const improved = r.delta > 0.5;
            const regressed = r.delta < -0.5;
            const color = improved ? ACCENT : regressed ? RED : MUTED;
            const bg = improved ? ACCENT_SOFT : regressed ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.04)";
            const Icon = improved ? TrendingUp : regressed ? TrendingDown : Dumbbell;
            return (
              <li
                key={r.exercise_name}
                className="flex items-center justify-between gap-3 rounded-2xl p-3"
                style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{r.exercise_name}</p>
                  <p className="mt-0.5 text-[11px] tabular-nums" style={{ color: MUTED }}>
                    <span style={{ color: FAINT }}>{round1(r.first)}</span>
                    <span className="mx-1.5" style={{ color: FAINT }}>→</span>
                    <span className="text-white">{round1(r.latest)}</span>
                    <span className="mr-1">كجم</span>
                    <span className="mr-2" style={{ color: FAINT }}>
                      · {r.sessions_count} جلسة
                    </span>
                  </p>
                </div>
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums"
                  style={{ background: bg, color }}
                >
                  <Icon className="h-3 w-3" strokeWidth={2.25} />
                  {r.delta > 0 ? "+" : ""}
                  {Math.round(r.delta)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ConsistencySection({
  streak,
  totalCompleted,
  sessionsThisMonth,
  weeksGrid,
}: {
  streak: number;
  totalCompleted: number;
  sessionsThisMonth: number;
  weeksGrid: Array<Array<{ date: Date; trained: boolean; isToday: boolean }>>;
}) {
  const weekdayLabels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return (
    <section>
      <SectionHeader title="الاستمرارية" subtitle="آخر 4 أسابيع" />

      <div
        className="space-y-4 rounded-2xl p-4"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      >
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Flame} label="أيام متتالية" value={String(streak)} color={AMBER} />
          <Stat icon={Trophy} label="هذا الشهر" value={String(sessionsThisMonth)} color={ACCENT} />
          <Stat icon={Dumbbell} label="إجمالي" value={String(totalCompleted)} color="#3B82F6" />
        </div>

        <div>
          <div className="mb-1.5 grid grid-cols-7 gap-1" dir="rtl">
            {weekdayLabels.map((w) => (
              <span key={w} className="text-center text-[9px]" style={{ color: FAINT }}>
                {w.slice(0, 2)}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1" dir="rtl">
            {weeksGrid.flat().map((cell, i) => {
              const { trained, isToday } = cell;
              const bg = trained ? ACCENT : "rgba(255,255,255,0.04)";
              const border = isToday ? "2px solid #fff" : `1px solid ${CARD_BORDER}`;
              return (
                <div
                  key={i}
                  className="aspect-square rounded-md"
                  style={{ background: bg, border }}
                  aria-label={trained ? `تمرن ${cell.date.toLocaleDateString("ar-SA")}` : undefined}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: ACCENT }} />
              يوم تدريب
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}
              />
              يوم راحة
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function WeightChartSection({
  data,
  firstWeight,
  latestWeight,
}: {
  data: Array<{ date: string; weight: number }>;
  firstWeight: number | null;
  latestWeight: number | null;
}) {
  const delta = firstWeight != null && latestWeight != null ? Number(latestWeight) - Number(firstWeight) : null;
  return (
    <section>
      <SectionHeader
        title="تطور الوزن"
        subtitle={
          data.length < 2
            ? "أضف قياساً ثانياً لترى الاتجاه"
            : delta != null
              ? `منذ أول قياس: ${delta > 0 ? "+" : ""}${round1(delta)} كجم`
              : undefined
        }
      />
      <div
        className="rounded-2xl p-3"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      >
        {data.length < 2 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-[12px]" style={{ color: MUTED }}>
              {data.length === 0 ? "لا توجد قياسات بعد" : "قياس واحد فقط مسجّل"}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "#0E0E0F",
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 8,
                  color: "white",
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value} كجم`, "الوزن"]}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke={ACCENT}
                strokeWidth={2.25}
                dot={{ r: 3, fill: ACCENT, stroke: ACCENT }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${CARD_BORDER}` }}
    >
      <div
        className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: `${color}1a` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} strokeWidth={1.75} />
      </div>
      <p className="text-lg font-bold tabular-nums text-white">{value}</p>
      <p className="text-[10px]" style={{ color: MUTED }}>
        {label}
      </p>
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  text,
}: {
  icon: typeof Dumbbell;
  text: string;
}) {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <Icon className="mx-auto mb-2 h-8 w-8" style={{ color: "#333" }} strokeWidth={1.5} />
      <p className="mx-auto max-w-xs text-[12px] leading-relaxed" style={{ color: MUTED }}>
        {text}
      </p>
    </div>
  );
}

export default ClientMobileProgress;
