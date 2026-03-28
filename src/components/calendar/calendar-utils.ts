export const DAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
export const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const SESSION_TYPES = [
  { value: "تدريب شخصي", color: "hsl(142 71% 45%)", bg: "hsl(142 71% 45% / 0.12)", text: "hsl(142 71% 65%)" },
  { value: "متابعة", color: "hsl(217 91% 60%)", bg: "hsl(217 91% 60% / 0.12)", text: "hsl(217 91% 75%)" },
  { value: "تقييم", color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.12)", text: "hsl(38 92% 70%)" },
  { value: "تغذية", color: "hsl(280 65% 60%)", bg: "hsl(280 65% 60% / 0.12)", text: "hsl(280 65% 75%)" },
  { value: "أونلاين", color: "hsl(190 80% 50%)", bg: "hsl(190 80% 50% / 0.12)", text: "hsl(190 80% 70%)" },
  { value: "استراحة", color: "hsl(0 0% 40%)", bg: "hsl(0 0% 40% / 0.12)", text: "hsl(0 0% 60%)" },
];

export const DURATIONS = [
  { value: 30, label: "30 دقيقة" },
  { value: 45, label: "45 دقيقة" },
  { value: 60, label: "60 دقيقة" },
  { value: 90, label: "90 دقيقة" },
];

export const LOCATIONS = ["جيم", "أونلاين", "منزل العميل", "خارجي"];

export type ViewMode = "monthly" | "weekly" | "daily";

export interface Session {
  id: string;
  trainer_id: string;
  client_id: string;
  session_type: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  notes: string | null;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

export function getSessionTypeStyle(type: string) {
  return SESSION_TYPES.find((t) => t.value === type) || SESSION_TYPES[0];
}

export function getDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const period = hour >= 12 ? "م" : "ص";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${period}`;
}

export function formatTimeShort(t: string): string {
  return t.slice(0, 5);
}

export function getEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function hasConflict(
  sessions: Session[],
  date: string,
  startTime: string,
  duration: number,
  excludeId?: string,
): Session | null {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + duration;
  for (const s of sessions) {
    if (s.session_date !== date) continue;
    if (excludeId && s.id === excludeId) continue;
    const sStart = timeToMinutes(s.start_time);
    const sEnd = sStart + s.duration_minutes;
    if (newStart < sEnd && newEnd > sStart) return s;
  }
  return null;
}

export function getWeekDays(currentDate: Date): Date[] {
  const d = new Date(currentDate);
  const dayOfWeek = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export function isWeekend(dayIndex: number): boolean {
  return dayIndex === 5 || dayIndex === 6; // Friday, Saturday
}
