import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { toast } from "sonner";
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

type NavPage =
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
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [activePage, setActivePage] = useState<NavPage>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      if (result && typeof result === "object" && "error" in result && result.error === "unauthorized") {
        clearSession();
        setError("انتهت الجلسة أو بيانات الدخول غير صحيحة");
        return;
      }
      if (fnError || result?.error) {
        if (fnError) {
          toast.error("تعذر الاتصال بلوحة التحكم. تحقق من الشبكة وحاول مجدداً.");
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
    const trimmed = password.trim();
    setLoading(true);
    const { data: result, error: fnError } = await supabase.functions.invoke("admin-dashboard", {
      body: { password: trimmed },
    });
    setLoading(false);
    if (result && typeof result === "object" && "error" in result && result.error === "unauthorized") {
      setError("كلمة مرور خاطئة");
      return;
    }
    if (fnError || !result?.session_token) {
      if (fnError) {
        setError("تعذر التحقق من كلمة المرور. تحقق من الشبكة أو أعد المحاولة.");
      } else {
        setError("حدث خطأ");
      }
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

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    const { data: result, error: fnError } = await supabase.functions.invoke("admin-dashboard", {
      body: { session_token: sessionToken, action, ...payload },
    });
    if (result && typeof result === "object" && "error" in result && result.error === "unauthorized") {
      clearSession();
      setError("انتهت الجلسة");
      return null;
    }
    if (fnError && (!result || typeof result !== "object")) {
      toast.error("تعذر تنفيذ الإجراء. حاول مجدداً.");
      return null;
    }
    if (result?.session_token) {
      setSession(result.session_token as string);
      setSessionToken(result.session_token as string);
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

  if (!authed) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center" dir="rtl">
        <Card className="w-full max-w-sm">
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
    if (result && typeof result === "object" && "error" in result && result.error) {
      throw new Error(String(result.error));
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex" dir="rtl">
      {/* Sidebar */}
      <aside className={`sticky top-0 h-screen bg-[#0a0a0a] border-l border-border flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-56"}`}>
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && <span className="text-sm font-bold text-primary">CoachBase</span>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <LayoutDashboard className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
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

        {/* Logout */}
        <div className="p-2 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            {!sidebarCollapsed && <span>خروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-6">
          {activePage === "dashboard" && <AdminMainDashboard {...pageProps} />}
          {activePage === "trainers" && <AdminTrainers {...pageProps} />}
          {activePage === "founders" && <AdminFounders {...pageProps} />}
          {activePage === "revenue" && <AdminRevenue {...pageProps} />}
          {activePage === "nps" && <AdminNPS {...pageProps} />}
          {activePage === "plans" && <AdminPlans {...pageProps} />}
          {activePage === "reports" && <AdminReports {...pageProps} />}
          {activePage === "withdrawals" && (
            <AdminWithdrawals
              withdrawals={(data?.withdrawals as Record<string, unknown>[]) ?? []}
              loading={loading}
              onProcess={processWithdrawal}
              onRefresh={() => fetchData(sessionToken, month)}
            />
          )}
          {activePage === "wallets" && (
            <AdminWallets
              wallets={(data?.wallets as Record<string, unknown>[]) ?? []}
              walletTotals={data?.wallet_totals as { bal: number; pend: number; earn: number } | undefined}
              loading={loading}
            />
          )}
        </div>
      </main>
    </div>
  );
}
