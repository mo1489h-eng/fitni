import { useEffect, useRef, useMemo } from "react";
import {
  DAYS_AR, Session, Client, getDateStr, getSessionTypeStyle,
  timeToMinutes, isWeekend, formatTimeShort, getEndTime, getWeekDays,
} from "./calendar-utils";

const HOUR_HEIGHT = 60;
const START_HOUR = 5;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

interface Props {
  currentDate: Date;
  sessions: Session[];
  clients: Client[];
  onClickSession: (session: Session) => void;
  onClickSlot: (dateStr: string, time: string) => void;
}

export default function CalendarWeekGrid({
  currentDate, sessions, clients, onClickSession, onClickSlot,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayStr = getDateStr(new Date());
  const now = new Date();

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [clients]);

  const weekDays = getWeekDays(currentDate);

  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = now.getHours();
      const scrollTo = Math.max(0, (currentHour - START_HOUR - 2) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, []);

  const getSessionStyle = (s: Session) => {
    const startMin = timeToMinutes(s.start_time);
    const top = ((startMin / 60) - START_HOUR) * HOUR_HEIGHT;
    const height = (s.duration_minutes / 60) * HOUR_HEIGHT;
    return { top: `${top}px`, height: `${Math.max(height, 20)}px` };
  };

  const currentTimeTop = () => {
    const min = now.getHours() * 60 + now.getMinutes();
    return ((min / 60) - START_HOUR) * HOUR_HEIGHT;
  };

  const formatHour = (h: number) => {
    const period = h >= 12 ? "م" : "ص";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12} ${period}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border shrink-0">
        <div className="border-l border-border" />
        {weekDays.map((wd, i) => {
          const dateStr = getDateStr(wd);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              className={`
                text-center py-3 border-l border-border
                ${isWeekend(i) ? "bg-[hsl(0_0%_3.5%)]" : ""}
                ${isToday ? "bg-primary/5" : ""}
              `}
            >
              <div className="text-[10px] text-muted-foreground uppercase">{DAYS_AR[i]}</div>
              <div
                className={`
                  text-lg font-bold mt-0.5 w-8 h-8 rounded-full flex items-center justify-center mx-auto
                  ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}
                `}
              >
                {wd.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
          {/* Time labels */}
          <div className="relative border-l border-border">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full text-[10px] text-muted-foreground text-left pr-2 -translate-y-1/2"
                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((wd, colIdx) => {
            const dateStr = getDateStr(wd);
            const isToday = dateStr === todayStr;
            const daySessions = sessions.filter((s) => s.session_date === dateStr);

            return (
              <div
                key={dateStr}
                className={`
                  relative border-l border-border
                  ${isWeekend(colIdx) ? "bg-[hsl(0_0%_3.5%)]" : ""}
                  ${isToday ? "bg-primary/[0.03]" : ""}
                `}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const minutesFromStart = (y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
                  const roundedHour = Math.floor(minutesFromStart / 30) * 30;
                  const h = Math.floor(roundedHour / 60);
                  const m = roundedHour % 60;
                  onClickSlot(dateStr, `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                }}
              >
                {/* Hour grid lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-border/50"
                    style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Sessions */}
                {daySessions.map((s) => {
                  const pos = getSessionStyle(s);
                  const typeStyle = getSessionTypeStyle(s.session_type);
                  return (
                    <div
                      key={s.id}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer transition-all duration-150 hover:ring-1 hover:ring-foreground/20 overflow-hidden z-10"
                      style={{
                        ...pos,
                        backgroundColor: typeStyle.bg,
                        borderRight: `3px solid ${typeStyle.color}`,
                      }}
                      onClick={(e) => { e.stopPropagation(); onClickSession(s); }}
                    >
                      <div className="text-[10px] font-bold truncate" style={{ color: typeStyle.text }}>
                        {clientMap[s.client_id]}
                      </div>
                      <div className="text-[9px] opacity-70" style={{ color: typeStyle.text }}>
                        {formatTimeShort(s.start_time)} - {formatTimeShort(getEndTime(s.start_time, s.duration_minutes))}
                      </div>
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {isToday && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${currentTimeTop()}px` }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-destructive -mr-1 shrink-0" />
                      <div className="flex-1 h-[2px] bg-destructive" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
