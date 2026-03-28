import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus, Moon, Dumbbell, Copy, RotateCcw, ChevronDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExerciseDBSearch, { type SelectedExercise } from "@/components/program/ExerciseDBSearch";
import ExerciseCard from "@/components/program/ExerciseCard";
import { LocalDay, LocalExercise, genId } from "./types";

interface Props {
  day: LocalDay;
  dayIndex: number;
  allDays: LocalDay[];
  onUpdateDay: (idx: number, updater: (d: LocalDay) => LocalDay) => void;
  onToast: (msg: string) => void;
}

const DayEditor = ({ day, dayIndex, allDays, onUpdateDay, onToast }: Props) => {
  const [showExSearch, setShowExSearch] = useState(false);
  const [addingToWarmup, setAddingToWarmup] = useState(false);
  const [copyDayDialog, setCopyDayDialog] = useState(false);

  const updateDay = useCallback(
    (updater: (d: LocalDay) => LocalDay) => onUpdateDay(dayIndex, updater),
    [dayIndex, onUpdateDay]
  );

  const addExercisesFromDB = (selected: SelectedExercise[]) => {
    const newExercises: LocalExercise[] = selected.map(item => ({
      id: genId(),
      name: item.name_ar,
      name_en: item.name_en,
      muscle: item.bodyPart,
      gifUrl: item.gifUrl,
      sets: 3,
      reps: 10,
      weight: 0,
      video_url: "",
      rest_seconds: 60,
      tempo: "",
      rpe: null,
      notes: "",
      is_warmup: addingToWarmup,
    }));

    if (addingToWarmup) {
      updateDay(d => ({ ...d, warmup: [...d.warmup, ...newExercises] }));
    } else {
      updateDay(d => ({ ...d, exercises: [...d.exercises, ...newExercises] }));
    }
    setAddingToWarmup(false);
  };

  const removeExercise = (exId: string, isWarmup = false) => {
    updateDay(d => ({
      ...d,
      exercises: isWarmup ? d.exercises : d.exercises.filter(e => e.id !== exId),
      warmup: isWarmup ? d.warmup.filter(e => e.id !== exId) : d.warmup,
    }));
  };

  const duplicateExercise = (exId: string) => {
    updateDay(d => {
      const idx = d.exercises.findIndex(e => e.id === exId);
      if (idx === -1) return d;
      const exs = [...d.exercises];
      exs.splice(idx + 1, 0, { ...exs[idx], id: genId(), supersetWith: undefined });
      return { ...d, exercises: exs };
    });
  };

  const moveExercise = (exId: string, dir: "up" | "down") => {
    updateDay(d => {
      const exs = [...d.exercises];
      const idx = exs.findIndex(e => e.id === exId);
      const t = dir === "up" ? idx - 1 : idx + 1;
      if (t < 0 || t >= exs.length) return d;
      [exs[idx], exs[t]] = [exs[t], exs[idx]];
      return { ...d, exercises: exs };
    });
  };

  const updateExField = (exId: string, field: keyof LocalExercise, value: any, isWarmup = false) => {
    updateDay(d => ({
      ...d,
      exercises: isWarmup ? d.exercises : d.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e),
      warmup: isWarmup ? d.warmup.map(e => e.id === exId ? { ...e, [field]: value } : e) : d.warmup,
    }));
  };

  const toggleSuperset = (exId: string) => {
    updateDay(d => {
      const exs = [...d.exercises];
      const idx = exs.findIndex(e => e.id === exId);
      if (idx === -1 || idx >= exs.length - 1) return d;
      const current = exs[idx];
      const next = exs[idx + 1];
      if (current.supersetWith === next.id) {
        exs[idx] = { ...current, supersetWith: undefined };
        exs[idx + 1] = { ...next, supersetWith: undefined };
      } else {
        exs[idx] = { ...current, supersetWith: next.id };
        exs[idx + 1] = { ...next, supersetWith: current.id };
      }
      return { ...d, exercises: exs };
    });
  };

  const toggleRestDay = () => {
    updateDay(d => ({
      ...d,
      isRest: !d.isRest,
      exercises: !d.isRest ? [] : d.exercises,
      warmup: !d.isRest ? [] : d.warmup,
    }));
  };

  const copyDayTo = (targetIdx: number) => {
    onUpdateDay(targetIdx, d => ({
      ...d,
      exercises: day.exercises.map(e => ({ ...e, id: genId(), supersetWith: undefined })),
      warmup: day.warmup.map(e => ({ ...e, id: genId() })),
      isRest: false,
      label: day.label,
    }));
    setCopyDayDialog(false);
    onToast("تم نسخ اليوم");
  };

  // Rest day
  if (day.isRest) {
    return (
      <div className="space-y-3">
        <Card className="p-6 text-center border-dashed">
          <Moon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm font-medium text-muted-foreground mb-1">يوم راحة</p>
          <p className="text-[10px] text-muted-foreground/60 mb-3">استرخِ واسمح لعضلاتك بالتعافي</p>
          <Button variant="outline" size="sm" className="text-xs" onClick={toggleRestDay}>
            تحويل ليوم تدريب
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Day Header */}
      <Card className="p-4 border-r-2 border-r-primary">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <Dumbbell className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <Input
              value={day.label}
              onChange={e => updateDay(d => ({ ...d, label: e.target.value }))}
              placeholder="تسمية اليوم (مثل: صدر وترايسبس)"
              className="border-0 bg-transparent text-base font-bold p-0 h-auto focus-visible:ring-0"
            />
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="text-[10px] h-7 gap-1" onClick={() => setCopyDayDialog(true)}>
              <Copy className="w-3 h-3" strokeWidth={1.5} />نسخ
            </Button>
            <button
              onClick={toggleRestDay}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              يوم راحة
            </button>
          </div>
        </div>
      </Card>

      {/* Warmup Section */}
      <Collapsible>
        <Card className="overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
              <span className="text-sm font-medium text-foreground">الإحماء</span>
              <span className="text-[10px] text-muted-foreground">{day.warmup.length} تمارين</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t border-border p-3 space-y-2">
              {day.warmup.map(ex => (
                <ExerciseCard
                  key={ex.id} ex={ex} isWarmup
                  onUpdate={(field, val) => updateExField(ex.id, field, val, true)}
                  onRemove={() => removeExercise(ex.id, true)}
                />
              ))}
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs h-8"
                onClick={() => { setAddingToWarmup(true); setShowExSearch(true); }}>
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />إضافة إحماء
              </Button>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Exercises */}
      <div className="space-y-2">
        {day.exercises.map((ex, idx) => {
          const prevEx = idx > 0 ? day.exercises[idx - 1] : null;
          const isSuperset = ex.supersetWith !== undefined;
          const isFirstInSuperset = prevEx?.supersetWith === ex.id;

          return (
            <div key={ex.id}>
              {isFirstInSuperset && (
                <div className="flex items-center gap-2 my-1">
                  <div className="flex-1 h-px bg-primary/30" />
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px]">SS سوبرسيت</Badge>
                  <div className="flex-1 h-px bg-primary/30" />
                </div>
              )}
              <ExerciseCard
                ex={ex}
                isSuperset={isSuperset || isFirstInSuperset}
                onUpdate={(field, val) => updateExField(ex.id, field, val)}
                onRemove={() => removeExercise(ex.id)}
                onDuplicate={() => duplicateExercise(ex.id)}
                onMoveUp={idx > 0 ? () => moveExercise(ex.id, "up") : undefined}
                onMoveDown={idx < day.exercises.length - 1 ? () => moveExercise(ex.id, "down") : undefined}
                onSuperset={idx < day.exercises.length - 1 ? () => toggleSuperset(ex.id) : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Add Exercise Button */}
      <Button
        className="w-full gap-2 h-12 text-sm"
        variant="outline"
        onClick={() => { setAddingToWarmup(false); setShowExSearch(true); }}
      >
        <Plus className="w-5 h-5" strokeWidth={1.5} />إضافة تمرين
      </Button>

      {/* Exercise DB Search Dialog */}
      <ExerciseDBSearch
        open={showExSearch}
        onOpenChange={setShowExSearch}
        onSelect={addExercisesFromDB}
      />

      {/* Copy Day Dialog */}
      <Dialog open={copyDayDialog} onOpenChange={setCopyDayDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>نسخ اليوم إلى</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {allDays.map((d, idx) => {
              if (idx === dayIndex) return null;
              return (
                <button key={`${d.dayName}-${idx}`} onClick={() => copyDayTo(idx)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.03] transition-all">
                  <span className="text-sm font-medium text-foreground">{d.dayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.isRest ? "راحة" : `${d.exercises.length} تمارين`}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DayEditor;
