export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 rounded bg-gray-200" />
        <div className="h-9 w-24 rounded bg-gray-200" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 flex-1 rounded bg-gray-200" />
            <div className="h-10 flex-1 rounded bg-gray-200" />
            <div className="h-10 flex-1 rounded bg-gray-200" />
            <div className="h-10 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
