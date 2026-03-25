import { forwardRef, useMemo, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  BarChart2,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  CreditCard,
  Eye,
  MessageCircle,
  Plus,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import ImportClientsModal from "@/components/ImportClientsModal";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import PremiumSkeleton from "@/components/PremiumSkeleton";
import TrainerLayout from "@/components/TrainerLayout";
import TrialBanner from "@/components/TrialBanner";
import UpgradeModal from "@/components/UpgradeModal";
import AnimatedCounter from "@/components/AnimatedCounter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";

type Client = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  created_at: string;
  last_workout_date: string;
  subscription_end_date: string;
  subscription_price: number;
  program_id: string | null;
};

type Measurement = {
  client_id: string;
  weight: number;
  recorded_at: string;
};

type SessionItem = {
  id: string;
  client_id: string;
  session_date: string;
  start_time: string;
  session_type: string;
  notes: string | null;
};

type PaymentItem = {
  id: string;
  amount: number;
  created_at: string;
  status: string;
};

const formatWhatsApp = (phone?: string) => `https://wa.me/966${(phone || "").replace(/^0/, "")}`;

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat("ar-SA", { month: "short" }).format(date);

const CircularProgress = forwardRef<HTMLDivElement, { value: number }>(({ value }, ref) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div ref={ref} className="relative flex h-24 w-24 items-center justify-center">
      <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
        <circle cx="42" cy="42" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-black text-foreground">
          <AnimatedCounter end={value} suffix="%" />
        </div>
      </div>
    </div>
  );
});
CircularProgress.displayName = "CircularProgress";

const StatCard = ({
  title,
  icon: Icon,
  value,
  suffix,
  trend,
  ring,
}: {
  title: string;
  icon: typeof Users;
  value: number;
  suffix?: string;
  trend: string;
  ring?: boolean;
}) => (
  <Card className="group rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_20px_60px_hsl(var(--primary)/0.08)]">
    <CardContent className="p-7">
      <div className="mb-5 flex items-start justify-between border-t-2 border-primary pt-5">
        <div>
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          <div className="mt-4 text-4xl font-black leading-none text-foreground tabular-nums">
            {ring ? <span className="sr-only">{value}%</span> : <AnimatedCounter end={value} suffix={suffix} />}
          </div>
          <div className="mt-3 text-sm font-medium text-primary">{trend}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>
      </div>
      {ring ? (
        <div className="flex items-center justify-between">
          <CircularProgress value={value} />
          <div className="max-w-[8rem] text-sm leading-7 text-muted-foreground">نسبة العملاء الذين سجّلوا نشاطاً حديثاً.</div>
        </div>
      ) : null}
    </CardContent>
  </Card>
);

const EmptyPanel = forwardRef<HTMLDivElement, {
  icon: typeof Users;
  title: string;
  cta: string;
  onClick: () => void;
}>(({ icon: Icon, title, cta, onClick }, ref) => (
  <div ref={ref} className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-12 text-center">
    <Icon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
    <p className="mt-4 text-base text-muted-foreground">{title}</p>
    <Button className="mt-5 rounded-full px-5" onClick={onClick}>
      <Plus className="ml-2 h-4 w-4" strokeWidth={1.5} />
      {cta}
    </Button>
  </div>
));
EmptyPanel.displayName = "EmptyPanel";

