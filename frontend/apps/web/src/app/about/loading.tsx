export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-8 w-36 rounded bg-gray-200" />
      <div className="h-48 rounded-lg bg-gray-200" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
        <div className="h-4 w-4/6 rounded bg-gray-200" />
      </div>
    </div>
  );
}
