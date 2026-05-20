export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-8 w-48 rounded bg-gray-200 mx-auto" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
