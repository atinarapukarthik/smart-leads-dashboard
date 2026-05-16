interface ErrorFallbackProps {
  error: string;
  onRetry?: () => void;
}

const ErrorFallback = ({ error, onRetry }: ErrorFallbackProps) => {
  const handleRetry = onRetry ?? (() => window.location.reload());

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center transition-all">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-7 w-7 text-red-600"
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
      </div>
      <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
      <p className="mt-1.5 max-w-md text-sm text-red-600">{error}</p>
      <button type="button" onClick={handleRetry} className="btn-danger mt-5">
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {onRetry ? 'Retry' : 'Reload Page'}
      </button>
    </div>
  );
};

export default ErrorFallback;
