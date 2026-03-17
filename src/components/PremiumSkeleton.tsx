const PremiumSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-4">
    {/* Stat cards skeleton */}
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-3">
          <div className="w-10 h-10 rounded-lg skeleton-premium" />
          <div className="h-7 w-16 skeleton-premium rounded" />
          <div className="h-3 w-20 skeleton-premium rounded" />
        </div>
      ))}
    </div>
    {/* List skeleton */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full skeleton-premium flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 skeleton-premium rounded" />
          <div className="h-3 w-20 skeleton-premium rounded" />
        </div>
        <div className="h-6 w-14 skeleton-premium rounded-full" />
      </div>
    ))}
  </div>
);

export default PremiumSkeleton;
