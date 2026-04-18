import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Activity, TrendingDown, RefreshCw, Star } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AdminPageProps } from "./types";
import { getTrialEndDate } from "@/lib/trial-config";

export function AdminMainDashboard({ data }: AdminPageProps) {
  const stats = data?.stats;
  const charts = data?.charts || {};
  const founders = data?.founders;
  const trainers = data?.trainers || [];

  const totalTrainers = stats?.total_trainers || 0;
  const monthRevenue = stats?.month_revenue || 0;
  const trainerWalletsAvail = (stats as { trainer_wallets_available?: number } | undefined)?.trainer_wallets_available ?? 0;
  const trainerWalletsPend = (stats as { trainer_wallets_pending?: number } | undefined)?.trainer_wallets_pending ?? 0;
  const trainerWalletsLife = (stats as { trainer_wallets_lifetime_earnings?: number } | undefined)?.trainer_wallets_lifetime_earnings ?? 0;

  // Compute plan distribution
  const planDist = charts.plan_distribution || {};
  const trialCount = planDist.free || 0;
  const basicCount = planDist.basic || 0;
  const proCount = planDist.pro || 0;

  // Compute churn (trainers with expired sub and no plan)
  const expiredTrainers = trainers.filter((t: any) => {
    if (!t.plan || t.plan === "free") return false;
    return t.subscription_end_date && new Date(t.subscription_end_date) < new Date();
  });
  const churnRate = totalTrainers > 0 ? Math.round((expiredTrainers.length / totalTrainers) * 100) : 0;

  // Active today approximation
  const activeToday = trainers.filter((t: any) => t.client_count > 0).length;
  const dauPct = totalTrainers > 0 ? Math.round((activeToday / totalTrainers) * 100) : 0;

  // Trial conversion
  const trialExpired = trainers.filter((t: any) => {
    const trialEnd = getTrialEndDate(t.created_at || t.subscribed_at);
    return trialEnd < new Date();
  });
  const converted = trialExpired.filter((t: any) => t.plan === "pro" || t.plan === "basic");
  const conversionRate = trialExpired.length > 0 ? Math.round((converted.length / trialExpired.length) * 100) : 0;

  const statCards = [
    { label: "الإيراد الشهري المتكرر", value: `${monthRevenue.toLocaleString()} ريال`, icon: TrendingUp, color: "text-primary" },
    { label: "إجمالي المدربين", value: totalTrainers, sub: `${activeToday} نشط`, icon: Users, color: "text-foreground" },
    { label: "المستخدمون النشطون", value: `${activeToday} مدرب`, sub: `${dauPct}% من الإجمالي`, icon: Activity, color: "text-primary" },
    { label: "معدل الإلغاء", value: `${churnRate}%`, sub: "هذا الشهر", icon: TrendingDown, color: churnRate > 5 ? "text-destructive" : "text-primary" },
    { label: "تحويل التجربة للدفع", value: `${conversionRate}%`, sub: "من منتهي التجربة", icon: RefreshCw, color: "text-primary" },
    { label: "المؤسسون", value: `${founders?.total || 0} من 100`, progress: (founders?.total || 0), icon: Star, color: "text-primary" },
  ];

  const revenueChartData = Object.entries(charts.monthly_revenue || {}).map(([k, v]) => ({
    month: k.substring(5),
    revenue: v as number,
  }));

  const growthChartData = Object.entries(charts.trainer_growth || {}).map(([k, v]) => ({
    month: k.substring(5),
    trainers: v as number,
  }));

  const planChartData = [
    { name: "تجربة مجانية", value: trialCount, color: "#6b7280" },
    { name: "أساسي", value: basicCount, color: "#3d5940" },
    { name: "احترافي", value: "#4f6f52", realValue: proCount },
  ].map(d => ({ name: d.name, value: d.name === "احترافي" ? proCount : d.value }));

  const PIE_COLORS = ["#6b7280", "#3d5940", "#4f6f52"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>

      {/* Platform revenue (client payments) vs trainer wallets (earnings system) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div>
          <p className="text-xs text-muted-foreground">إيراد المنصة (مدفوعات العملاء — الشهر المحدد)</p>
          <p className="text-lg font-bold text-primary tabular-nums">{monthRevenue.toLocaleString("ar-SA")} ريال</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">أرصدة المدربين المتاحة (محافظ)</p>
          <p className="text-lg font-bold tabular-nums text-primary-hover">{trainerWalletsAvail.toLocaleString("ar-SA")} ريال</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">معلق سحب / إجمالي أرباح مسجّل</p>
          <p className="text-sm font-semibold tabular-nums">
            <span className="text-amber-600">{trainerWalletsPend.toLocaleString("ar-SA")}</span>
            {" / "}
            <span className="text-sky-600">{trainerWalletsLife.toLocaleString("ar-SA")}</span>
            <span className="text-muted-foreground text-xs"> ريال</span>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <c.icon className={`w-4 h-4 ${c.color}`} strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
              {c.progress !== undefined && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${c.progress}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Growth Line */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">نمو المدربين</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <Line type="monotone" dataKey="trainers" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">توزيع الباقات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={planChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {planChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Bars */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">الإيرادات - آخر 6 شهور</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">النشاط الأخير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trainers.slice(0, 8).map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground">مدرب مسجل:</span>
                <span className="font-medium text-foreground">{t.name || "بدون اسم"}</span>
                <span className="text-xs text-muted-foreground mr-auto">
                  {t.plan === "pro" ? "احترافي" : t.plan === "basic" ? "أساسي" : "تجربة"}
                </span>
                <span className="text-xs text-muted-foreground">{t.client_count} عميل</span>
              </div>
            ))}
            {trainers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
