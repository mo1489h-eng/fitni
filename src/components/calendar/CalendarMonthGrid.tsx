import { useMemo } from "react";
import {
  DAYS_AR, Session, Client, getDateStr, getSessionTypeStyle,
  isWeekend, formatTimeShort,
} from "./calendar-utils";

interface Props {
  year: number;
  month: number;
  sessions: Session[];
  clients: Client[];
  selectedDay: string | null;
  onSelectDay: (dateStr: string) => void;
  onAddSession: (dateStr: string) => void;
}

export default function CalendarMonthGrid({
  year, month, sessions, clients, selectedDay, onSelectDay, onAddSession,
}: Props) {
  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [clients]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = getDateStr(today);

  const getDayDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getSessionsForDay = (day: number) =>
    sessions.filter((s) => s.session_date === getDayDateStr(day));

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const isPast = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(23, 59, 59);
    return d < today;
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_AR.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-3 ${
              isWeekend(i) ? "text-muted-foreground/60" : "text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`e-${i}`} className="border-b border-l border-border first:border-l-0" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = getDayDateStr(day);
          const daySessions = getSessionsForDay(day);
          const selected = selectedDay === dateStr;
          const dayOfWeek = (firstDayOfMonth + i) % 7;
          const weekend = isWeekend(dayOfWeek);
          const past = isPast(day) && !isToday(day);

          return (
            <button
              key={day}
              onClick={() => onSelectDay(dateStr)}
              onDoubleClick={() => onAddSession(dateStr)}
              className={`
                relative flex flex-col p-1.5 border-b border-l border-border first:border-l-0
                text-right transition-all duration-150 group min-h-[80px]
                ${selected ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}
                ${weekend && !selected ? "bg-[hsl(0_0%_3.5%)]" : ""}
                ${past ? "opacity-50" : ""}
                ${!selected ? "hover:bg-[hsl(0_0%_6%)]" : ""}
              `}
            >
              {/* Day number */}
              <span
                className={`
                  text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center self-end mb-1
                  ${isToday(day)
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-foreground"
                  }
                `}
              >
                {day}
              </span>

              {/* Session pills */}
              <div className="flex flex-col gap-0.5 w-full flex-1">
                {daySessions.slice(0, 3).map((s) => {
                  const style = getSessionTypeStyle(s.session_type);
                  return (
                    <div
                      key={s.id}
                      className="text-[10px] leading-tight truncate px-1.5 py-0.5 rounded flex items-center gap-0.5"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {(s as any).is_completed && <span className="text-emerald-400">✓</span>}
                      {(s as any).confirmation_status === "confirmed" && !(s as any).is_completed && <span className="text-emerald-400 opacity-60">●</span>}
                      {(s as any).confirmation_status === "declined" && <span className="text-red-400 opacity-60">●</span>}
                      <span className="font-medium">{clientMap[s.client_id]?.split(" ")[0]}</span>
                      <span className="opacity-60 mr-1">{formatTimeShort(s.start_time)}</span>
                    </div>
                  );
                })}
                {daySessions.length > 3 && (
                  <span className="text-[9px] text-muted-foreground text-center">
                    +{daySessions.length - 3} أخرى
                  </span>
                )}
              </div>

              {/* Hover add indicator */}
              {!past && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {daySessions.length === 0 && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-primary">
                        <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
