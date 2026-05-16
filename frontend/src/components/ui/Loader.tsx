interface LoaderProps {
  fullScreen?: boolean;
  message?: string;
}

const Loader = ({ fullScreen, message }: LoaderProps) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600" />
      {message && (
        <p className="text-sm font-medium text-gray-500">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        {content}
      </div>
    );
  }

  return <div className="flex min-h-[300px] items-center justify-center">{content}</div>;
};

export default Loader;
