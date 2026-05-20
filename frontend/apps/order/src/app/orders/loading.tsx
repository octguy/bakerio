export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-8 w-32 rounded bg-gray-200" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}