const Dashboard = () => {
  const { user, profile } = useAuth();
  usePageTitle("لوحة التحكم");
  const { isPro, getProFeatureBlockReason } = usePlanLimits();
  const navigate = useNavigate();
  const [showPlans, setShowPlans] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["dashboard-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user,
  });

  const { data: measurements = [], isLoading: measurementsLoading } = useQuery({
    queryKey: ["dashboard-measurements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("measurements").select("client_id, weight, recorded_at").order("recorded_at", { ascending: false });
      if (error) throw error;
      return data as Measurement[];
    },
    enabled: !!user,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["dashboard-sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trainer_sessions").select("id, client_id, session_date, start_time, session_type, notes").order("session_date", { ascending: true });
      if (error) throw error;
      return data as SessionItem[];
    },
    enabled: !!user,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["dashboard-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_payments").select("id, amount, created_at, status").eq("status", "paid").order("created_at", { ascending: true });
      if (error) throw error;
      return data as PaymentItem[];
    },
    enabled: !!user,
  });

  const { data: pendingCopilotCount = 0 } = useQuery({
    queryKey: ["dashboard-copilot-pending-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase.from("copilot_recommendations").select("*", { head: true, count: "exact" }).eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && isPro,
  });

  const isLoading = clientsLoading || measurementsLoading || sessionsLoading || paymentsLoading;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const clientMap = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const monthlyRevenue = useMemo(
    () => payments.filter((payment) => new Date(payment.created_at).getMonth() === today.getMonth()).reduce((sum, payment) => sum + (payment.amount || 0), 0),
    [payments, today],
  );

  const previousMonthRevenue = useMemo(() => {
    const previousMonth = (today.getMonth() + 11) % 12;
    return payments.filter((payment) => new Date(payment.created_at).getMonth() === previousMonth).reduce((sum, payment) => sum + (payment.amount || 0), 0);
  }, [payments, today]);

  const revenueChange = previousMonthRevenue > 0 ? Math.round(((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100) : 100;

  const weeklySessions = sessions.filter((session) => {
    const date = new Date(`${session.session_date}T00:00:00`);
    return date >= startOfWeek && date < endOfWeek;
  });

  const todaySessions = weeklySessions.filter((session) => session.session_date === todayKey);
  const upcomingSessions = todaySessions.filter((session) => session.start_time >= today.toTimeString().slice(0, 5)).length;

  const inactiveClients = clients.filter((client) => {
    const lastWorkoutDate = new Date(client.last_workout_date);
    const diffDays = Math.ceil((Date.now() - lastWorkoutDate.getTime()) / 86400000);
    return diffDays >= 5;
  });

  const adherenceRate = clients.length > 0 ? Math.round(((clients.length - inactiveClients.length) / clients.length) * 100) : 0;
  const expiringClients = clients.filter((client) => {
    const remainingDays = Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000);
    return remainingDays >= 0 && remainingDays <= 7;
  });

  const activityFeed = [
    ...todaySessions.slice(0, 3).map((session) => ({
      id: `session-${session.id}`,
      icon: CalendarDays,
      text: `جلسة ${session.session_type} مع ${clientMap.get(session.client_id)?.name || "عميل"}`,
      time: session.start_time,
    })),
    ...clients.slice(0, 3).map((client) => ({
      id: `client-${client.id}`,
      icon: Users,
      text: `تمت إضافة أو تحديث ملف ${client.name}`,
      time: new Date(client.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    })),
    ...(pendingCopilotCount > 0
      ? [
          {
            id: "copilot",
            icon: Sparkles,
            text: `${pendingCopilotCount} توصيات من الكوبايلت بانتظار المراجعة`,
            time: "الآن",
          },
        ]
      : []),
  ].slice(0, 6);

  const monthlyRevenueSeries = useMemo(() => {
    const monthStarts = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: formatMonthLabel(date),
        total: 0,
      };
    });

    payments.forEach((payment) => {
      const date = new Date(payment.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const target = monthStarts.find((month) => month.key === key);
      if (target) target.total += payment.amount || 0;
    });

    const maxValue = Math.max(...monthStarts.map((month) => month.total), 1);
    return monthStarts.map((month) => ({ ...month, height: `${Math.max((month.total / maxValue) * 100, 10)}%` }));
  }, [payments, today]);

  const clientProgressRows = clients.slice(0, 5).map((client) => {
    const records = measurements.filter((measurement) => measurement.client_id === client.id);
    const lastWorkoutDays = Math.ceil((Date.now() - new Date(client.last_workout_date).getTime()) / 86400000);
    const commitment = Math.max(12, Math.min(100, Math.round((1 - Math.min(lastWorkoutDays, 7) / 7) * 100)));
    return {
      ...client,
      commitment,
      programName: client.program_id ? "برنامج مخصص" : "بدون برنامج مرتبط",
      lastActive: lastWorkoutDays === 0 ? "نشط اليوم" : `آخر نشاط منذ ${lastWorkoutDays} يوم`,
      initials: client.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      latestWeight: records[0]?.weight,
    };
  });

  const handleCopilot = () => {
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }
    const targetClientId = clients[0]?.id;
    navigate(targetClientId ? `/clients/${targetClientId}` : "/clients");
  };

  return (
    <TrainerLayout onQuickAdd={() => setShowImport(true)}>
      <div className="space-y-8 page-enter">
        <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
        <OnboardingChecklist />

        {profile?.username ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Bell className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  صفحتك العامة
                </div>
                <p className="truncate text-sm text-muted-foreground" dir="ltr">coachbase.health/t/{profile.username}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://coachbase.health/t/${profile.username}`);
                    toast.success("تم نسخ الرابط العام");
                  }}
                >
                  <Copy className="h-4 w-4" strokeWidth={1.5} />
                  نسخ الرابط
                </Button>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`رابط صفحتي التدريبية: https://coachbase.health/t/${profile.username}`)}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                    واتساب
                  </a>
                </Button>
                <Button size="sm" className="gap-2" onClick={() => navigate("/settings/page")}>
                  <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  تخصيص الصفحة
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <PremiumSkeleton rows={6} />
        ) : (
          <>
            <section className="grid gap-5 xl:grid-cols-4 md:grid-cols-2">
              <StatCard title="العملاء النشطون" icon={Users} value={clients.length} trend={`+${Math.max(1, Math.ceil(clients.length / 6))} هذا الشهر`} />
              <StatCard title="إيرادات الشهر" icon={TrendingUp} value={monthlyRevenue} suffix=" ر.س" trend={`${revenueChange >= 0 ? "+" : ""}${revenueChange}% مقارنة بالشهر الماضي`} />
              <StatCard title="جلسات هذا الأسبوع" icon={CalendarDays} value={weeklySessions.length} trend={`${upcomingSessions} جلسة قادمة`} />
              <StatCard title="معدل الالتزام" icon={Activity} value={adherenceRate} trend="مبني على آخر نشاط مسجل" ring />
            </section>

            <section className="grid gap-8 xl:grid-cols-[1.25fr_0.95fr]">
              <div className="space-y-8">
                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      النشاط الأخير
                    </div>
                    <div className="space-y-1">
                      {activityFeed.length > 0 ? (
                        activityFeed.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 border-b border-border py-4 last:border-b-0 last:pb-0 first:pt-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-primary">
                              <item.icon className="h-4 w-4" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{item.text}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyPanel icon={Activity} title="لا يوجد نشاط حديث لعرضه" cta="إضافة عميل" onClick={() => navigate("/clients")} />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
                      <CalendarDays className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      جلسات اليوم
                    </div>

                    {todaySessions.length > 0 ? (
                      <div className="space-y-4">
                        {todaySessions.map((session) => {
                          const client = clientMap.get(session.client_id);
                          const upcoming = session.start_time >= today.toTimeString().slice(0, 5);

                          return (
                            <div key={session.id} className="grid grid-cols-[72px_1fr_auto] items-center gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0">
                              <div className="text-sm tabular-nums text-muted-foreground">{session.start_time.slice(0, 5)}</div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-foreground">{client?.name || "عميل"}</p>
                                  <span className={`h-2.5 w-2.5 rounded-full ${upcoming ? "bg-primary" : "bg-muted-foreground"}`} />
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{session.session_type}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:text-primary" asChild>
                                  <a href={formatWhatsApp(client?.phone)} target="_blank" rel="noreferrer" aria-label="واتساب">
                                    <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:text-primary" asChild>
                                  <Link to={client ? `/clients/${client.id}` : "/clients"} aria-label="عرض الملف">
                                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyPanel icon={CalendarDays} title="لا توجد جلسات اليوم" cta="إضافة جلسة" onClick={() => navigate("/calendar")} />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-8">
                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Zap className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      إجراءات سريعة
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "إضافة عميل", icon: UserPlus, action: () => navigate("/clients") },
                        { label: "برنامج جديد", icon: ClipboardList, action: () => navigate("/programs") },
                        { label: "جلسة جديدة", icon: CalendarDays, action: () => navigate("/calendar") },
                        { label: "AI كوبايلت", icon: Sparkles, action: handleCopilot },
                      ].map((actionItem) => (
                        <button
                          key={actionItem.label}
                          type="button"
                          onClick={actionItem.action}
                          className="rounded-xl border border-border bg-background p-4 text-right transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                        >
                          <actionItem.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                          <div className="mt-6 text-sm font-medium text-foreground">{actionItem.label}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      توصيات الكوبايلت
                    </div>
                    <div className="rounded-r-none rounded-xl border-r-2 border-primary border border-border bg-background p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-primary" strokeWidth={1.5} />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{pendingCopilotCount || 0} توصيات تنتظر مراجعتك</p>
                          <button type="button" className="mt-2 text-sm font-medium text-primary" onClick={handleCopilot}>
                            راجع الآن
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
                      <BarChart2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      الإيرادات
                    </div>
                    <div className="grid h-56 grid-cols-6 items-end gap-3">
                      {monthlyRevenueSeries.map((month) => (
                        <div key={month.key} className="flex h-full flex-col items-center justify-end gap-3">
                          <div className="w-full rounded-t-xl bg-primary transition-all duration-200" style={{ height: month.height }} />
                          <div className="text-xs text-muted-foreground">{month.label}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-[1.25fr_0.95fr]">
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    تقدم العملاء
                  </div>
                  {clientProgressRows.length > 0 ? (
                    <div className="space-y-4">
                      {clientProgressRows.map((client) => (
                        <div key={client.id} className="grid gap-4 rounded-xl border border-border bg-background p-4 md:grid-cols-[1.1fr_1fr_auto] md:items-center">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11 border border-border">
                              <AvatarImage src={undefined} alt={client.name} />
                              <AvatarFallback className="bg-card text-sm font-bold text-foreground">{client.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground">{client.name}</p>
                              <p className="text-sm text-muted-foreground">{client.programName}</p>
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 h-2 overflow-hidden rounded-full bg-border">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${client.commitment}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground">{client.lastActive}</p>
                          </div>
                          <div className="text-left text-sm font-semibold text-foreground tabular-nums">{client.commitment}%</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel icon={UserPlus} title="لم تضف أي عملاء بعد" cta="إضافة عميل" onClick={() => navigate("/clients")} />
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <AlertCircle className="h-5 w-5 text-warning" strokeWidth={1.5} />
                    تنتهي قريباً
                  </div>
                  {expiringClients.length > 0 ? (
                    <div className="space-y-4">
                      {expiringClients.map((client) => {
                        const remainingDays = Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000);
                        return (
                          <div key={client.id} className="rounded-xl border border-warning/25 border-r-2 border-r-warning bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-foreground">{client.name}</p>
                                <p className="mt-1 text-sm text-muted-foreground">متبقي {remainingDays === 0 ? "اليوم" : `${remainingDays} يوم`}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:text-primary" asChild>
                                <a href={formatWhatsApp(client.phone)} target="_blank" rel="noreferrer" aria-label="تذكير واتساب">
                                  <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                                </a>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-background px-5 py-10 text-center">
                      <CheckCircle2 className="mx-auto h-10 w-10 text-primary" strokeWidth={1.5} />
                      <p className="mt-4 text-sm text-muted-foreground">لا توجد اشتراكات قريبة الانتهاء</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>

      <ImportClientsModal open={showImport} onOpenChange={setShowImport} />
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        title={getProFeatureBlockReason().title}
        description={getProFeatureBlockReason().description}
        ctaText="ترقية للاحترافي"
        secondaryText="لاحقاً"
        onUpgrade={() => {
          setShowUpgrade(false);
          setShowPlans(true);
        }}
      />
    </TrainerLayout>
  );
};

export default Dashboard;
