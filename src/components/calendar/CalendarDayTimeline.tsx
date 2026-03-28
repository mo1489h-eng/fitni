import { useEffect, useRef, useMemo } from "react";
import {
  Session, Client, getDateStr, getSessionTypeStyle,
  timeToMinutes, formatTimeShort, getEndTime,
} from "./calendar-utils";

const HOUR_HEIGHT = 72;
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

export default function CalendarDayTimeline({
  currentDate, sessions, clients, onClickSession, onClickSlot,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayStr = getDateStr(new Date());
  const dateStr = getDateStr(currentDate);
  const isToday = dateStr === todayStr;
  const now = new Date();

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [clients]);

  const daySessions = sessions.filter((s) => s.session_date === dateStr);

  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = now.getHours();
      const scrollTo = Math.max(0, (currentHour - START_HOUR - 2) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [dateStr]);

  const formatHour = (h: number) => {
    const period = h >= 12 ? "م" : "ص";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:00 ${period}`;
  };

  const currentTimeTop = () => {
    const min = now.getHours() * 60 + now.getMinutes();
    return ((min / 60) - START_HOUR) * HOUR_HEIGHT;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top + e.currentTarget.scrollTop;
          const minutesFromStart = (y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
          const roundedHour = Math.floor(minutesFromStart / 30) * 30;
          const h = Math.floor(roundedHour / 60);
          const m = roundedHour % 60;
          onClickSlot(dateStr, `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        }}
      >
        <div className="grid grid-cols-[72px_1fr] relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
          {/* Time labels */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full text-[11px] text-muted-foreground text-left pr-3 -translate-y-1/2 tabular-nums"
                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Main column */}
          <div className={`relative border-r border-border ${isToday ? "bg-primary/[0.02]" : ""}`}>
            {/* Hour grid lines */}
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full border-t border-border/40"
                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
              />
            ))}

            {/* Sessions */}
            {daySessions.map((s) => {
              const startMin = timeToMinutes(s.start_time);
              const top = ((startMin / 60) - START_HOUR) * HOUR_HEIGHT;
              const height = (s.duration_minutes / 60) * HOUR_HEIGHT;
              const typeStyle = getSessionTypeStyle(s.session_type);

              return (
                <div
                  key={s.id}
                  className="absolute left-2 right-2 rounded-xl px-4 py-2.5 cursor-pointer transition-all duration-150 hover:ring-1 hover:ring-foreground/20 z-10"
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 28)}px`,
                    backgroundColor: typeStyle.bg,
                    borderRight: `4px solid ${typeStyle.color}`,
                  }}
                  onClick={(e) => { e.stopPropagation(); onClickSession(s); }}
                >
                  <div className="text-sm font-bold truncate" style={{ color: typeStyle.text }}>
                    {clientMap[s.client_id]}
                  </div>
                  <div className="text-xs opacity-70 mt-0.5" style={{ color: typeStyle.text }}>
                    {s.session_type} · {formatTimeShort(s.start_time)} - {formatTimeShort(getEndTime(s.start_time, s.duration_minutes))}
                  </div>
                  {s.notes && height > 60 && (
                    <div className="text-[10px] opacity-50 mt-1 truncate" style={{ color: typeStyle.text }}>
                      {s.notes}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Current time line */}
            {isToday && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimeTop()}px` }}
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-destructive -mr-1.5 shrink-0" />
                  <div className="flex-1 h-[2px] bg-destructive" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
