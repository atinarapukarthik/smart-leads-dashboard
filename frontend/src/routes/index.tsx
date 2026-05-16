import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import Dashboard from '../pages/Dashboard';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleRoute requiredRole="Admin">
          <Dashboard />
        </RoleRoute>
      </ProtectedRoute>
    ),
  },
]);

export default router;
