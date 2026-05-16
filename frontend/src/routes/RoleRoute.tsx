import { useAuth } from '../context/AuthContext';
import ErrorFallback from '../components/ui/ErrorFallback';

interface RoleRouteProps {
  children: React.ReactNode;
  requiredRole: 'Admin' | 'Sales User';
}

const RoleRoute = ({ children, requiredRole }: RoleRouteProps) => {
  const { user } = useAuth();

  if (!user || user.role !== requiredRole) {
    return (
      <ErrorFallback
        error={`Access denied. This area requires "${requiredRole}" privileges.`}
      />
    );
  }

  return <>{children}</>;
};

export default RoleRoute;
