export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-crust rounded-[10px] overflow-hidden animate-pulse">
      <div className="aspect-square bg-latte" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-latte rounded w-3/4" />
        <div className="h-4 bg-latte rounded w-1/2" />
      </div>
    </div>
  );
}

export function BranchCardSkeleton() {
  return (
    <div className="bg-white border border-crust rounded-[10px] p-5 animate-pulse">
      <div className="h-5 bg-latte rounded w-2/3 mb-3" />
      <div className="h-4 bg-latte rounded w-full" />
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white border border-crust rounded-[10px] p-4 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 bg-latte rounded w-1/3" />
        <div className="h-4 bg-latte rounded w-1/4" />
      </div>
      <div className="h-4 bg-latte rounded w-1/2" />
      <div className="h-4 bg-latte rounded w-1/4" />
    </div>
  );
}
