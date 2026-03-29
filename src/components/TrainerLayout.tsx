import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";

import TrainerNotifications from "@/components/TrainerNotifications";
import GlobalSearch from "@/components/GlobalSearch";
import LanguageToggle from "@/components/LanguageToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const TrainerLayout = ({
  children,
  title,
  onQuickAdd,
}: {
  children: React.ReactNode;
  title?: string;
  onQuickAdd?: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const isAr = i18n.language === "ar";

  const desktopNavItems = useMemo(() => [
    { label: t("nav.home"), href: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.clients"), href: "/clients", icon: Users },
    { label: t("nav.programs"), href: "/programs", icon: ClipboardList },
    { label: t("nav.templates"), href: "/templates", icon: BookOpen },
    { label: t("nav.nutrition"), href: "/nutrition", icon: Utensils },
    { label: t("nav.calendar"), href: "/calendar", icon: CalendarDays },
    { label: t("nav.payments"), href: "/payments", icon: CreditCard },
    { label: t("nav.copilot"), href: "/copilot", icon: Sparkles },
    { label: t("nav.settings"), href: "/settings", icon: Settings2 },
  ], [t]);

  const mobileNavItems = useMemo(() => [
    { label: t("nav.home"), href: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.clients"), href: "/clients", icon: Users },
    { label: t("nav.addNew"), href: "/clients", icon: Plus },
    { label: t("nav.calendar"), href: "/calendar", icon: CalendarDays },
    { label: t("nav.settings"), href: "/settings", icon: Settings2 },
  ], [t]);

  const currentPlanLabel = profile?.subscription_plan === "pro"
    ? t("plans.pro")
    : profile?.subscription_plan === "basic"
      ? t("plans.basic")
      : t("plans.free");
  const [searchOpen, setSearchOpen] = useState(false);

  const trainerName = profile?.full_name?.trim() || (isAr ? "المدرب" : "Trainer");
  const firstName = trainerName.split(" ")[0];
  const avatarFallback = trainerName
    .split(" ")
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.morning", { name: firstName });
    if (hour < 17) return t("dashboard.greeting.afternoon", { name: firstName });
    return t("dashboard.greeting.evening", { name: firstName });
  }, [firstName, t]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <GlobalSearch externalOpen={searchOpen} onExternalClose={() => setSearchOpen(false)} />
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className={`hidden w-[290px] shrink-0 ${isAr ? "border-l" : "border-r"} border-border bg-sidebar md:flex md:flex-col`}>
          <div className="border-b border-border px-6 py-7">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[0_0_28px_hsl(var(--primary)/0.18)]">
                <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight text-primary">CoachBase</div>
                <div className="text-xs text-muted-foreground">{t("nav.trainerPanel")}</div>
              </div>
            </Link>
          </div>

          <div className="border-b border-border px-6 py-7">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={trainerName} />
                <AvatarFallback className="bg-card text-sm font-bold text-foreground">{avatarFallback}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-foreground">{trainerName}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-primary">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  {t("common.active")}
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 px-4 py-7">
            {desktopNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  to={item.href}
                  className={`group relative flex items-center gap-3 rounded-xl border border-transparent px-4 py-3.5 transition-all duration-200 ${
                    active
                      ? "bg-primary/[0.08] border-primary/20 text-foreground"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <span className={`absolute inset-y-2 ${isAr ? "right-0" : "left-0"} w-[3px] rounded-full transition-colors ${active ? "bg-primary" : "bg-transparent"}`} />
                  <item.icon className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary/80"}`} strokeWidth={1.5} />
                  <span className={`text-sm ${active ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-foreground/80"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border px-4 py-6">
            <div className="mb-4 rounded-full border border-primary/20 bg-primary/10 px-4 py-2.5 text-center text-xs font-semibold text-primary">
              {currentPlanLabel}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.5} />
              {t("nav.logout")}
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col bg-background">
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4 px-5 py-5 md:px-8">
              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{title || greeting}</div>
              </div>
              <div className="flex items-center gap-3">
                <LanguageToggle />
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="hidden md:flex h-11 items-center gap-2 rounded-full border border-border bg-card/70 px-4 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground"
                >
                  <Search className="h-4 w-4" strokeWidth={1.5} />
                  <span>{t("common.search")}</span>
                  <kbd className="hidden lg:inline text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground/60">⌘K</kbd>
                </button>
                <TrainerNotifications />
                <button
                  type="button"
                  onClick={onQuickAdd ?? (() => navigate("/clients"))}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-all duration-200 hover:border-primary/30 hover:text-primary"
                  aria-label={t("nav.addNew")}
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

          <main className="flex-1 px-5 pb-24 pt-8 md:px-8 md:pb-10">{children}</main>
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
