export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--color-crust,#E8C496)]/30 rounded-[var(--radius-lg,10px)] ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="border border-[var(--color-crust,#E8C496)] rounded-[var(--radius-lg,10px)] p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
