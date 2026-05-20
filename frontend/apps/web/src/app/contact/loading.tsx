export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6 max-w-2xl mx-auto">
      <div className="h-8 w-40 rounded bg-gray-200" />
      <div className="space-y-4">
        <div className="h-10 rounded bg-gray-200" />
        <div className="h-10 rounded bg-gray-200" />
        <div className="h-32 rounded bg-gray-200" />
        <div className="h-10 w-32 rounded bg-gray-200" />
      </div>
    </div>
  );
}
