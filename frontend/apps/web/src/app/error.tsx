"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">An unexpected error occurred.</p>
      <button onClick={reset} className="px-4 py-2 bg-espresso text-cream rounded-lg hover:bg-cocoa transition-colors">
        Try Again
      </button>
    </div>
  );
}
