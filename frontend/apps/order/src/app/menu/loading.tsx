export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      <div className="h-8 w-32 rounded bg-gray-200" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-gray-200" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
