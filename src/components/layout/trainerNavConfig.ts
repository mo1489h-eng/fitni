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
import { COACH_PREFIX } from "@/lib/app-routes";

const C = COACH_PREFIX;

/** Single primary navigation entry for the trainer shell (Arabic labels, RTL UI). */
export interface TrainerNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const desktopNavItems: TrainerNavItem[] = [
  { label: "الرئيسية", href: `${C}/dashboard`, icon: LayoutDashboard },
  { label: "العملاء", href: `${C}/clients`, icon: Users },
  { label: "البرامج", href: `${C}/programs`, icon: ClipboardList },
  { label: "القوالب", href: `${C}/templates`, icon: BookOpen },
  { label: "التغذية", href: `${C}/nutrition`, icon: Utensils },
  { label: "التقويم", href: `${C}/calendar`, icon: CalendarDays },
  { label: "الأرباح", href: `${C}/earnings`, icon: Wallet },
  { label: "الاشتراكات", href: `${C}/payments`, icon: CreditCard },
  { label: "التحديات", href: `${C}/challenges`, icon: Trophy },
  { label: "المكتبة التعليمية", href: `${C}/vault`, icon: GraduationCap },
  { label: "CoachBase AI", href: `${C}/copilot`, icon: Sparkles },
  { label: "الإعدادات", href: `${C}/settings`, icon: Settings2 },
];

export const mobileDockItems: TrainerNavItem[] = [
  { label: "الرئيسية", href: `${C}/dashboard`, icon: LayoutDashboard },
  { label: "العملاء", href: `${C}/clients`, icon: Users },
  { label: "إضافة", href: `${C}/clients`, icon: Plus },
  { label: "التقويم", href: `${C}/calendar`, icon: CalendarDays },
  { label: "الإعدادات", href: `${C}/settings`, icon: Settings2 },
];
