import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the trainer Clients grid card: avatar, title row + status badge, meta row, progress bar, actions row.
 */
export function ClientCardSkeleton() {
  return (
    <Card className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 max-w-[60%] flex-1 rounded-md" aria-hidden />
            <Skeleton className="h-5 w-14 shrink-0 rounded-full" aria-hidden />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" aria-hidden />
            <Skeleton className="h-5 w-16 rounded-full" aria-hidden />
          </div>
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-24 rounded-md" aria-hidden />
              <Skeleton className="h-3 w-8 rounded-md" aria-hidden />
            </div>
            <Skeleton className="h-1 w-full rounded-full" aria-hidden />
          </div>
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3 w-20 rounded-md" aria-hidden />
            <div className="flex gap-1">
              <Skeleton className="size-7 rounded-md" aria-hidden />
              <Skeleton className="size-7 rounded-md" aria-hidden />
              <Skeleton className="size-7 rounded-md" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
