import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getArabicBodyPart,
  BODY_PART_CONFIG,
} from "@/lib/exercise-translations";
import { getExerciseImageUrl } from "@/lib/exercise-image-proxy";
import type { LocalExercise } from "@/components/program/types";
import { Dumbbell } from "lucide-react";

interface Props {
  exercise: LocalExercise | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ExercisePreviewSheet = ({ exercise, open, onOpenChange }: Props) => {
  if (!exercise) return null;

  const ar = exercise.name;
  const en = exercise.name_en ?? "";
  const gif =
    exercise.exerciseDbId
      ? getExerciseImageUrl(exercise.exerciseDbId)
      : exercise.gifUrl || "";
  const partColor = BODY_PART_CONFIG[exercise.muscle]?.color ?? "bg-muted text-muted-foreground";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md p-0 flex flex-col" dir="rtl">
        <SheetHeader className="p-4 border-b border-border space-y-1">
          <SheetTitle className="text-right text-base">معاينة التمرين</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="aspect-square max-h-[280px] rounded-xl overflow-hidden bg-muted flex items-center justify-center mx-auto border border-border/50">
              {gif ? (
                <img
                  src={gif}
                  alt={ar}
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              ) : (
                <Dumbbell className="w-24 h-24 text-muted-foreground/35" strokeWidth={1.25} />
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{ar}</p>
              {en ? <p className="text-sm text-muted-foreground">{en}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Badge className={partColor}>{getArabicBodyPart(exercise.muscle)}</Badge>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ExercisePreviewSheet;
