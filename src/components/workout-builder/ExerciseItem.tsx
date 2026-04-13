import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Timer, Unlink } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkoutExercise } from "@/types/workout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkoutBuilderStore } from "@/stores/workoutBuilderStore";

const REST_PRESETS: { label: string; sec: number }[] = [
  { label: "30ث", sec: 30 },
  { label: "60ث", sec: 60 },
  { label: "90ث", sec: 90 },
  { label: "2د", sec: 120 },
];

function formatRestLabel(seconds: number | null | undefined): string {
  if (seconds == null) return "راحة";
  if (seconds < 60) return `${seconds}ث`;
  if (seconds === 60) return "1د";
  const m = Math.floor(seconds / 60);
  const r = seconds % 60;
  return r ? `${m}د ${r}ث` : `${m}د`;
}

function ExerciseItemCard({
  dayId,
  ex,
  dragHandleProps,
  isOverlay,
}: {
  dayId: string;
  ex: WorkoutExercise;
  dragHandleProps?: Record<string, unknown>;
  isOverlay?: boolean;
}) {
  const patchSet = useWorkoutBuilderStore((s) => s.patchSet);
  const unlinkSuperset = useWorkoutBuilderStore((s) => s.unlinkSuperset);
  const applyRestToAllSets = useWorkoutBuilderStore((s) => s.applyRestToAllSets);
  const [restOpen, setRestOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/80 shadow-sm backdrop-blur-sm",
        ex.supersetId && "border-s-4 border-s-primary/80 bg-primary/[0.06]",
        isOverlay && "scale-[1.02] shadow-xl ring-2 ring-primary/25",
      )}
    >
      <div className="flex items-stretch gap-0">
        <button
          type="button"
          className={cn(
            "flex w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-e-none border-e border-border bg-muted/40 text-muted-foreground hover:bg-muted/70 active:cursor-grabbing active:scale-105",
            isOverlay && "cursor-grabbing",
          )}
          {...(dragHandleProps ?? {})}
          aria-label="سحب التمرين"
        >
          <GripVertical className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <div className="min-w-0 flex-1 space-y-2 p-3 ps-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              {ex.supersetId ? (
                <span className="mb-1 inline-block rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  سوبرسيت
                </span>
              ) : null}
              <h3 className="text-sm font-bold text-foreground">{ex.exercise.name}</h3>
              <p className="text-[11px] text-muted-foreground">
                {ex.exercise.muscleGroup} · {ex.exercise.equipment}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-dashed text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Timer className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {formatRestLabel(ex.sets[0]?.restTime)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end" dir="rtl">
                  <p className="mb-2 px-1 text-[10px] text-muted-foreground">راحة بين المجموعات</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {REST_PRESETS.map((p) => (
                      <Button
                        key={p.sec}
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => {
                          applyRestToAllSets(dayId, ex.instanceId, p.sec);
                          setRestOpen(false);
                        }}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {ex.supersetId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground"
                  onClick={() => unlinkSuperset(dayId, ex.instanceId)}
                >
                  <Unlink className="h-3.5 w-3.5" strokeWidth={1.5} />
                  فك
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full min-w-[280px] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] text-muted-foreground">
                  <th className="px-2 py-1.5 text-start font-medium">مجموعة</th>
                  <th className="px-2 py-1.5 text-start font-medium">وزن</th>
                  <th className="px-2 py-1.5 text-start font-medium">تكرار</th>
                  <th className="px-2 py-1.5 text-start font-medium">RPE</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map((set, si) => (
                  <tr key={set.id} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1 text-muted-foreground">{si + 1}</td>
                    <td className="px-1 py-0.5">
                      <Input
                        type="number"
                        className="h-7 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
                        value={set.weight ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          patchSet(dayId, ex.instanceId, set.id, {
                            weight: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <Input
                        type="number"
                        className="h-7 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
                        value={set.reps ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          patchSet(dayId, ex.instanceId, set.id, {
                            reps: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <Input
                        type="number"
                        className="h-7 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
                        value={set.rpe ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          patchSet(dayId, ex.instanceId, set.id, {
                            rpe: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  dayId: string;
  workoutExercise: WorkoutExercise;
};

export function ExerciseItem({ dayId, workoutExercise }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: workoutExercise.instanceId,
    data: { type: "exercise" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ExerciseItemCard
        dayId={dayId}
        ex={workoutExercise}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function ExerciseItemDragPreview({
  dayId,
  workoutExercise,
}: Props) {
  return (
    <div className="pointer-events-none w-[min(100vw-2rem,28rem)] max-w-[28rem]">
      <ExerciseItemCard dayId={dayId} ex={workoutExercise} isOverlay />
    </div>
  );
}
