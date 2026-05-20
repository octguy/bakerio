export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-8 w-24 rounded bg-gray-200" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-16 w-16 shrink-0 rounded bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-gray-200" />
            <div className="h-4 w-1/4 rounded bg-gray-200" />
          </div>
        </div>
      ))}
      <div className="h-12 rounded bg-gray-200 mt-4" />
    </div>
  );
}
