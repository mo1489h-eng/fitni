import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Link2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Fragment, useState } from "react";

import type { WorkoutDay } from "@/types/workout";
import type { TrainingGoal } from "@/lib/workout-builder-utils";
import type { WorkoutBuilderDayActions, WorkoutBuilderExerciseActions } from "@/stores/workoutBuilderStore";
import { totalSetsForDay } from "@/lib/workout-volume";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { AddExerciseButton } from "./AddExerciseButton";
import { ExerciseItem } from "./ExerciseItem";
import { ExerciseSelectorDialog } from "./ExerciseSelectorDialog";

type Props = {
  day: WorkoutDay;
  dayActions: WorkoutBuilderDayActions;
  exerciseActions: WorkoutBuilderExerciseActions;
};

function EmptyDayDropZone({ dayId }: { dayId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-drop-${dayId}`,
  });

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-40 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-4 text-center text-sm transition-colors",
        isOver
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border/90 bg-muted/15 text-muted-foreground",
      )}
      animate={
        isOver
          ? { scale: 1.01, opacity: 1 }
          : {
              opacity: [0.72, 1, 0.72],
              boxShadow: [
                "0 0 0 0 hsl(var(--primary) / 0)",
                "0 0 0 4px hsl(var(--primary) / 0.12)",
                "0 0 0 0 hsl(var(--primary) / 0)",
              ],
            }
      }
      transition={
        isOver
          ? { duration: 0.2 }
          : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <span className="relative z-10 font-medium">
        {isOver ? "أفلت هنا" : "اسحب تمارين من يوم آخر أو أضف من المكتبة"}
      </span>
    </motion.div>
  );
}

export function WorkoutDayCard({ day, dayActions, exerciseActions }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const { linkSupersetWithNext, addExerciseToDay, smartFillDay } = dayActions;

  const ids = day.exercises.map((e) => e.instanceId);
  const isWorkout = day.type === "workout";
  const setCount = totalSetsForDay(day);

  const runSmartFill = (goal: TrainingGoal) => {
    smartFillDay(day.id, goal);
    setFillOpen(false);
  };

  return (
    <Card className="flex h-full min-h-[320px] flex-col border-border bg-card/70 shadow-sm" dir="rtl">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">{day.title}</h2>
          <p className="text-[11px] text-muted-foreground">
            {day.type === "rest"
              ? "يوم راحة"
              : day.type === "active-recovery"
                ? "استشفاء نشط"
                : "تمرين"}
          </p>
        </div>
        {isWorkout ? (
          <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
            {setCount} مجموعة
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {!isWorkout ? (
          <p className="text-center text-sm text-muted-foreground">لا تمارين في هذا اليوم</p>
        ) : day.exercises.length === 0 ? (
          <div className="flex flex-1 flex-col gap-3">
            <SortableContext id={day.id} items={[]} strategy={verticalListSortingStrategy}>
              <EmptyDayDropZone dayId={day.id} />
            </SortableContext>
            <Popover open={fillOpen} onOpenChange={setFillOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2 border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  تعبئة ذكية لليوم
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="center" dir="rtl">
                <p className="mb-2 px-1 text-xs text-muted-foreground">اختر الهدف</p>
                <div className="flex flex-col gap-1.5">
                  <Button type="button" size="sm" className="w-full" onClick={() => runSmartFill("hypertrophy")}>
                    ضخامة عضلية
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => runSmartFill("strength")}
                  >
                    قوة
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <SortableContext id={day.id} items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-0">
              {day.exercises.map((ex, index) => (
                <Fragment key={ex.instanceId}>
                  <ExerciseItem
                    dayId={day.id}
                    workoutExercise={ex}
                    exerciseActions={exerciseActions}
                  />
                  {index < day.exercises.length - 1 ? (
                    <div className="flex justify-center py-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
                        onClick={() => linkSupersetWithNext(day.id, ex.instanceId)}
                      >
                        <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ربط سوبرسيت مع التالي
                      </Button>
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </SortableContext>
        )}

        {isWorkout ? (
          <>
            <AddExerciseButton onClick={() => setPickerOpen(true)} />
            <ExerciseSelectorDialog
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              currentDay={day}
              onPick={(exercise) => addExerciseToDay(day.id, exercise)}
            />
          </>
        ) : null}
      </div>
    </Card>
  );
}
