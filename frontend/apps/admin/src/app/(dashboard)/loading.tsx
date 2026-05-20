export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-36 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-lg bg-gray-200" />
        <div className="h-64 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
