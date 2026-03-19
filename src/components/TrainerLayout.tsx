import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";

import TrainerNotifications from "@/components/TrainerNotifications";
import GlobalSearch from "@/components/GlobalSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const desktopNavItems = [
  { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
  { label: "العملاء", href: "/clients", icon: Users },
  { label: "البرامج", href: "/programs", icon: ClipboardList },
  { label: "التغذية", href: "/nutrition", icon: Utensils },
  { label: "التقويم", href: "/calendar", icon: CalendarDays },
  { label: "الاشتراكات", href: "/payments", icon: CreditCard },
  { label: "AI كوبايلت", href: "/clients", icon: Sparkles },
  { label: "الإعدادات", href: "/settings", icon: Settings2 },
];

const mobileNavItems = [
  { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
  { label: "العملاء", href: "/clients", icon: Users },
  { label: "إضافة", href: "/clients", icon: Plus },
  { label: "التقويم", href: "/calendar", icon: CalendarDays },
  { label: "الإعدادات", href: "/settings", icon: Settings2 },
];

const TrainerLayout = ({
  children,
  title,
  onQuickAdd,
}: {
  children: React.ReactNode;
  title?: string;
  onQuickAdd?: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const trainerName = profile?.full_name?.trim() || "المدرب";
  const firstName = trainerName.split(" ")[0];
  const avatarFallback = trainerName
    .split(" ")
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `صباح الخير، ${firstName}`;
    if (hour < 17) return `مساء الخير، ${firstName}`;
    return `أهلاً، ${firstName}`;
  }, [firstName]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-[290px] shrink-0 border-l border-border bg-sidebar md:flex md:flex-col">
          <div className="border-b border-border px-6 py-6">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[0_0_28px_hsl(var(--primary)/0.18)]">
                <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight text-primary">fitni</div>
                <div className="text-xs text-muted-foreground">لوحة تشغيل المدرب</div>
              </div>
            </Link>
          </div>

          <div className="border-b border-border px-6 py-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={trainerName} />
                <AvatarFallback className="bg-card text-sm font-bold text-foreground">{avatarFallback}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-foreground">{trainerName}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-primary">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  نشط
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            {desktopNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  to={item.href}
                  className={`group relative flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 transition-all duration-200 ${
                    active ? "bg-card text-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <span className={`absolute inset-y-2 right-0 w-0.5 rounded-full ${active ? "bg-primary" : "bg-transparent"}`} />
                  <item.icon className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary/80"}`} strokeWidth={1.5} />
                  <span className={`text-sm ${active ? "font-semibold text-foreground" : "font-medium text-muted-foreground group-hover:text-foreground/80"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border px-4 py-5">
            <div className="mb-4 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-center text-xs font-semibold text-primary">
              {profile?.subscription_plan === "pro" ? "الخطة الاحترافية" : "الخطة الأساسية"}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.5} />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col bg-background">
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">{title || greeting}</div>
              </div>
              <div className="flex items-center gap-3">
                <TrainerNotifications />
                <button
                  type="button"
                  onClick={onQuickAdd ?? (() => navigate("/clients"))}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-all duration-200 hover:border-primary/30 hover:text-primary"
                  aria-label="إضافة"
                >
                  <Plus className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <Avatar className="h-11 w-11 border border-border">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={trainerName} />
                  <AvatarFallback className="bg-card text-sm font-bold text-foreground">{avatarFallback}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-sidebar md:hidden">
        <div className="grid grid-cols-5 px-2 py-2">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={`${item.href}-${item.label}`} to={item.href} className="flex flex-col items-center justify-center rounded-xl py-2 text-center transition-colors hover:bg-card/70">
                <item.icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                <span className={`mt-1 text-[11px] ${active ? "font-semibold text-primary" : "text-transparent"}`}>{active ? item.label : "."}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default TrainerLayout;
