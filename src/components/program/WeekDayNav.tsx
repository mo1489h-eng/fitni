import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown, ChevronLeft, Plus, Copy, RotateCcw, Moon, Dumbbell, Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export interface WeekData {
  weekNumber: number;
  days: DayData[];
}

export interface DayData {
  id: string;
  label: string;
  type: "training" | "rest" | "active_rest";
  exerciseCount: number;
}

interface Props {
  weeks: WeekData[];
  activeWeek: number;
  activeDayId: string | null;
  onSelectDay: (weekIdx: number, dayId: string) => void;
  onAddDay: (weekIdx: number) => void;
  onAddWeek: () => void;
  onDuplicateWeek: (weekIdx: number) => void;
  onCreateDeload: (weekIdx: number) => void;
  onRenameDayLabel: (weekIdx: number, dayId: string, label: string) => void;
  onChangeDayType: (weekIdx: number, dayId: string, type: DayData["type"]) => void;
}

const WeekDayNav = ({
  weeks, activeWeek, activeDayId,
  onSelectDay, onAddDay, onAddWeek,
  onDuplicateWeek, onCreateDeload,
  onRenameDayLabel, onChangeDayType,
}: Props) => {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([0]));
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggleWeek = (idx: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const startEdit = (dayId: string, currentLabel: string) => {
    setEditingDay(dayId);
    setEditValue(currentLabel);
  };

  const commitEdit = (weekIdx: number, dayId: string) => {
    if (editValue.trim()) {
      onRenameDayLabel(weekIdx, dayId, editValue.trim());
    }
    setEditingDay(null);
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">هيكل البرنامج</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">{weeks.length} أسبوع</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {weeks.map((week, wIdx) => {
            const isExpanded = expandedWeeks.has(wIdx);
            return (
              <div key={wIdx} className="rounded-lg overflow-hidden">
                {/* Week Header */}
                <button
                  onClick={() => toggleWeek(wIdx)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-right transition-colors rounded-lg ${
                    activeWeek === wIdx ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "" : "-rotate-90"}`} strokeWidth={1.5} />
                    <span className="text-xs font-bold">الأسبوع {week.weekNumber}</span>
                    <span className="text-[9px] text-muted-foreground">{week.days.length} أيام</span>
                  </div>
                </button>

                {/* Days */}
                {isExpanded && (
                  <div className="mr-4 space-y-0.5 mt-0.5">
                    {week.days.map((day) => {
                      const isActive = activeDayId === day.id;
                      const isRest = day.type === "rest" || day.type === "active_rest";

                      return (
                        <div
                          key={day.id}
                          onClick={() => onSelectDay(wIdx, day.id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all text-right ${
                            isActive
                              ? "bg-primary/15 border border-primary/30"
                              : "hover:bg-muted/40 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isRest ? (
                              <Moon className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" strokeWidth={1.5} />
                            ) : (
                              <Dumbbell className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/60"}`} strokeWidth={1.5} />
                            )}
                            {editingDay === day.id ? (
                              <Input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(wIdx, day.id)}
                                onKeyDown={e => e.key === "Enter" && commitEdit(wIdx, day.id)}
                                className="h-6 text-[11px] px-1 py-0 border-0 bg-transparent focus-visible:ring-1"
                                autoFocus
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <span className={`text-[11px] font-medium truncate ${isRest ? "text-muted-foreground" : "text-foreground"}`}>
                                {day.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!isRest && day.exerciseCount > 0 && (
                              <span className="text-[9px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                                {day.exerciseCount}
                              </span>
                            )}
                            {isRest && (
                              <span className="text-[8px] text-muted-foreground">
                                {day.type === "active_rest" ? "نشطة" : "راحة"}
                              </span>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); startEdit(day.id, day.label); }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5"
                            >
                              <Pencil className="w-2.5 h-2.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Day */}
                    <button
                      onClick={() => onAddDay(wIdx)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" strokeWidth={2} />إضافة يوم
                    </button>

                    {/* Week Actions */}
                    <div className="flex gap-1 px-2 pb-2">
                      <button
                        onClick={() => onDuplicateWeek(wIdx)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[9px] text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-primary/30 transition-all"
                      >
                        <Copy className="w-2.5 h-2.5" strokeWidth={1.5} />تكرار
                      </button>
                      <button
                        onClick={() => onCreateDeload(wIdx)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[9px] text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-primary/30 transition-all"
                      >
                        <RotateCcw className="w-2.5 h-2.5" strokeWidth={1.5} />ديلود
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Add Week */}
      <div className="p-2 border-t border-border">
        <button
          onClick={onAddWeek}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors border border-dashed border-primary/30"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />إضافة أسبوع
        </button>
      </div>
    </div>
  );
};

export default WeekDayNav;
