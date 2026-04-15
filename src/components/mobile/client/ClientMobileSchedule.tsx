import { CalendarDays } from "lucide-react";

/** Placeholder — wire to program week / calendar when ready */
export default function ClientMobileSchedule() {
  return (
    <div className="space-y-4" dir="rtl">
      <h1 className="text-xl font-bold text-white">الجدول</h1>
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-white/[0.06] px-6 py-16 text-center"
        style={{ background: "#0A0A0A" }}
      >
        <CalendarDays className="h-10 w-10 text-white/25" />
        <p className="text-sm text-white/60">عرض جدول أيام التمرين قريباً هنا.</p>
      </div>
    </div>
  );
}
