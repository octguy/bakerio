export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-4 max-w-lg mx-auto">
      <div className="h-8 w-32 rounded bg-gray-200" />
      <div className="space-y-3">
        <div className="h-10 rounded bg-gray-200" />
        <div className="h-10 rounded bg-gray-200" />
        <div className="h-10 rounded bg-gray-200" />
      </div>
      <div className="h-12 rounded bg-gray-200 mt-6" />
    </div>
  );
}
