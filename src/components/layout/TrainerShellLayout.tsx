import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, X } from "lucide-react";

import GlobalSearch from "@/components/GlobalSearch";
import { PricingPlansModal } from "@/components/pricing/PricingPlansModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/store/useUIStore";

import { desktopNavItems, mobileDockItems } from "./trainerNavConfig";
import { TrainerSidebar } from "./TrainerSidebar";
import { TrainerTopbar } from "./TrainerTopbar";

export interface TrainerShellLayoutProps {
  children: React.ReactNode;
  title?: string;
  onQuickAdd?: () => void;
}

/**
 * Application shell for authenticated trainer routes: animated desktop sidebar,
 * sticky top bar, mobile slide-in navigation, and bottom dock (small screens).
 */
export function TrainerShellLayout({ children, title, onQuickAdd }: TrainerShellLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const isSidebarCollapsed = useUIStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);
  const isMobileDrawerOpen = useUIStore((s) => s.isMobileDrawerOpen);
  const setMobileDrawerOpen = useUIStore((s) => s.setMobileDrawerOpen);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname, setActiveTab]);

  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileDrawerOpen]);

  const trainerName = profile?.full_name?.trim() || "المدرب";
  const firstName = trainerName.split(" ")[0];
  const avatarFallback = trainerName
    .split(" ")
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentPlanLabel =
    profile?.subscription_plan === "pro"
      ? "الخطة الاحترافية"
      : profile?.subscription_plan === "basic"
        ? "الخطة الأساسية"
        : "الفترة المجانية";

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

  const isActive = useCallback(
    (href: string) => {
      if (href === "/trainer-dashboard" || href === "/dashboard") {
        return location.pathname === "/trainer-dashboard" || location.pathname === "/dashboard";
      }
      return location.pathname.startsWith(href);
    },
    [location.pathname],
  );

  const quick = onQuickAdd ?? (() => navigate("/clients"));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalSearch externalOpen={searchOpen} onExternalClose={() => setSearchOpen(false)} />
      <PricingPlansModal open={pricingOpen} onOpenChange={setPricingOpen} />

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <TrainerSidebar
          navItems={desktopNavItems}
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
          isActive={isActive}
          trainerName={trainerName}
          avatarFallback={avatarFallback}
          avatarUrl={profile?.avatar_url ?? null}
          currentPlanLabel={currentPlanLabel}
          onLogout={handleLogout}
        />

        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <TrainerTopbar
            title={title}
            greeting={greeting}
            trainerName={trainerName}
            onSearch={() => setSearchOpen(true)}
            onQuickAdd={quick}
            onOpenMobileNav={() => setMobileDrawerOpen(true)}
            onOpenPricing={() => setPricingOpen(true)}
          />

          <main className="flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10 md:pt-8">{children}</main>
        </div>
      </div>

      <AnimatePresence>
        {isMobileDrawerOpen ? (
          <motion.div
            key="mobile-shell"
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              aria-label="إغلاق القائمة"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="قائمة التنقل"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="absolute inset-y-0 flex w-[min(100%,20rem)] max-w-[85vw] flex-col border-s border-border bg-sidebar shadow-2xl end-0"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <span className="text-lg font-black text-primary">CoachBase</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              </div>

              <div className="flex items-center gap-3 border-b border-border px-4 py-4">
                <Avatar className="h-11 w-11 border border-border">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={trainerName} />
                  <AvatarFallback className="bg-card text-sm font-bold text-foreground">{avatarFallback}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">{trainerName}</div>
                  <div className="text-xs text-muted-foreground">{currentPlanLabel}</div>
                </div>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {desktopNavItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={`m-${item.href}-${item.label}`}
                      to={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-300 ease-in-out active:scale-95 ${
                        active
                          ? "bg-primary/[0.08] text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-card hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
                      <span className={`text-sm ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-border px-3 py-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-3 rounded-xl py-6 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    void handleLogout();
                  }}
                >
                  <LogOut className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                  تسجيل الخروج
                </Button>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar/95 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5 px-1 py-2">
          {mobileDockItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={`dock-${item.href}-${item.label}`}
                to={item.href}
                className="flex flex-col items-center justify-center rounded-xl py-2 text-center transition-all duration-300 ease-in-out hover:bg-card/70 active:scale-95"
              >
                <item.icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} aria-hidden />
                <span className={`mt-1 max-w-full truncate px-1 text-[11px] ${active ? "font-semibold text-primary" : "text-transparent"}`}>
                  {active ? item.label : "."}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
