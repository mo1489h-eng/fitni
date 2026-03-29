import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, DollarSign, TrendingUp, Lock, LogOut, Star, BarChart2, Download, Gift } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SESSION_KEY = "CoachBase_admin_session";

function getSession(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed?.token !== "string" || !parsed.token) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed.token;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function setSession(token: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token }));
}

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState("");
  const [sessionToken, setSessionToken] = useState("");

  useEffect(() => {
    const token = getSession();
    if (token) {
      setSessionToken(token);
      setAuthed(true);
    }
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setSessionToken("");
  }, []);

  const fetchData = useCallback(async (token: string, filterMonth?: string) => {
    setLoading(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("admin-dashboard", {
        body: { session_token: token, month: filterMonth || undefined },
      });

      if (fnError || result?.error) {
        if (result?.error === "unauthorized") {
          clearSession();
          setError("انتهت الجلسة أو بيانات الدخول غير صحيحة");
        } else {
          toast.error("حدث خطأ في جلب البيانات");
        }
        return;
      }

      if (result?.session_token) {
        setSession(result.session_token);
        setSessionToken(result.session_token);
      }

      setData(result);
      setMonth(result.filter_month);
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    if (authed && sessionToken) fetchData(sessionToken);
  }, [authed, sessionToken, fetchData]);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { data: result } = await supabase.functions.invoke("admin-dashboard", {
      body: { password },
    });
    setLoading(false);

    if (result?.error === "unauthorized") {
      setError("كلمة مرور خاطئة");
      return;
    }

    if (result?.error || !result?.session_token) {
      setError("حدث خطأ");
      return;
    }

    setSession(result.session_token);
    setSessionToken(result.session_token);
    setAuthed(true);
    setData(result);
    setMonth(result.filter_month);
  };

  const handleMonthChange = (m: string) => {
    setMonth(m);
    fetchData(sessionToken, m);
  };

  const handleMarkPaid = async (payoutId: string) => {
    const { data: result } = await supabase.functions.invoke("admin-dashboard", {
      body: { session_token: sessionToken, action: "mark_payout_paid", payout_id: payoutId },
    });

    if (result?.error === "unauthorized") {
      clearSession();
      setError("انتهت الجلسة أو بيانات الدخول غير صحيحة");
      return;
    }

    if (result?.session_token) {
      setSession(result.session_token);
      setSessionToken(result.session_token);
    }

    toast.success("تم التحويل");
    fetchData(result?.session_token || sessionToken, month);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setData(null);
    setPassword("");
    setSessionToken("");
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center" dir="rtl">
        <Card className="w-full max-w-sm bg-card border-border">
          <CardHeader className="text-center">
            <Lock className="w-10 h-10 text-primary mx-auto mb-2" />
            <CardTitle className="text-foreground">لوحة التحكم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="text-right"
            />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? "..." : "دخول"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data?.stats;
  const trainers = data?.trainers || [];
  const payouts = data?.payouts || [];
  const charts = data?.charts || {};

  const monthOptions = () => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("ar-SA", { year: "numeric", month: "long" });
      opts.push({ val, label });
    }
    return opts;
  };

  const revenueChartData = Object.entries(charts.monthly_revenue || {}).map(([k, v]) => ({
    month: k.substring(5),
    revenue: v as number,
  }));

  const growthChartData = Object.entries(charts.trainer_growth || {}).map(([k, v]) => ({
    month: k.substring(5),
    trainers: v as number,
  }));

  const planChartData = Object.entries(charts.plan_distribution || {}).map(([k, v]) => ({
    name: k === "free" ? "مجاني" : "برو",
    value: v as number,
  }));

  const COLORS = ["#6b7280", "#16a34a"];

  return (
    <div className="min-h-screen bg-[#080808] text-foreground" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">لوحة تحكم Fitni</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 ml-1" /> خروج
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "المدربين النشطين", value: stats?.total_trainers || 0, icon: Users },
            { label: "إجمالي المتدربين", value: stats?.total_clients || 0, icon: UserCheck },
            { label: "إيرادات هذا الشهر", value: `${(stats?.month_revenue || 0).toLocaleString()} ر.س`, icon: DollarSign },
            { label: "الإيرادات الكلية", value: `${(stats?.total_revenue || 0).toLocaleString()} ر.س`, icon: TrendingUp },
          ].map((c, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <c.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
                <p className="text-xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">اختر الشهر:</span>
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions().map((o) => (
                <SelectItem key={o.val} value={o.val}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trainers Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">المدربين والمبيعات</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم المدرب</TableHead>
                  <TableHead className="text-right">الجوال</TableHead>
                  <TableHead className="text-right">عدد عملاءه</TableHead>
                  <TableHead className="text-right">مبيعات الشهر</TableHead>
                  <TableHead className="text-right">إجمالي المبيعات</TableHead>
                  <TableHead className="text-right">عمولة 10%</TableHead>
                  <TableHead className="text-right">المستحق له</TableHead>
                  <TableHead className="text-right">الآيبان</TableHead>
                  <TableHead className="text-right">البنك</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainers.map((t: any) => {
                  const commission = t.month_sales * 0.1;
                  const due = t.month_sales - commission;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{t.phone || "—"}</TableCell>
                      <TableCell>{t.client_count}</TableCell>
                      <TableCell>{t.month_sales.toLocaleString()} ر.س</TableCell>
                      <TableCell>{t.total_sales.toLocaleString()} ر.س</TableCell>
                      <TableCell className="text-primary">{commission.toLocaleString()} ر.س</TableCell>
                      <TableCell>{due.toLocaleString()} ر.س</TableCell>
                      <TableCell className="text-xs font-mono max-w-[120px] truncate">{t.iban || "—"}</TableCell>
                      <TableCell className="text-xs">{t.bank_name || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payout Requests */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">طلبات السحب</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم المدرب</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الآيبان</TableHead>
                  <TableHead className="text-right">البنك</TableHead>
                  <TableHead className="text-right">تاريخ الطلب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد طلبات</TableCell>
                  </TableRow>
                )}
                {payouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.account_holder_name || "—"}</TableCell>
                    <TableCell>{Number(p.amount).toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-xs font-mono">{p.iban}</TableCell>
                    <TableCell className="text-xs">{p.bank_name}</TableCell>
                    <TableCell className="text-xs">{new Date(p.requested_at).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell>
                      {p.status === "paid" ? (
                        <Badge className="bg-primary/20 text-primary">مدفوع</Badge>
                      ) : (
                        <Badge variant="secondary">معلق</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaid(p.id)}>
                          تم التحويل
                        </Button>
                      )}
                      {p.status === "paid" && p.processed_at && (
                        <span className="text-xs text-muted-foreground">{new Date(p.processed_at).toLocaleDateString("ar-SA")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">اشتراكات المدربين</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم المدرب</TableHead>
                  <TableHead className="text-right">الخطة</TableHead>
                  <TableHead className="text-right">تاريخ البدء</TableHead>
                  <TableHead className="text-right">تاريخ التجديد</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainers.map((t: any) => {
                  const plan = t.plan || "free";
                  const isActive = plan !== "free" && t.subscription_end_date && new Date(t.subscription_end_date) > new Date();
                  const statusLabel = plan === "free" ? "مجاني" : isActive ? "نشط" : "منتهي";
                  const statusColor = plan === "free" ? "secondary" : isActive ? "default" : "destructive";
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{t.name || "—"}</TableCell>
                      <TableCell>{plan === "pro" ? "برو" : "مجاني"}</TableCell>
                      <TableCell className="text-xs">{t.subscribed_at ? new Date(t.subscribed_at).toLocaleDateString("ar-SA") : "—"}</TableCell>
                      <TableCell className="text-xs">{t.subscription_end_date ? new Date(t.subscription_end_date).toLocaleDateString("ar-SA") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusColor as any} className={isActive ? "bg-primary/20 text-primary" : ""}>
                          {statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Founders Section */}
        {data?.founders && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="h-5 w-5 text-primary" strokeWidth={1.5} />
                المؤسسون (أول 100 مدرب)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "عدد المؤسسين", value: `${data.founders.total} من ${data.founders.limit}`, color: "text-primary" },
                  { label: "أماكن متبقية", value: data.founders.spots_remaining, color: data.founders.spots_remaining > 0 ? "text-primary" : "text-destructive" },
                  { label: "استخدموا العرض", value: data.founders.discount_used, color: "text-foreground" },
                  { label: "لم يستخدموا بعد", value: data.founders.discount_remaining, color: "text-amber-500" },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* NPS Section */}
        {data?.nps && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-primary" strokeWidth={1.5} />
                تقييمات المدربين (NPS)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "NPS Score", value: data.nps.score, color: data.nps.score >= 50 ? "text-primary" : data.nps.score >= 0 ? "text-amber-500" : "text-destructive" },
                  { label: "عدد المقيّمين", value: data.nps.count, color: "text-foreground" },
                  { label: "المروّجين (9-10)", value: `${data.nps.promoters_pct}%`, color: "text-primary" },
                  { label: "المحايدين (7-8)", value: `${data.nps.passives_pct}%`, color: "text-amber-500" },
                  { label: "المنتقدين (0-6)", value: `${data.nps.detractors_pct}%`, color: "text-destructive" },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {data.nps.recent?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">آخر التقييمات</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        const csv = "Score,Comment,Date,Trainer\n" +
                          data.nps.recent.map((n: any) =>
                            `${n.score},"${(n.comment || "").replace(/"/g, '""')}",${new Date(n.created_at).toLocaleDateString("ar-SA")},${n.trainer_name}`
                          ).join("\n");
                        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "nps_feedback.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                      تصدير CSV
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">التقييم</TableHead>
                          <TableHead className="text-right">التعليق</TableHead>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">المدرب</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.nps.recent.map((n: any) => (
                          <TableRow key={n.id}>
                            <TableCell>
                              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                n.score >= 9 ? "bg-primary/20 text-primary" : n.score >= 7 ? "bg-amber-500/20 text-amber-500" : "bg-destructive/20 text-destructive"
                              }`}>
                                {n.score}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{n.comment || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString("ar-SA")}</TableCell>
                            <TableCell className="text-sm">{n.trainer_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">إيرادات آخر 6 شهور</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                  <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">نمو المدربين</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={growthChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                  <Line type="monotone" dataKey="trainers" stroke="#16a34a" strokeWidth={2} dot={{ fill: "#16a34a" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">توزيع الخطط</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={planChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {planChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
