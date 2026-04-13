import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";

import { exerciseLibrary } from "@/mocks/mockWorkouts";
import { getSuggestedExercisesForDay, MUSCLE_FILTER_OPTIONS } from "@/lib/exercise-ai-suggestions";
import type { Exercise, MuscleGroup, WorkoutDay } from "@/types/workout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exercise: Exercise) => void;
  /** When set, drives mock AI suggestions for this day. */
  currentDay?: WorkoutDay | null;
};

export function ExerciseSelectorDialog({ open, onOpenChange, onPick, currentDay }: Props) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<MuscleGroup | "all">("all");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setCategory("all");
      return;
    }
    const t = window.setTimeout(() => {
      searchRef.current?.focus();
      searchRef.current?.select();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const aiSuggested = useMemo(() => {
    if (!currentDay?.exercises?.length) return [];
    return getSuggestedExercisesForDay(currentDay.exercises, exerciseLibrary);
  }, [currentDay]);

  const filtered = useMemo(() => {
    let list = exerciseLibrary;
    if (category !== "all") {
      list = list.filter((e) => e.muscleGroup === category);
    }
    const qq = q.trim().toLowerCase();
    if (!qq) return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(qq) ||
        e.muscleGroup.includes(qq) ||
        e.equipment.toLowerCase().includes(qq),
    );
  }, [q, category]);

  const handlePick = (ex: Exercise) => {
    onPick(ex);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-lg flex-col overflow-hidden p-0" dir="rtl">
        <DialogHeader className="border-b border-border px-5 pb-3 pt-5">
          <DialogTitle>مكتبة التمارين</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-5 pb-5 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو العضلة..."
              className="h-11 border-border bg-background pe-10 ps-3 shadow-sm transition-shadow focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="بحث تمارين"
            />
          </div>

          {currentDay && aiSuggested.length > 0 ? (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                مقترحات ذكية لهذا اليوم
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {aiSuggested.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handlePick(ex)}
                    className="shrink-0 rounded-full border border-primary/25 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/50 hover:bg-primary/10"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="-mx-1">
            <div className="flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {MUSCLE_FILTER_OPTIONS.map((opt) => {
                const selected = category === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pe-1">
            {filtered.length === 0 ? (
              <li className="py-10 text-center text-sm text-muted-foreground">لا نتائج</li>
            ) : (
              filtered.map((ex) => (
                <li key={ex.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-between gap-3 rounded-xl py-3 text-start font-normal hover:bg-muted/80"
                    onClick={() => handlePick(ex)}
                  >
                    <span className="font-medium text-foreground">{ex.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {ex.muscleGroup} · {ex.equipment}
                    </span>
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
