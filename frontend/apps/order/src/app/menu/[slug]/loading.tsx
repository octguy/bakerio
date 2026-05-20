export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-56 rounded-lg bg-gray-200" />
      <div className="h-6 w-2/3 rounded bg-gray-200" />
      <div className="h-4 w-1/3 rounded bg-gray-200" />
      <div className="h-4 w-full rounded bg-gray-200" />
      <div className="h-10 w-full rounded bg-gray-200 mt-4" />
    </div>
  );
}
