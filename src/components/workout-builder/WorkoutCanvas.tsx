import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";

import { useWorkoutBuilderStore } from "@/stores/workoutBuilderStore";
import type { WorkoutDay } from "@/types/workout";

import { ExerciseItemDragPreview } from "./ExerciseItem";
import { WorkoutDayCard } from "./WorkoutDayCard";

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

function findDayIdForExercise(days: WorkoutDay[], exerciseInstanceId: string): string | null {
  for (const d of days) {
    if (d.exercises.some((e) => e.instanceId === exerciseInstanceId)) return d.id;
  }
  return null;
}

export function WorkoutCanvas() {
  const activeWeekIndex = useWorkoutBuilderStore((s) => s.activeWeekIndex);
  const weekDays = useWorkoutBuilderStore((s) => s.weekDays);
  const updateWeekDays = useWorkoutBuilderStore((s) => s.updateWeekDays);
  const getProgramSnapshot = useWorkoutBuilderStore((s) => s.getProgramSnapshot);

  const currentDays = weekDays[activeWeekIndex] ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeDrag = useMemo(() => {
    if (!activeId) return null;
    for (const d of currentDays) {
      const ex = d.exercises.find((e) => e.instanceId === activeId);
      if (ex) return { dayId: d.id, exercise: ex };
    }
    return null;
  }, [activeId, currentDays]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeInstanceId = String(active.id);
    const overId = String(over.id);

    const daysSnapshot = currentDays.map((d) => ({
      ...d,
      exercises: [...d.exercises],
    }));

    const sourceContainer =
      (active.data.current?.sortable?.containerId as string | undefined) ??
      findDayIdForExercise(daysSnapshot, activeInstanceId);
    if (!sourceContainer) return;

    let destContainer: string | null =
      (over.data.current?.sortable?.containerId as string | undefined) ??
      findDayIdForExercise(daysSnapshot, overId);

    if (overId.startsWith("day-drop-")) {
      destContainer = overId.replace("day-drop-", "");
    }

    if (!destContainer) return;

    const sourceDay = daysSnapshot.find((d) => d.id === sourceContainer);
    const destDay = daysSnapshot.find((d) => d.id === destContainer);
    if (!sourceDay || !destDay) return;

    const activeIndex =
      typeof active.data.current?.sortable?.index === "number"
        ? (active.data.current.sortable.index as number)
        : sourceDay.exercises.findIndex((e) => e.instanceId === activeInstanceId);
    if (activeIndex < 0) return;

    let overIndex: number;
    if (overId.startsWith("day-drop-")) {
      overIndex = destDay.exercises.length;
    } else if (typeof over.data.current?.sortable?.index === "number") {
      overIndex = over.data.current.sortable.index as number;
    } else {
      const idx = destDay.exercises.findIndex((e) => e.instanceId === overId);
      overIndex = idx >= 0 ? idx : destDay.exercises.length;
    }

    if (sourceContainer === destContainer) {
      if (activeIndex === overIndex) return;
      const newExercises = arrayMove(sourceDay.exercises, activeIndex, overIndex);
      const merged = daysSnapshot.map((d) =>
        d.id === sourceContainer ? { ...d, exercises: newExercises } : d,
      );
      updateWeekDays(activeWeekIndex, merged);
    } else {
      const newSource = [...sourceDay.exercises];
      const [removed] = newSource.splice(activeIndex, 1);
      const cleared = { ...removed, supersetId: undefined };
      const newDest = [...destDay.exercises];
      const insertAt = Math.min(overIndex, newDest.length);
      newDest.splice(insertAt, 0, cleared);
      const merged = daysSnapshot.map((d) => {
        if (d.id === sourceContainer) return { ...d, exercises: newSource };
        if (d.id === destContainer) return { ...d, exercises: newDest };
        return d;
      });
      updateWeekDays(activeWeekIndex, merged);
    }

    // eslint-disable-next-line no-console -- required for schema verification during DnD development
    console.log("[WorkoutBuilder] program after drag", getProgramSnapshot());
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        dir="rtl"
      >
        {currentDays.map((day) => (
          <WorkoutDayCard key={day.id} day={day} />
        ))}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeDrag ? (
          <ExerciseItemDragPreview
            dayId={activeDrag.dayId}
            workoutExercise={activeDrag.exercise}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
