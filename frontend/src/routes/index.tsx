import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import Dashboard from '../pages/Dashboard';

const router = createBrowserRouter([
  {
    path: '/login',
    lazy: async () => {
      const { default: LoginPage } = await import('../pages/LoginPage');
      return { Component: LoginPage };
    },
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
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
    path: '/admin/*',
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
