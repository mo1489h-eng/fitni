import { useState, useEffect, useCallback, useMemo } from "react";
import { invokeAdminDashboard } from "@/lib/adminDashboardInvoke";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Lock,
  LogOut,
  LayoutDashboard,
  Users,
  Star,
  BarChart2,
  MessageSquare,
  Settings,
  FileText,
  Wallet,
  ArrowDownToLine,
  Sparkles,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";
import { AdminMainDashboard } from "@/components/admin/AdminMainDashboard";
import { AdminTrainers } from "@/components/admin/AdminTrainers";
import { AdminFounders } from "@/components/admin/AdminFounders";
import { AdminRevenue } from "@/components/admin/AdminRevenue";
import { AdminNPS } from "@/components/admin/AdminNPS";
import { AdminPlans } from "@/components/admin/AdminPlans";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminWithdrawals } from "@/components/admin/AdminWithdrawals";
import { AdminWallets } from "@/components/admin/AdminWallets";

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

const PLAN_AR: Record<string, string> = {
  free: "مجاني",
  basic: "أساسي",
  pro: "احترافي",
  trial: "تجريبي",
};

const TX_TYPE_AR: Record<string, string> = {
  subscription: "اشتراك",
  program_sale: "بيع برنامج",
  withdrawal: "سحب",
  refund: "استرداد",
};

const TX_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/40",
  completed: "bg-primary/15 text-primary border border-primary/40",
  failed: "bg-red-500/15 text-red-400 border border-red-500/40",
  cancelled: "bg-muted text-muted-foreground",
};

const WD_STATUS_AR: Record<string, string> = {
  pending: "معلق",
  accepted: "موافق",
  paid: "مدفوع",
  rejected: "مرفوض",
};

function formatMonthChartLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString("ar-SA", { month: "short", year: "numeric" });
}

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const body = rows.map((r) => r.map(esc).join(",")).join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type CoachRow = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  plan: string | null;
  subscription_end_date: string | null;
  client_count: number;
  wallet_balance_available: number;
  wallet_pending: number;
  wallet_total_earnings: number;
};

type TxLogRow = Record<string, unknown> & {
  trainer_id?: string;
  trainer_name?: string;
  type?: string;
  status?: string;
  created_at?: string;
  display_gross?: number;
  display_commission?: number;
  display_net?: number;
};

