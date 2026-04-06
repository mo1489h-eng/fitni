import { useMemo, useState } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Flame, Dumbbell, TrendingUp } from "lucide-react";

const DAYS_AR = ["سبت", "جمعة", "خميس", "أربعاء", "ثلاثاء", "اثنين", "أحد"];

interface AttendanceDay {
  date: string;
  dayName: string;
}

const AttendanceGrid = () => {
  const { token } = usePortalToken();
  const [hoveredDay, setHoveredDay] = useState<{ date: string; name: string; x: number; y: number } | null>(null);

  const { data: attendance } = useQuery({
    queryKey: ["portal-attendance", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_attendance" as any, { p_token: token! });
      if (error) throw error;
      return (data as any[])?.map((d: any) => ({
        date: d.workout_date,
        dayName: d.day_name,
      })) as AttendanceDay[];
    },
    enabled: !!token,
  });

  const { grid, workoutMap, stats } = useMemo(() => {
    const map = new Map<string, string>();
    (attendance || []).forEach((a) => map.set(a.date, a.dayName));

    const today = new Date();
    const todayStr = formatDate(today);

    // Build 12 weeks (84 days) grid ending today
    // Grid: 7 rows (days) x 12 cols (weeks)
    const endDay = new Date(today);
    // Find the Saturday of this week (end of row 0)
    const dayOfWeek = endDay.getDay(); // 0=Sun
    const daysUntilSat = (6 - dayOfWeek + 7) % 7;
    const endSat = new Date(endDay);
    endSat.setDate(endDay.getDate() + daysUntilSat);

    const weeks = 12;
    const startDate = new Date(endSat);
    startDate.setDate(endSat.getDate() - (weeks * 7 - 1));

    const cells: { date: string; isWorkout: boolean; isToday: boolean; isFuture: boolean }[][] = [];
    let current = new Date(startDate);

    for (let w = 0; w < weeks; w++) {
      const week: typeof cells[0] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = formatDate(current);
        week.push({
          date: dateStr,
          isWorkout: map.has(dateStr),
          isToday: dateStr === todayStr,
          isFuture: current > today,
        });
        current.setDate(current.getDate() + 1);
      }
      cells.push(week);
    }

    // Stats
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let weekCount = 0;
    let monthCount = 0;
    let longestStreak = 0;
    let currentStreak = 0;

    // Sort all dates for streak calc
    const allDates = Array.from(map.keys()).sort();
    for (let i = 0; i < allDates.length; i++) {
      const d = new Date(allDates[i]);
      if (d >= thisWeekStart && d <= now) weekCount++;
      if (d >= thisMonthStart && d <= now) monthCount++;

      if (i === 0) {
        currentStreak = 1;
      } else {
        const prev = new Date(allDates[i - 1]);
        const diff = (d.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        currentStreak = diff === 1 ? currentStreak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
    }

    return {
      grid: cells,
      workoutMap: map,
      stats: { weekCount, monthCount, longestStreak, total: allDates.length },
    };
  }, [attendance]);

  return (
    <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-primary" strokeWidth={1.5} />
        <h3 className="font-bold text-white text-sm">سجل الحضور</h3>
        <span className="text-[10px] text-[hsl(0_0%_35%)] mr-auto">آخر 12 أسبوع</span>
      </div>

      {/* Grid */}
      <div className="flex gap-0.5 relative" dir="ltr">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 ml-1.5 shrink-0">
          {DAYS_AR.map((d, i) => (
            <div key={d} className="h-[14px] flex items-center">
              {i % 2 === 0 && (
                <span className="text-[9px] text-[hsl(0_0%_30%)] leading-none">{d}</span>
              )}
            </div>
          ))}
        </div>

        {/* Weeks grid */}
        <div className="flex gap-0.5 flex-1 overflow-hidden">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5 flex-1">
              {week.map((day, di) => (
                <div
                  key={day.date}
                  className={`h-[14px] rounded-[3px] transition-all cursor-default ${
                    day.isFuture
                      ? "bg-transparent"
                      : day.isWorkout
                      ? "bg-[#16a34a] hover:brightness-125"
                      : "bg-[hsl(0_0%_10%)] hover:bg-[hsl(0_0%_14%)]"
                  } ${day.isToday ? "ring-1 ring-primary ring-offset-0" : ""}`}
                  onMouseEnter={(e) => {
                    if (day.isFuture) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredDay({
                      date: day.date,
                      name: workoutMap.get(day.date) || "",
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-[200] rounded-lg border border-[hsl(0_0%_15%)] bg-[hsl(0_0%_8%)] px-3 py-2 shadow-xl pointer-events-none"
          style={{
            left: hoveredDay.x,
            top: hoveredDay.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-[11px] text-white font-medium" dir="rtl">
            {new Date(hoveredDay.date).toLocaleDateString("ar-SA", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
          {hoveredDay.name ? (
            <p className="text-[10px] text-primary mt-0.5" dir="rtl">{hoveredDay.name}</p>
          ) : (
            <p className="text-[10px] text-[hsl(0_0%_40%)] mt-0.5" dir="rtl">لا يوجد تمرين</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 justify-end" dir="rtl">
        <span className="text-[9px] text-[hsl(0_0%_35%)]">أقل</span>
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[hsl(0_0%_10%)]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#16a34a]/50" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#16a34a]" />
        <span className="text-[9px] text-[hsl(0_0%_35%)]">أكثر</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { icon: Dumbbell, value: stats.weekCount, label: "الأسبوع الحالي" },
          { icon: Flame, value: stats.longestStreak, label: "أطول سلسلة" },
          { icon: TrendingUp, value: stats.monthCount, label: "هذا الشهر" },
        ].map((s, i) => (
          <div key={i} className="bg-[hsl(0_0%_4%)] rounded-lg p-2.5 text-center">
            <s.icon className="w-3.5 h-3.5 text-primary mx-auto mb-1" strokeWidth={1.5} />
            <p className="text-sm font-bold text-white">{s.value}</p>
            <p className="text-[9px] text-[hsl(0_0%_35%)]">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default AttendanceGrid;
