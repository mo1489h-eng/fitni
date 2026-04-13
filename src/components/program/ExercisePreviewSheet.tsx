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
import { ExerciseGifImage } from "@/components/program/ExerciseGifImage";

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
      : (exercise.gifUrl && String(exercise.gifUrl).trim()) || "";
  const partColor = BODY_PART_CONFIG[exercise.muscle]?.color ?? "bg-muted text-muted-foreground";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="h-full max-h-[100dvh] min-h-0 w-full overflow-hidden p-0 sm:max-w-md flex flex-col"
        dir="rtl"
      >
        <SheetHeader className="flex-shrink-0 p-4 border-b border-border space-y-1">
          <SheetTitle className="text-right text-base">معاينة التمرين</SheetTitle>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4">
            <div className="mx-auto flex aspect-square max-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted">
              {gif ? (
                <ExerciseGifImage
                  src={gif}
                  alt={ar}
                  className="h-full w-full"
                  objectFit="contain"
                  loading="eager"
                  errorFallback={
                    <Dumbbell className="h-24 w-24 text-muted-foreground/35" strokeWidth={1.25} />
                  }
                />
              ) : (
                <Dumbbell className="h-24 w-24 text-muted-foreground/35" strokeWidth={1.25} />
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{ar}</p>
              {en ? <p className="text-sm text-muted-foreground">{en}</p> : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge className={partColor}>{getArabicBodyPart(exercise.muscle)}</Badge>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ExercisePreviewSheet;
