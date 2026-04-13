import { Skeleton } from "@/components/ui/skeleton";

/**
 * Four-column metrics row matching `DashboardPremiumStats` stat cards (label, value, sub, sparkline).
 */
export function DashboardStatsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy aria-label="جاري تحميل الإحصائيات">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm"
        >
          <Skeleton className="mb-3 h-3 w-24 rounded-md" aria-hidden />
          <Skeleton className="mb-2 h-10 w-28 max-w-full rounded-md" aria-hidden />
          <Skeleton className="mb-4 h-3 w-40 max-w-full rounded-md" aria-hidden />
          <Skeleton className="h-10 w-full rounded-lg" aria-hidden />
        </div>
      ))}
    </section>
  );
}
