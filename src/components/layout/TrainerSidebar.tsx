import { Link } from "react-router-dom";
import { LogOut, PanelRightClose, PanelRightOpen } from "lucide-react";
import { motion } from "framer-motion";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { TrainerNavItem } from "./trainerNavConfig";

const SIDEBAR_EXPANDED_PX = 290;
const SIDEBAR_COLLAPSED_PX = 72;

export interface TrainerSidebarProps {
  navItems: TrainerNavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isActive: (href: string) => boolean;
  trainerName: string;
  avatarFallback: string;
  avatarUrl?: string | null;
  currentPlanLabel: string;
  onLogout: () => void;
}

function NavLinkButton({
  item,
  active,
  collapsed,
}: {
  item: TrainerNavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const inner = (
    <Link
      to={item.href}
      className={`group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-all duration-300 ease-in-out hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.25)] active:scale-95 ${
        collapsed ? "justify-center" : ""
      } ${
        active
          ? "border-primary/20 bg-primary/[0.08] text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-card hover:text-foreground"
      }`}
    >
      <span
        className={`pointer-events-none absolute inset-y-2 end-0 w-[3px] rounded-full transition-colors ${
          active ? "bg-primary" : "bg-transparent"
        }`}
      />
      <item.icon
        className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary/80"}`}
        strokeWidth={1.5}
        aria-hidden
      />
      {!collapsed ? (
        <span
          className={`min-w-0 truncate text-sm ${active ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-foreground/80"}`}
        >
          {item.label}
        </span>
      ) : null}
    </Link>
  );

  if (!collapsed) {
    return inner;
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="left" className="font-medium">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Desktop trainer sidebar: spring width animation, RTL-aware accent rail, collapse to icon rail.
 */
export function TrainerSidebar({
  navItems,
  collapsed,
  onToggleCollapsed,
  isActive,
  trainerName,
  avatarFallback,
  avatarUrl,
  currentPlanLabel,
  onLogout,
}: TrainerSidebarProps) {
  const widthPx = collapsed ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX;

  return (
    <motion.aside
      initial={false}
      animate={{ width: widthPx }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className="relative hidden min-h-0 shrink-0 flex-col overflow-hidden border-e border-border bg-sidebar md:flex"
      aria-label="التنقل الرئيسي"
    >
      <div className="border-b border-border px-4 py-6">
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[0_0_28px_hsl(var(--primary)/0.18)] transition-all duration-300 ease-in-out hover:shadow-[0_12px_40px_-16px_hsl(var(--primary)/0.35)]">
            <span className="text-lg font-black text-primary">CB</span>
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="text-xl font-black tracking-tight text-primary">CoachBase</div>
              <div className="text-xs text-muted-foreground">لوحة تشغيل المدرب</div>
            </div>
          ) : null}
        </Link>
      </div>

      <div className="border-b border-border px-3 py-3">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <Avatar className="h-11 w-11 shrink-0 border border-border">
            <AvatarImage src={avatarUrl ?? undefined} alt={trainerName} />
            <AvatarFallback className="bg-card text-sm font-bold text-foreground">{avatarFallback}</AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-foreground">{trainerName}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                نشط
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 ps-3 pe-2">
        {navItems.map((item) => (
          <NavLinkButton key={`${item.href}-${item.label}`} item={item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-border px-2 py-4">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/50 px-2 py-2 text-xs font-medium text-muted-foreground transition-all duration-300 ease-in-out hover:border-primary/25 hover:bg-card hover:text-foreground active:scale-95"
          aria-pressed={collapsed}
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed ? <PanelRightOpen className="h-4 w-4" strokeWidth={1.5} /> : <PanelRightClose className="h-4 w-4" strokeWidth={1.5} />}
          {!collapsed ? <span>طي القائمة</span> : null}
        </button>

        {!collapsed ? (
          <div className="mb-3 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary">
            {currentPlanLabel}
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="mb-3 flex w-full items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-1 py-2 text-[10px] font-semibold text-primary">
                <span className="max-w-[2.5rem] truncate">{currentPlanLabel.slice(0, 4)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">{currentPlanLabel}</TooltipContent>
          </Tooltip>
        )}

        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={onLogout}
                className="h-11 w-full justify-center rounded-xl p-0 text-muted-foreground transition-all duration-300 ease-in-out hover:bg-card hover:text-foreground active:scale-95"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">تسجيل الخروج</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={onLogout}
            className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-all duration-300 ease-in-out hover:bg-card hover:text-foreground active:scale-95"
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
            تسجيل الخروج
          </Button>
        )}
      </div>
    </motion.aside>
  );
}
