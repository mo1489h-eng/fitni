import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Moon, Dumbbell, Sun,
} from "lucide-react";
import ExerciseCard from "./ExerciseCard";
import { LocalExercise, genId } from "./types";

export interface EditorDay {
  id: string;
  label: string;
  type: "training" | "rest" | "active_rest";
  exercises: LocalExercise[];
}

interface Props {
  day: EditorDay | null;
  onUpdateLabel: (label: string) => void;
  onUpdateType: (type: EditorDay["type"]) => void;
  onUpdateExercise: (exId: string, field: keyof LocalExercise, value: any) => void;
  onRemoveExercise: (exId: string) => void;
  onDuplicateExercise: (exId: string) => void;
  onMoveExercise: (exId: string, dir: "up" | "down") => void;
  onToggleSuperset: (exId: string) => void;
  onOpenLibrary: () => void;
}

const DAY_TYPES: { value: EditorDay["type"]; label: string; icon: typeof Dumbbell }[] = [
  { value: "training", label: "تدريب", icon: Dumbbell },
  { value: "rest", label: "راحة", icon: Moon },
  { value: "active_rest", label: "راحة نشطة", icon: Sun },
];

const DayWorkoutEditor = ({
  day, onUpdateLabel, onUpdateType,
  onUpdateExercise, onRemoveExercise, onDuplicateExercise,
  onMoveExercise, onToggleSuperset, onOpenLibrary,
}: Props) => {
  if (!day) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Dumbbell className="w-12 h-12 text-muted-foreground/20 mx-auto" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">اختر يوماً من القائمة الجانبية</p>
        </div>
      </div>
    );
  }

  const isRest = day.type === "rest" || day.type === "active_rest";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Day Header */}
      <div className="p-4 border-b border-border space-y-3">
        <Input
          value={day.label}
          onChange={e => onUpdateLabel(e.target.value)}
          placeholder="اسم اليوم (مثال: صدر وترايسبس)"
          className="border-0 bg-transparent text-lg font-bold p-0 h-auto focus-visible:ring-0"
        />
        <div className="flex gap-2">
          {DAY_TYPES.map(dt => {
            const isActive = day.type === dt.value;
            return (
              <button
                key={dt.value}
                onClick={() => onUpdateType(dt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:border-primary/20"
                }`}
              >
                <dt.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {dt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isRest ? (
            <div className="text-center py-16 space-y-3">
              {day.type === "rest" ? (
                <Moon className="w-12 h-12 text-muted-foreground/20 mx-auto" strokeWidth={1} />
              ) : (
                <Sun className="w-12 h-12 text-muted-foreground/20 mx-auto" strokeWidth={1} />
              )}
              <p className="text-sm font-medium text-muted-foreground">
                {day.type === "rest" ? "يوم راحة" : "راحة نشطة"}
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                {day.type === "rest"
                  ? "استرخِ واسمح لعضلاتك بالتعافي"
                  : "تمارين خفيفة: مشي، تمدد، يوجا"}
              </p>
            </div>
          ) : (
            <>
              {/* Exercises */}
              {day.exercises.map((ex, idx) => {
                const prevEx = idx > 0 ? day.exercises[idx - 1] : null;
                const isSuperset = ex.supersetWith !== undefined;
                const isFirstInSuperset = prevEx?.supersetWith === ex.id;

                return (
                  <div key={ex.id}>
                    {isFirstInSuperset && (
                      <div className="flex items-center gap-2 my-2">
                        <div className="flex-1 h-px bg-primary/30" />
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px]">سوبرسيت</Badge>
                        <div className="flex-1 h-px bg-primary/30" />
                      </div>
                    )}
                    <ExerciseCard
                      ex={ex}
                      isSuperset={isSuperset || isFirstInSuperset}
                      onUpdate={(field, val) => onUpdateExercise(ex.id, field, val)}
                      onRemove={() => onRemoveExercise(ex.id)}
                      onDuplicate={() => onDuplicateExercise(ex.id)}
                      onMoveUp={idx > 0 ? () => onMoveExercise(ex.id, "up") : undefined}
                      onMoveDown={idx < day.exercises.length - 1 ? () => onMoveExercise(ex.id, "down") : undefined}
                      onSuperset={idx < day.exercises.length - 1 ? () => onToggleSuperset(ex.id) : undefined}
                    />
                  </div>
                );
              })}

              {/* Add Exercise */}
              <Button
                className="w-full gap-2 h-12 text-sm"
                variant="outline"
                onClick={onOpenLibrary}
              >
                <Plus className="w-5 h-5" strokeWidth={1.5} />إضافة تمرين
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DayWorkoutEditor;
