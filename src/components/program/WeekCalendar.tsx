import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, Copy, Moon, Dumbbell, Timer, Target, Zap,
  RotateCcw,
} from "lucide-react";
import { LocalDay } from "./types";

interface Props {
  days: LocalDay[];
  activeDay: number;
  activeWeek: number;
  totalWeeks: number;
  onSelectDay: (idx: number) => void;
  onWeekChange: (week: number) => void;
  onDuplicateWeek: () => void;
  onCreateDeload?: () => void;
}

const calcDuration = (day: LocalDay) => {
  const total = [...day.warmup, ...day.exercises].reduce(
    (s, e) => s + e.sets * (e.rest_seconds > 0 ? (45 + e.rest_seconds) / 60 : 1.5), 0
  );
  return Math.round(total);
};

const calcVolume = (day: LocalDay) =>
  day.exercises.reduce((s, e) => s + e.sets * e.reps * e.weight, 0);

const WeekCalendar = ({
  days, activeDay, activeWeek, totalWeeks,
  onSelectDay, onWeekChange, onDuplicateWeek, onCreateDeload,
}: Props) => {
  return (
    <div className="space-y-3">
      {/* Week Nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            disabled={activeWeek <= 1} onClick={() => onWeekChange(activeWeek - 1)}>
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </Button>
          <span className="text-sm font-bold text-foreground min-w-[80px] text-center">
            الأسبوع {activeWeek}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            disabled={activeWeek >= totalWeeks} onClick={() => onWeekChange(activeWeek + 1)}>
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          </Button>
          <span className="text-[10px] text-muted-foreground">من {totalWeeks}</span>
        </div>
        <div className="flex gap-1.5">
          {onCreateDeload && (
            <Button variant="outline" size="sm" className="gap-1 text-[10px] h-7" onClick={onCreateDeload}>
              <RotateCcw className="w-3 h-3" strokeWidth={1.5} />ديلود
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1 text-[10px] h-7" onClick={onDuplicateWeek}>
            <Copy className="w-3 h-3" strokeWidth={1.5} />تكرار
          </Button>
        </div>
      </div>

      {/* Day Cards Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, idx) => {
          const isActive = activeDay === idx;
          const exCount = day.exercises.length;

          return (
            <button
              key={`${day.dayName}-${idx}`}
              onClick={() => onSelectDay(idx)}
              className={`rounded-xl p-2 text-center transition-all border-2 min-h-[88px] flex flex-col items-center justify-center gap-1 ${
                isActive
                  ? day.isRest
                    ? "border-muted-foreground/30 bg-muted/50"
                    : "border-primary bg-primary/5"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <p className={`text-[10px] font-bold ${isActive ? (day.isRest ? "text-muted-foreground" : "text-primary") : "text-muted-foreground"}`}>
                {day.dayName}
              </p>

              {day.isRest ? (
                <Moon className="w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
              ) : (
                <>
                  <Dumbbell className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "text-muted-foreground/60"}`} strokeWidth={1.5} />
                  <span className="text-[9px] text-muted-foreground">{exCount}</span>
                </>
              )}

              {isActive && !day.isRest && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Day Summary Strip */}
      {days[activeDay] && !days[activeDay].isRest && (
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" strokeWidth={1.5} />
            {days[activeDay].exercises.length} تمارين
          </span>
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" strokeWidth={1.5} />
            ~{calcDuration(days[activeDay])} دقيقة
          </span>
          {calcVolume(days[activeDay]) > 0 && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" strokeWidth={1.5} />
              {(calcVolume(days[activeDay]) / 1000).toFixed(1)}k كجم
            </span>
          )}
          {days[activeDay].warmup.length > 0 && (
            <span>{days[activeDay].warmup.length} إحماء</span>
          )}
        </div>
      )}
    </div>
  );
};

export default WeekCalendar;