function QuickStatsSidebar({
  data,
  loading,
}: {
  data: Record<string, unknown> | null;
  loading: boolean;
}) {
  const sidebar = (data?.sidebar_stats ?? {}) as {
    last_withdrawals?: Record<string, unknown>[];
    last_coaches?: Record<string, unknown>[];
    commission_this_month?: number;
  };
  const withdrawals = sidebar.last_withdrawals ?? [];
  const coaches = sidebar.last_coaches ?? [];
  const commission = Number(sidebar.commission_this_month ?? 0);

  const wBadge = (s: string) => {
    switch (s) {
      case "pending":
        return "bg-amber-500/15 text-amber-400 border-amber-500/40";
      case "accepted":
        return "bg-sky-500/15 text-sky-400 border-sky-500/40";
      case "paid":
        return "bg-primary/15 text-primary border-primary/40";
      case "rejected":
        return "bg-red-500/15 text-red-400 border-red-500/40";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 text-sm" dir="rtl">
      <div>
        <p className="text-xs font-semibold text-primary mb-2">عمولة المنصة (الشهر الحالي)</p>
        <p className="text-2xl font-bold tabular-nums">
          {loading ? "…" : `${commission.toFixed(2)} ر.س`}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">آخر طلبات السحب</p>
        <ul className="space-y-2">
          {withdrawals.length === 0 && !loading ? (
            <li className="text-muted-foreground text-xs">لا يوجد</li>
          ) : (
            withdrawals.map((w) => (
              <li
                key={String(w.id)}
                className="rounded-lg border border-border/60 bg-background/40 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate font-medium">{String(w.trainer_name ?? "—")}</span>
                  <Badge variant="secondary" className={`text-[9px] shrink-0 ${wBadge(String(w.status))}`}>
                    {WD_STATUS_AR[String(w.status)] ?? String(w.status)}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {Number(w.amount ?? 0).toFixed(2)} ر.س
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">آخر المدربين تسجيلاً</p>
        <ul className="space-y-2">
          {coaches.length === 0 && !loading ? (
            <li className="text-muted-foreground text-xs">لا يوجد</li>
          ) : (
            coaches.map((c) => (
              <li
                key={String(c.user_id)}
                className="rounded-lg border border-border/60 bg-background/40 px-2 py-1.5"
              >
                <p className="font-medium truncate">{String(c.name ?? "—")}</p>
                <p className="text-[11px] text-muted-foreground truncate">{String(c.email ?? "")}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.created_at ? new Date(String(c.created_at)).toLocaleDateString("ar-SA") : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

type NavPage =
  | "overview"
  | "dashboard"
  | "trainers"
  | "founders"
  | "revenue"
  | "nps"
  | "plans"
  | "reports"
  | "withdrawals"
  | "wallets";

const NAV_ITEMS: { id: NavPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "لوحة شاملة", icon: Sparkles },
  { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "trainers", label: "المدربون", icon: Users },
  { id: "founders", label: "المؤسسون", icon: Star },
  { id: "revenue", label: "الإيرادات", icon: BarChart2 },
  { id: "nps", label: "تقييمات NPS", icon: MessageSquare },
  { id: "plans", label: "الباقات والأسعار", icon: Settings },
  { id: "reports", label: "التقارير", icon: FileText },
  { id: "withdrawals", label: "طلبات السحب", icon: ArrowDownToLine },
  { id: "wallets", label: "المحافظ", icon: Wallet },
];

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [month, setMonth] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [activePage, setActivePage] = useState<NavPage>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [trainerDetail, setTrainerDetail] = useState<CoachRow | null>(null);
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseBusy, setReleaseBusy] = useState(false);

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
      const { data: result } = await invokeAdminDashboard({
        session_token: token,
        month: filterMonth || undefined,
      });
      if (result && typeof result === "object" && "error" in result && result.error === "unauthorized") {
        clearSession();
        setError("انتهت الجلسة أو بيانات الدخول غير صحيحة");
        return;
      }
      if (!result || (result.error && result.error !== "unauthorized")) {
        const msg =
          result?.error === "missing_supabase_env"
            ? "إعدادات Supabase غير مكتملة"
            : result?.error === "network"
              ? "تعذر الاتصال. جرّب تعطيل حظر التتبع لهذا الموقع أو افتح التطبيق في نافذة عادية."
              : "تعذر الاتصال بلوحة التحكم. تحقق من الشبكة وحاول مجدداً.";
        toast.error(msg);
        return;
      }
      if (typeof result.session_token === "string" && result.session_token) {
        setSession(result.session_token);
        setSessionToken(result.session_token);
      }
      setData(result as Record<string, unknown>);
      if (typeof result.filter_month === "string") {
        setMonth(result.filter_month);
      }
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    if (authed && sessionToken) fetchData(sessionToken);
  }, [authed, sessionToken, fetchData]);

  const handleLogin = async () => {
    setError("");
    const trimmed = password.trim();
    setLoading(true);
    const { data: result } = await invokeAdminDashboard({ password: trimmed });
    setLoading(false);
    if (result?.error === "missing_supabase_env") {
      setError("إعدادات Supabase غير مكتملة في هذا العرض.");
      return;
    }
    if (result && typeof result === "object" && "error" in result && result.error === "unauthorized") {
      setError("كلمة مرور خاطئة");
      return;
    }
    if (!result?.session_token) {
      if (result?.error === "network") {
        setError(
          "تعذر الاتصال بالخادم. إذا كنت في معاينة مضمّنة، افتح الموقع في تبويب جديد أو اسمح بالتخزين لـ coachbase.",
        );
        return;
      }
      setError("حدث خطأ أو تعذر الاتصال بالخادم");
      return;
    }
    setSession(result.session_token);
    setSessionToken(result.session_token);
    setAuthed(true);
    setData(result as Record<string, unknown>);
    if (typeof result.filter_month === "string") {
      setMonth(result.filter_month);
    }
  };

  const handleMonthChange = (m: string) => {
    setMonth(m);
    fetchData(sessionToken, m);
  };

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    const { data: result } = await invokeAdminDashboard({ session_token: sessionToken, action, ...payload });
    if (result && typeof result === "object" && "error" in result && result.error === "unauthorized") {
      clearSession();
      setError("انتهت الجلسة");
      return null;
    }
    if (!result || (result.error && result.error !== "unauthorized")) {
      if (result?.error && result.error !== "unauthorized") {
        toast.error(String(result.error));
      } else {
        toast.error("تعذر تنفيذ الإجراء. حاول مجدداً.");
      }
      return null;
    }
    if (typeof result.session_token === "string" && result.session_token) {
      setSession(result.session_token);
      setSessionToken(result.session_token);
    }
    return result;
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setData(null);
    setPassword("");
    setSessionToken("");
  };

  const overviewKpis = (data?.overview_kpis ?? {}) as {
    total_coaches?: number;
    total_trainees?: number;
    active_coaches?: number;
    transactions_gross_sum?: number;
    platform_commission_sum?: number;
    pending_withdrawals_count?: number;
  };

  const coachRows: CoachRow[] = useMemo(() => {
    const raw = (data?.coach_trainers ?? []) as CoachRow[];
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [data?.coach_trainers]);

  const transactionsLog: TxLogRow[] = useMemo(() => {
    const raw = (data?.transactions_log ?? []) as TxLogRow[];
    return [...raw].sort((a, b) => {
      const ta = new Date(String(a.created_at ?? 0)).getTime();
      const tb = new Date(String(b.created_at ?? 0)).getTime();
      return tb - ta;
    });
  }, [data?.transactions_log]);

  const filteredTx = useMemo(() => {
    return transactionsLog.filter((t) => {
      if (txTypeFilter !== "all" && String(t.type) !== txTypeFilter) return false;
      if (txStatusFilter !== "all" && String(t.status) !== txStatusFilter) return false;
      const d = t.created_at ? new Date(String(t.created_at)) : null;
      if (txDateFrom && d && d < new Date(txDateFrom)) return false;
      if (txDateTo && d) {
        const end = new Date(txDateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [transactionsLog, txTypeFilter, txStatusFilter, txDateFrom, txDateTo]);

  const chartData = useMemo(() => {
    const raw = (data?.platform_revenue_chart ?? []) as { month: string; commission: number; volume: number }[];
    return raw.map((r) => ({
      ...r,
      label: formatMonthChartLabel(r.month),
    }));
  }, [data?.platform_revenue_chart]);

  const trainerWallet = useMemo(() => {
    if (!trainerDetail) return null;
    const wallets = (data?.wallets ?? []) as Record<string, unknown>[];
    return wallets.find((w) => String(w.trainer_id) === String(trainerDetail.id)) ?? null;
  }, [data?.wallets, trainerDetail]);

  const trainerClients = useMemo(() => {
    if (!trainerDetail) return [];
    const clients = (data?.clients ?? []) as { trainer_id?: string }[];
    return clients.filter((c) => String(c.trainer_id) === String(trainerDetail.id));
  }, [data?.clients, trainerDetail]);

  const trainerTxAll = useMemo(() => {
    if (!trainerDetail) return [];
    return transactionsLog.filter((t) => String(t.trainer_id) === String(trainerDetail.id));
  }, [transactionsLog, trainerDetail]);

  const trainerSubTx = useMemo(() => {
    return trainerTxAll.filter((t) => String(t.type) === "subscription");
  }, [trainerTxAll]);

  const exportTransactionsCsv = () => {
    const header = ["المدرب", "النوع", "الإجمالي", "عمولة المنصة", "صافي المدرب", "التاريخ", "الحالة"];
    const rows: string[][] = [
      header,
      ...filteredTx.map((t) => [
        String(t.trainer_name ?? "—"),
        TX_TYPE_AR[String(t.type)] ?? String(t.type ?? ""),
        String(t.display_gross ?? ""),
        String(t.display_commission ?? ""),
        String(t.display_net ?? ""),
        t.created_at ? new Date(String(t.created_at)).toISOString() : "",
        String(t.status ?? ""),
      ]),
    ];
    downloadCsv(`transactions-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("تم تصدير الملف");
  };

  const runReleasePending = async () => {
    setReleaseBusy(true);
    try {
      const res = await handleAction("release_pending_balance");
      if (res && typeof res === "object" && "released_count" in res) {
        const n = Number(res.released_count ?? 0);
        const amt = Number((res as { released_amount?: number }).released_amount ?? 0);
        toast.success(`تم تحرير ${n} معاملة — إجمالي ${amt.toFixed(2)} ر.س`);
        await fetchData(sessionToken, month);
      }
    } finally {
      setReleaseBusy(false);
      setReleaseOpen(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="w-full max-w-sm border-border/60 bg-card/80">
          <CardHeader className="text-center">
            <Lock className="w-10 h-10 text-primary mx-auto mb-2" strokeWidth={1.5} />
            <CardTitle>لوحة تحكم CoachBase</CardTitle>
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
              {loading ? "جاري الدخول..." : "دخول"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pageProps = { data, loading, month, onMonthChange: handleMonthChange, onAction: handleAction, onRefresh: () => fetchData(sessionToken, month) };

  const processWithdrawal = async (
    id: string,
    action: "approve" | "reject" | "mark_paid",
    notes: string,
  ) => {
    const result = await handleAction("process_withdrawal", {
      withdrawal_id: id,
      withdrawal_action: action,
      admin_notes: notes || null,
    });
    if (!result) throw new Error("فشل الإجراء");
    if (typeof result === "object" && "error" in result && result.error) {
      throw new Error(String(result.error));
    }
  };

  const kpiCard = (label: string, value: string | number) => (
    <Card key={label} className="border-border/50 bg-card/90">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-xl font-bold tabular-nums text-primary">{value}</p>
      </CardContent>
    </Card>
  );

  const wdRows = (data?.withdrawals ?? []) as Parameters<typeof AdminWithdrawals>[0]["withdrawals"];

  const overviewContent = (
    <div className="space-y-10" dir="rtl">
      <section>
        <h2 className="text-lg font-semibold text-primary mb-3">نظرة عامة</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpiCard("إجمالي المدربين", overviewKpis.total_coaches ?? "—")}
          {kpiCard("إجمالي المتدربين", overviewKpis.total_trainees ?? "—")}
          {kpiCard("المدربون النشطون", overviewKpis.active_coaches ?? "—")}
          {kpiCard("إجمالي الإيرادات (معاملات)", `${Number(overviewKpis.transactions_gross_sum ?? 0).toFixed(2)} ر.س`)}
          {kpiCard("عمولة المنصة", `${Number(overviewKpis.platform_commission_sum ?? 0).toFixed(2)} ر.س`)}
          {kpiCard("طلبات السحب المعلقة", overviewKpis.pending_withdrawals_count ?? "—")}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary mb-3">طلبات السحب</h2>
        <AdminWithdrawals
          withdrawals={wdRows}
          loading={loading}
          onProcess={processWithdrawal}
          onRefresh={() => fetchData(sessionToken, month)}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-primary mb-3">قائمة المدربين</h2>
        <div className="rounded-xl border border-border/60 overflow-x-auto bg-card/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الإيميل</TableHead>
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
                <TableHead className="text-right">الباقة</TableHead>
                <TableHead className="text-right">انتهاء الباقة</TableHead>
                <TableHead className="text-right">العملاء</TableHead>
                <TableHead className="text-right">رصيد متاح</TableHead>
                <TableHead className="text-right">إجمالي الأرباح</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : coachRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    لا يوجد مدربون
                  </TableCell>
                </TableRow>
              ) : (
                coachRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-primary/5"
                    onClick={() => setTrainerDetail(row)}
                  >
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {row.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString("ar-SA")}
                    </TableCell>
                    <TableCell>{PLAN_AR[String(row.plan)] ?? row.plan ?? "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {row.subscription_end_date
                        ? new Date(row.subscription_end_date).toLocaleDateString("ar-SA")
                        : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.client_count}</TableCell>
                    <TableCell className="tabular-nums">
                      {Number(row.wallet_balance_available ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {Number(row.wallet_total_earnings ?? 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-3">
          <h2 className="text-lg font-semibold text-primary">سجل المعاملات</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="subscription">اشتراك</SelectItem>
                <SelectItem value="program_sale">بيع برنامج</SelectItem>
                <SelectItem value="withdrawal">سحب</SelectItem>
                <SelectItem value="refund">استرداد</SelectItem>
              </SelectContent>
            </Select>
            <Select value={txStatusFilter} onValueChange={setTxStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="failed">فاشل</SelectItem>
                <SelectItem value="cancelled">ملغى</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-[150px] h-9"
              value={txDateFrom}
              onChange={(e) => setTxDateFrom(e.target.value)}
            />
            <Input
              type="date"
              className="w-[150px] h-9"
              value={txDateTo}
              onChange={(e) => setTxDateTo(e.target.value)}
            />
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={exportTransactionsCsv}>
              <FileDown className="h-4 w-4" />
              تصدير CSV
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 overflow-x-auto bg-card/50 max-h-[480px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right sticky top-0 bg-card">المدرب</TableHead>
                <TableHead className="text-right sticky top-0 bg-card">النوع</TableHead>
                <TableHead className="text-right sticky top-0 bg-card">الإجمالي</TableHead>
                <TableHead className="text-right sticky top-0 bg-card">عمولة المنصة</TableHead>
                <TableHead className="text-right sticky top-0 bg-card">صافي المدرب</TableHead>
                <TableHead className="text-right sticky top-0 bg-card">التاريخ</TableHead>
                <TableHead className="text-right sticky top-0 bg-card">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTx.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد نتائج
                  </TableCell>
                </TableRow>
              ) : (
                filteredTx.map((t, idx) => (
                  <TableRow key={String(t.id ?? `tx-${idx}`)}>
                    <TableCell className="font-medium">{t.trainer_name ?? "—"}</TableCell>
                    <TableCell>{TX_TYPE_AR[String(t.type)] ?? String(t.type)}</TableCell>
                    <TableCell className="tabular-nums">{Number(t.display_gross ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="tabular-nums">{Number(t.display_commission ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="tabular-nums">{Number(t.display_net ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {t.created_at ? new Date(String(t.created_at)).toLocaleString("ar-SA") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${TX_STATUS_BADGE[String(t.status)] ?? "bg-muted"}`}
                      >
                        {String(t.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-border/50 bg-card/90">
          <CardHeader>
            <CardTitle className="text-base text-primary">إيرادات المنصة (آخر 6 أشهر)</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {chartData.length === 0 ? (
              <p className="text-muted-foreground text-sm">لا بيانات كافية</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Bar dataKey="volume" name="حجم المعاملات" fill="hsl(var(--primary) / 0.45)" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    name="عمولة المنصة"
                    stroke="#4F6F52"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/90 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base text-primary">تحرير الأرصدة المعلقة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              استدعاء الدالة <span className="font-mono text-xs">release_pending_balance()</span> على الخادم.
            </p>
            <Button
              className="w-full gap-2 bg-primary hover:bg-primary-hover"
              type="button"
              onClick={() => setReleaseOpen(true)}
              disabled={releaseBusy}
            >
              <RefreshCw className={`h-4 w-4 ${releaseBusy ? "animate-spin" : ""}`} />
              تحرير الأرصدة المعلقة
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex text-foreground" dir="rtl">
      <aside
        className={`sticky top-0 h-screen bg-background border-l border-border flex flex-col transition-all duration-300 shrink-0 ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && <span className="text-sm font-bold text-primary">CoachBase</span>}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            {!sidebarCollapsed && <span>خروج</span>}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 min-w-0 min-h-screen">
        <aside className="order-2 xl:order-none hidden xl:flex w-72 shrink-0 border-l border-border bg-background/95 flex-col p-4 overflow-y-auto sticky top-0 h-screen">
          <p className="text-sm font-bold text-primary mb-4">إحصائيات سريعة</p>
          <QuickStatsSidebar data={data} loading={loading} />
        </aside>

        <main className="order-1 xl:order-none flex-1 min-h-screen overflow-auto">
          <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
            <div className="xl:hidden rounded-xl border border-border/60 bg-background p-4">
              <p className="text-sm font-bold text-primary mb-3">إحصائيات سريعة</p>
              <QuickStatsSidebar data={data} loading={loading} />
            </div>

            {activePage === "overview" && overviewContent}
            {activePage === "dashboard" && <AdminMainDashboard {...pageProps} />}
            {activePage === "trainers" && <AdminTrainers {...pageProps} />}
            {activePage === "founders" && <AdminFounders {...pageProps} />}
            {activePage === "revenue" && <AdminRevenue {...pageProps} />}
            {activePage === "nps" && <AdminNPS {...pageProps} />}
            {activePage === "plans" && <AdminPlans {...pageProps} />}
            {activePage === "reports" && <AdminReports {...pageProps} />}
            {activePage === "withdrawals" && (
              <AdminWithdrawals
                withdrawals={wdRows}
                loading={loading}
                onProcess={processWithdrawal}
                onRefresh={() => fetchData(sessionToken, month)}
              />
            )}
            {activePage === "wallets" && (
              <AdminWallets
                wallets={(data?.wallets ?? []) as Parameters<typeof AdminWallets>[0]["wallets"]}
                walletTotals={data?.wallet_totals as { bal: number; pend: number; earn: number } | undefined}
                loading={loading}
              />
            )}
          </div>
        </main>
      </div>

      <Dialog open={!!trainerDetail} onOpenChange={(o) => !o && setTrainerDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {trainerDetail?.name}
              <span className="block text-xs font-normal text-muted-foreground mt-1">{trainerDetail?.email}</span>
            </DialogTitle>
          </DialogHeader>
          {trainerDetail && (
            <Tabs defaultValue="tx">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30">
                <TabsTrigger value="tx">كل المعاملات</TabsTrigger>
                <TabsTrigger value="wallet">المحفظة</TabsTrigger>
                <TabsTrigger value="clients">العملاء</TabsTrigger>
                <TabsTrigger value="sub">اشتراكات</TabsTrigger>
              </TabsList>
              <TabsContent value="tx" className="mt-4">
                <div className="rounded-lg border max-h-[50vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                        <TableHead className="text-right">العمولة</TableHead>
                        <TableHead className="text-right">الصافي</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainerTxAll.map((t) => (
                        <TableRow key={String(t.id)}>
                          <TableCell>{TX_TYPE_AR[String(t.type)] ?? String(t.type)}</TableCell>
                          <TableCell className="tabular-nums">{Number(t.display_gross ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="tabular-nums">{Number(t.display_commission ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="tabular-nums">{Number(t.display_net ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-xs">
                            {t.created_at ? new Date(String(t.created_at)).toLocaleString("ar-SA") : "—"}
                          </TableCell>
                          <TableCell className="text-xs">{String(t.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="wallet" className="mt-4 space-y-2 text-sm">
                {trainerWallet ? (
                  <pre className="rounded-lg border bg-muted/20 p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(trainerWallet, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">لا توجد محفظة مسجلة.</p>
                )}
              </TabsContent>
              <TabsContent value="clients" className="mt-4">
                <ul className="space-y-2 text-sm">
                  {trainerClients.length === 0 ? (
                    <li className="text-muted-foreground">لا عملاء</li>
                  ) : (
                    trainerClients.map((c) => (
                      <li key={String((c as { id: string }).id)} className="border rounded-lg p-2">
                        <p className="font-medium">{(c as { name?: string }).name}</p>
                        <p className="text-xs text-muted-foreground">
                          منذ{" "}
                          {new Date(String((c as { created_at?: string }).created_at ?? 0)).toLocaleDateString("ar-SA")}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </TabsContent>
              <TabsContent value="sub" className="mt-4">
                <p className="text-sm mb-2 text-muted-foreground">
                  الباقة الحالية:{" "}
                  <span className="text-foreground font-medium">
                    {PLAN_AR[String(trainerDetail.plan)] ?? trainerDetail.plan ?? "—"}
                  </span>{" "}
                  — انتهاء:{" "}
                  {trainerDetail.subscription_end_date
                    ? new Date(trainerDetail.subscription_end_date).toLocaleDateString("ar-SA")
                    : "—"}
                </p>
                <div className="rounded-lg border max-h-[40vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainerSubTx.map((t) => (
                        <TableRow key={String(t.id)}>
                          <TableCell className="tabular-nums">{Number(t.display_gross ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-xs">
                            {t.created_at ? new Date(String(t.created_at)).toLocaleString("ar-SA") : "—"}
                          </TableCell>
                          <TableCell className="text-xs">{String(t.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={releaseOpen} onOpenChange={setReleaseOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تحرير الأرصدة المعلقة</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيتم تنفيذ الإجراء على الخادم. يمكنك متابعة النتيجة في التنبيه بعد الاكتمال. هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel type="button">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-primary hover:bg-primary-hover"
              onClick={(e) => {
                e.preventDefault();
                void runReleasePending();
              }}
              disabled={releaseBusy}
            >
              {releaseBusy ? "جاري التنفيذ..." : "تأكيد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
