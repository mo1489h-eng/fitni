import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplet,
  Loader2,
  MessageCircle,
  NotebookPen,
  Send,
  Trash2,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  clientId: string;
  clientName: string;
  clientPhone: string | null | undefined;
};

const ARABIC_DAY_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const ARABIC_DAY_LONG = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const GREEN = "hsl(125 17% 37%)";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const MUTED = "hsl(0 0% 40%)";

const startOfLocalDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const shortDate = (d: Date) =>
  d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });

const complianceColor = (pct: number) =>
  pct >= 80 ? GREEN : pct >= 50 ? AMBER : RED;

type DayBucket = {
  date: Date;
  key: string;
  dayLabel: string;
  sessions: Array<{
    id: string;
    duration_minutes: number | null;
    total_sets: number | null;
    completed_at: string | null;
  }>;
  mealsCompleted: number;
  caloriesConsumed: number;
  waterGlasses: number;
};

type TooltipPayloadEntry = { payload?: { dayLabel?: string; compliance?: number } };

const ClientComplianceTab = ({ clientId, clientName, clientPhone }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const now = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const d = startOfLocalDay(now);
    d.setDate(d.getDate() - 6);
    return d;
  }, [now]);
  const startOfWindowIso = sevenDaysAgo.toISOString();

  const { data: mealPlan } = useQuery({
    queryKey: ["coach-client-meal-plan", clientId],
    queryFn: async () => {
      const { data: plans, error: planErr } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (planErr) throw planErr;
      const planId = plans?.[0]?.id ?? null;
      if (!planId) return { planId: null, mealCount: 0 };
      const { data: items, error: itemsErr } = await supabase
        .from("meal_items")
        .select("meal_name")
        .eq("meal_plan_id", planId);
      if (itemsErr) throw itemsErr;
      const names = new Set<string>();
      for (const item of items ?? []) {
        const name = item?.meal_name?.toString().trim();
        if (name) names.add(name);
      }
      return { planId, mealCount: names.size };
    },
    enabled: !!clientId,
  });

  const { data: sessions7d = [] } = useQuery({
    queryKey: ["coach-client-sessions-7d", clientId, startOfWindowIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, completed_at, started_at, created_at, duration_minutes, total_sets, program_day_id")
        .eq("client_id", clientId)
        .gte("created_at", startOfWindowIso)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        completed_at: string | null;
        started_at: string | null;
        created_at: string;
        duration_minutes: number | null;
        total_sets: number | null;
        program_day_id: string | null;
      }>;
    },
    enabled: !!clientId,
  });

  const { data: lastSession } = useQuery({
    queryKey: ["coach-client-last-session", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, completed_at, started_at, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!clientId,
  });

  const startOfWindowDate = useMemo(() => ymd(sevenDaysAgo), [sevenDaysAgo]);

  const { data: mealLogs7d = [] } = useQuery({
    queryKey: ["coach-client-meal-logs-7d", clientId, startOfWindowDate],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("meal_completion_logs")
        .select("id, date, meal_name, calories")
        .eq("client_id", clientId)
        .gte("date", startOfWindowDate);
      if (error) return [];
      return (data ?? []) as Array<{
        id: string;
        date: string;
        meal_name: string;
        calories: number | null;
      }>;
    },
    enabled: !!clientId,
  });

  const { data: waterLogs7d = [] } = useQuery({
    queryKey: ["coach-client-water-7d", clientId, startOfWindowDate],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("water_logs")
        .select("id, date, glasses, target_glasses")
        .eq("client_id", clientId)
        .gte("date", startOfWindowDate);
      if (error) return [];
      return (data ?? []) as Array<{
        id: string;
        date: string;
        glasses: number | null;
        target_glasses: number | null;
      }>;
    },
    enabled: !!clientId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["coach-client-notes", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_notes")
        .select("id, note, created_at, trainer_id")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return (data ?? []) as Array<{
        id: string;
        note: string;
        created_at: string;
        trainer_id: string;
      }>;
    },
    enabled: !!clientId,
  });

  const buckets = useMemo<DayBucket[]>(() => {
    const out: DayBucket[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const key = ymd(d);
      out.push({
        date: d,
        key,
        dayLabel: ARABIC_DAY_SHORT[d.getDay()],
        sessions: [],
        mealsCompleted: 0,
        caloriesConsumed: 0,
        waterGlasses: 0,
      });
    }

    const byKey = new Map(out.map((b) => [b.key, b]));

    for (const s of sessions7d) {
      const ts = s.completed_at ?? s.started_at ?? s.created_at;
      const key = ymd(new Date(ts));
      const bucket = byKey.get(key);
      if (!bucket) continue;
      bucket.sessions.push({
        id: s.id,
        duration_minutes: s.duration_minutes,
        total_sets: s.total_sets,
        completed_at: s.completed_at,
      });
    }

    for (const m of mealLogs7d) {
      const bucket = byKey.get(m.date);
      if (!bucket) continue;
      bucket.mealsCompleted += 1;
      bucket.caloriesConsumed += Number(m.calories ?? 0);
    }

    for (const w of waterLogs7d) {
      const bucket = byKey.get(w.date);
      if (!bucket) continue;
      bucket.waterGlasses = Math.max(bucket.waterGlasses, Number(w.glasses ?? 0));
    }

    return out;
  }, [sessions7d, mealLogs7d, waterLogs7d, sevenDaysAgo]);

  const waterTarget = 8;
  const plannedMealsPerDay = mealPlan?.mealCount ?? 0;

  const complianceFor = (b: DayBucket) => {
    const workoutScore = b.sessions.some((s) => s.completed_at) ? 100 : b.sessions.length > 0 ? 50 : 0;
    const mealScore =
      plannedMealsPerDay > 0
        ? Math.min(100, (b.mealsCompleted / plannedMealsPerDay) * 100)
        : b.mealsCompleted > 0
        ? 100
        : 0;
    const waterScore = Math.min(100, (b.waterGlasses / waterTarget) * 100);
    const parts = [workoutScore, mealScore, waterScore];
    return Math.round(parts.reduce((s, p) => s + p, 0) / parts.length);
  };

  const todayKey = ymd(startOfLocalDay(now));
  const todayBucket = buckets.find((b) => b.key === todayKey);
  const todayCompliance = todayBucket ? complianceFor(todayBucket) : 0;
  const todayWorkoutDone = !!todayBucket?.sessions.some((s) => s.completed_at);
  const todayWorkoutStarted = !!todayBucket?.sessions.length;

  const weeklyChartData = buckets.map((b) => ({
    dayLabel: b.dayLabel,
    key: b.key,
    compliance: complianceFor(b),
    isToday: b.key === todayKey,
  }));

  const weeklyAvg = weeklyChartData.length
    ? Math.round(
        weeklyChartData.reduce((s, d) => s + d.compliance, 0) / weeklyChartData.length
      )
    : 0;

  const daysSinceLastWorkout = useMemo(() => {
    const base = lastSession?.completed_at ?? lastSession?.started_at ?? lastSession?.created_at;
    if (!base) return null;
    const ms = now.getTime() - new Date(base).getTime();
    return Math.floor(ms / 86400000);
  }, [lastSession, now]);

  const alerts = useMemo(() => {
    const list: Array<{ severity: "error" | "warn" | "ok"; message: string }> = [];
    if (daysSinceLastWorkout != null && daysSinceLastWorkout >= 3) {
      list.push({
        severity: "error",
        message: `لم يتمرن منذ ${daysSinceLastWorkout} أيام`,
      });
    }
    if (plannedMealsPerDay > 0) {
      const weekMealScores = buckets.map((b) =>
        Math.min(100, (b.mealsCompleted / plannedMealsPerDay) * 100)
      );
      const avgMeal = Math.round(
        weekMealScores.reduce((s, v) => s + v, 0) / weekMealScores.length
      );
      if (avgMeal < 50) {
        list.push({
          severity: "warn",
          message: `التزام غذائي منخفض هذا الأسبوع (${avgMeal}%)`,
        });
      }
    }
    if (weeklyAvg > 85) {
      list.push({
        severity: "ok",
        message: `أسبوع ممتاز! التزام ${weeklyAvg}%`,
      });
    }
    return list;
  }, [buckets, daysSinceLastWorkout, plannedMealsPerDay, weeklyAvg]);

  /* ───────────── Coach actions ───────────── */

  const whatsappHref = useMemo(() => {
    if (!clientPhone) return null;
    const phone = `966${clientPhone.replace(/^0/, "")}`;
    const text = `مرحباً ${clientName}، لا تنس تمرينك اليوم! 💪`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }, [clientPhone, clientName]);

  const [noteDraft, setNoteDraft] = useState("");

  const addNote = useMutation({
    mutationFn: async (text: string) => {
      if (!user?.id) throw new Error("no user");
      const { error } = await (supabase as any).from("client_notes").insert({
        client_id: clientId,
        trainer_id: user.id,
        note: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteDraft("");
      queryClient.invalidateQueries({ queryKey: ["coach-client-notes", clientId] });
      toast({ title: "تم حفظ الملاحظة" });
    },
    onError: (e: Error) => {
      toast({ title: "تعذّر حفظ الملاحظة", description: e.message, variant: "destructive" });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await (supabase as any)
        .from("client_notes")
        .delete()
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-client-notes", clientId] });
    },
  });

  return (
    <div className="space-y-4" dir="rtl">
      <TodaySummaryCard
        date={now}
        workoutDone={todayWorkoutDone}
        workoutStarted={todayWorkoutStarted}
        mealsCompleted={todayBucket?.mealsCompleted ?? 0}
        mealsTarget={plannedMealsPerDay}
        waterGlasses={todayBucket?.waterGlasses ?? 0}
        waterTarget={waterTarget}
        compliance={todayCompliance}
      />

      <WeeklyChartCard data={weeklyChartData} average={weeklyAvg} />

      <WorkoutHistoryCard buckets={buckets} />

      <NutritionHistoryCard
        buckets={buckets}
        plannedMealsPerDay={plannedMealsPerDay}
        waterTarget={waterTarget}
      />

      <AlertsCard alerts={alerts} />

      <QuickActionsCard
        whatsappHref={whatsappHref}
        clientName={clientName}
        noteDraft={noteDraft}
        onDraftChange={setNoteDraft}
        saving={addNote.isPending}
        onSave={() => addNote.mutate(noteDraft)}
        notes={notes}
        onDelete={(id) => deleteNote.mutate(id)}
      />
    </div>
  );
};

export default ClientComplianceTab;

/* ───────────── Sub-components ───────────── */

function TodaySummaryCard({
  date,
  workoutDone,
  workoutStarted,
  mealsCompleted,
  mealsTarget,
  waterGlasses,
  waterTarget,
  compliance,
}: {
  date: Date;
  workoutDone: boolean;
  workoutStarted: boolean;
  mealsCompleted: number;
  mealsTarget: number;
  waterGlasses: number;
  waterTarget: number;
  compliance: number;
}) {
  const longDate = `${ARABIC_DAY_LONG[date.getDay()]} ${shortDate(date)}`;
  const pill = complianceColor(compliance);
  const workoutLabel = workoutDone
    ? "أنجز"
    : workoutStarted
    ? "بدأ ولم يُنجز"
    : "لم يُنجز";
  const WorkoutIcon = workoutDone ? CheckCircle2 : workoutStarted ? Clock : XCircle;

  return (
    <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-card-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" strokeWidth={1.5} />
          اليوم — {longDate}
        </h3>
        <span
          className="text-xs font-bold tabular-nums px-3 py-1 rounded-full"
          style={{ background: `${pill}22`, color: pill }}
        >
          {compliance}%
        </span>
      </div>

      <div className="grid gap-2">
        <RowStat
          icon={<WorkoutIcon className="w-4 h-4" strokeWidth={1.5} style={{ color: workoutDone ? GREEN : workoutStarted ? AMBER : RED }} />}
          label="التمرين"
          value={workoutLabel}
          valueColor={workoutDone ? GREEN : workoutStarted ? AMBER : RED}
        />
        <RowStat
          icon={<UtensilsCrossed className="w-4 h-4 text-primary" strokeWidth={1.5} />}
          label="التغذية"
          value={
            mealsTarget > 0
              ? `${mealsCompleted} من ${mealsTarget} وجبات`
              : mealsCompleted > 0
              ? `${mealsCompleted} وجبات مسجّلة`
              : "لا توجد خطة غذائية"
          }
        />
        <RowStat
          icon={<Droplet className="w-4 h-4" strokeWidth={1.5} style={{ color: "#3B82F6" }} />}
          label="الماء"
          value={`${waterGlasses} من ${waterTarget} أكواب`}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-[hsl(0_0%_10%)] flex items-center justify-between">
        <span className="text-xs text-muted-foreground">الالتزام اليوم</span>
        <span className="text-lg font-bold tabular-nums" style={{ color: pill }}>
          {compliance}%
        </span>
      </div>
    </Card>
  );
}

function RowStat({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between bg-[hsl(0_0%_5%)] rounded-lg px-3 py-2 border border-[hsl(0_0%_10%)]">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium tabular-nums" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
}

function WeeklyChartCard({
  data,
  average,
}: {
  data: Array<{ dayLabel: string; compliance: number; isToday: boolean }>;
  average: number;
}) {
  return (
    <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-card-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" strokeWidth={1.5} />
          الالتزام — آخر 7 أيام
        </h3>
        <span className="text-xs text-muted-foreground">
          المتوسط{" "}
          <span className="font-bold text-foreground tabular-nums">{average}%</span>
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 10, fill: MUTED }}
              stroke="hsl(0 0% 11%)"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: MUTED }}
              stroke="hsl(0 0% 11%)"
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <RechartsTooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "hsl(0 0% 6%)",
                border: "1px solid hsl(0 0% 10%)",
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(value: number) => [`${value}%`, "الالتزام"]}
              labelFormatter={(_label: string, payload: TooltipPayloadEntry[]) =>
                payload?.[0]?.payload?.dayLabel ?? ""
              }
            />
            <Bar dataKey="compliance" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.dayLabel}
                  fill={complianceColor(entry.compliance)}
                  fillOpacity={entry.isToday ? 1 : 0.75}
                  stroke={entry.isToday ? "#fff" : "transparent"}
                  strokeWidth={entry.isToday ? 1 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function WorkoutHistoryCard({ buckets }: { buckets: DayBucket[] }) {
  const rows = [...buckets].reverse();
  return (
    <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
      <h3 className="font-bold text-card-foreground mb-3">سجل التمرين — آخر 7 أيام</h3>
      <div className="space-y-2">
        {rows.map((b) => {
          const anyCompleted = b.sessions.some((s) => s.completed_at);
          const anyStarted = b.sessions.length > 0;
          const totalDuration = b.sessions.reduce(
            (s, x) => s + (x.duration_minutes ?? 0),
            0
          );
          const totalSets = b.sessions.reduce(
            (s, x) => s + (x.total_sets ?? 0),
            0
          );
          const color = anyCompleted ? GREEN : anyStarted ? AMBER : RED;
          const label = anyCompleted ? "أنجز" : anyStarted ? "لم يكتمل" : "لم ينجز";
          return (
            <div
              key={b.key}
              className="flex items-center justify-between bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm text-foreground font-medium">
                  {ARABIC_DAY_LONG[b.date.getDay()]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {shortDate(b.date)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${color}22`, color }}
                >
                  {label}
                </span>
                {anyStarted ? (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {totalSets > 0 ? `${totalSets} مجموعة` : null}
                    {totalSets > 0 && totalDuration > 0 ? " · " : null}
                    {totalDuration > 0 ? `${totalDuration} دقيقة` : null}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NutritionHistoryCard({
  buckets,
  plannedMealsPerDay,
  waterTarget,
}: {
  buckets: DayBucket[];
  plannedMealsPerDay: number;
  waterTarget: number;
}) {
  const rows = [...buckets].reverse();
  return (
    <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
      <h3 className="font-bold text-card-foreground mb-3">التغذية والماء — آخر 7 أيام</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-right text-muted-foreground">
              <th className="pb-2 font-medium">اليوم</th>
              <th className="pb-2 font-medium">الوجبات</th>
              <th className="pb-2 font-medium">السعرات</th>
              <th className="pb-2 font-medium">الماء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(0_0%_10%)]">
            {rows.map((b) => {
              const mealLabel =
                plannedMealsPerDay > 0
                  ? `${b.mealsCompleted} / ${plannedMealsPerDay}`
                  : String(b.mealsCompleted);
              return (
                <tr key={b.key} className="text-foreground">
                  <td className="py-2">
                    <div className="flex flex-col">
                      <span>{ARABIC_DAY_LONG[b.date.getDay()]}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {shortDate(b.date)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 tabular-nums">{mealLabel}</td>
                  <td className="py-2 tabular-nums">{Math.round(b.caloriesConsumed)}</td>
                  <td className="py-2 tabular-nums">
                    {b.waterGlasses} / {waterTarget}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AlertsCard({
  alerts,
}: {
  alerts: Array<{ severity: "error" | "warn" | "ok"; message: string }>;
}) {
  if (alerts.length === 0) return null;
  return (
    <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
      <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-primary" strokeWidth={1.5} />
        التنبيهات
      </h3>
      <div className="space-y-2">
        {alerts.map((a, i) => {
          const color = a.severity === "error" ? RED : a.severity === "warn" ? AMBER : GREEN;
          const Icon =
            a.severity === "error"
              ? XCircle
              : a.severity === "warn"
              ? AlertTriangle
              : CheckCircle2;
          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg px-3 py-2 border"
              style={{
                background: `${color}15`,
                borderColor: `${color}33`,
                color,
              }}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span className="text-sm font-medium">{a.message}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function QuickActionsCard({
  whatsappHref,
  clientName,
  noteDraft,
  onDraftChange,
  saving,
  onSave,
  notes,
  onDelete,
}: {
  whatsappHref: string | null;
  clientName: string;
  noteDraft: string;
  onDraftChange: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  notes: Array<{ id: string; note: string; created_at: string }>;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
      <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
        <NotebookPen className="w-4 h-4 text-primary" strokeWidth={1.5} />
        إجراءات سريعة
      </h3>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            إرسال تذكير واتساب إلى {clientName}
          </p>
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <Button className="w-full gap-2">
                <Send className="w-4 h-4" strokeWidth={1.5} />
                إرسال تذكير
              </Button>
            </a>
          ) : (
            <Button className="w-full gap-2" disabled>
              <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
              لا يوجد رقم جوال
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-[hsl(0_0%_10%)] bg-[hsl(0_0%_5%)] p-3 space-y-2">
          <p className="text-xs text-muted-foreground">إضافة ملاحظة</p>
          <Textarea
            rows={3}
            placeholder="ملاحظة سريعة عن أداء العميل هذا الأسبوع…"
            value={noteDraft}
            onChange={(e) => onDraftChange(e.target.value)}
            className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_12%)] text-sm"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1"
              disabled={saving || noteDraft.trim().length === 0}
              onClick={onSave}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <NotebookPen className="w-4 h-4" strokeWidth={1.5} />
                  حفظ الملاحظة
                </>
              )}
            </Button>
          </div>
        </div>

        {notes.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">الملاحظات السابقة</p>
            {notes.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-[hsl(0_0%_10%)] bg-[hsl(0_0%_5%)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {n.note}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString("ar-SA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(n.id)}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                  aria-label="حذف الملاحظة"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
