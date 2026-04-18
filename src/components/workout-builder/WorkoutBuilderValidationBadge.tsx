import { AlertTriangle, CheckCircle2 } from "lucide-react";

import {
  collectWorkoutProgramIssues,
  workoutProgramSchema,
} from "@/lib/validations/workout";
import type { WorkoutProgram } from "@/types/workout";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  program: WorkoutProgram;
};

export function WorkoutBuilderValidationBadge({ program }: Props) {
  const parsed = workoutProgramSchema.safeParse(program);
  if (!parsed.success) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
              هيكل غير صالح
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs" dir="rtl">
            {parsed.error.issues.slice(0, 5).map((e) => e.message).join(" · ")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const issues = collectWorkoutProgramIssues(parsed.data);
  if (issues.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary-hover dark:text-primary">
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        جاهز للحفظ
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
            {issues.length} تنبيه
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm text-xs" dir="rtl">
          <ul className="list-inside list-disc space-y-1">
            {issues.map((issue, i) =>
              issue.code === "EMPTY_WORKOUT_DAY" ? (
                <li key={`${issue.dayId}-${i}`}>
                  يوم تمرين بدون تمارين: «{issue.dayTitle}»
                </li>
              ) : (
                <li key={`${issue.instanceId}-${i}`}>
                  تمرين بدون مجموعات: «{issue.exerciseName}» ({issue.dayTitle})
                </li>
              ),
            )}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
