"use client";

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ title = "Something went wrong", message = "An unexpected error occurred. Please try again.", onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-gray-600 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[var(--color-golden,#D4943A)] text-white rounded-[var(--radius-md,8px)] font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
