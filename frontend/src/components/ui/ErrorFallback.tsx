interface ErrorFallbackProps {
  error: string;
  onRetry?: () => void;
}

const ErrorFallback = ({ error, onRetry }: ErrorFallbackProps) => {
  const handleRetry = onRetry ?? (() => window.location.reload());

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <svg
        className="h-12 w-12 text-red-500 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
      <p className="mt-1 text-sm text-red-600 max-w-sm">{error}</p>
      <button
        type="button"
        onClick={handleRetry}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
      >
        {onRetry ? 'Retry' : 'Reload Page'}
      </button>
    </div>
  );
};

export default ErrorFallback;
