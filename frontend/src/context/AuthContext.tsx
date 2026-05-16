import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredAuth = (): { token: string | null; user: User | null } => {
  try {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    
    if (!token || !userRaw) {
      return { token: null, user: null };
    }
    
    const user = JSON.parse(userRaw) as User;
    
    if (!user || !user._id || !user.email) {
      return { token: null, user: null };
    }
    
    return { token, user };
  } catch (error) {
    console.error('[Auth] Failed to parse stored auth:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { token: null, user: null };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const { user: storedUser } = getStoredAuth();
    return storedUser;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { token, user: storedUser } = getStoredAuth();
    if (token && storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  }), [user, isLoading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;