export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-8 w-40 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-40 rounded-lg bg-gray-200" />
            <div className="h-5 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
