export default function Loading() {
  return (
    <div className="animate-pulse space-y-8 p-6">
      <div className="h-10 w-48 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
