import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Settings2,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";

/** Single primary navigation entry for the trainer shell (Arabic labels, RTL UI). */
export interface TrainerNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const desktopNavItems: TrainerNavItem[] = [
  { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
  { label: "العملاء", href: "/clients", icon: Users },
  { label: "البرامج", href: "/programs", icon: ClipboardList },
  { label: "القوالب", href: "/templates", icon: BookOpen },
  { label: "التغذية", href: "/nutrition", icon: Utensils },
  { label: "التقويم", href: "/calendar", icon: CalendarDays },
  { label: "الأرباح", href: "/earnings", icon: Wallet },
  { label: "الاشتراكات", href: "/payments", icon: CreditCard },
  { label: "التحديات", href: "/challenges", icon: Trophy },
  { label: "المكتبة التعليمية", href: "/vault", icon: GraduationCap },
  { label: "CoachBase AI", href: "/copilot", icon: Sparkles },
  { label: "الإعدادات", href: "/settings", icon: Settings2 },
];

export const mobileDockItems: TrainerNavItem[] = [
  { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
  { label: "العملاء", href: "/clients", icon: Users },
  { label: "إضافة", href: "/clients", icon: Plus },
  { label: "التقويم", href: "/calendar", icon: CalendarDays },
  { label: "الإعدادات", href: "/settings", icon: Settings2 },
];
