import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Smart Leads</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Smart Leads Dashboard
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Track, manage, and convert your leads with real-time analytics, role-based access control, and powerful filtering capabilities.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Access System
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Smart Leads Dashboard. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
