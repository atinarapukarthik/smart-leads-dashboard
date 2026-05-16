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

    const userId = user._id || user.id;
    if (!user || !userId || !user.email) {
      console.log('[Auth] getStoredAuth - validation failed, userId:', userId, 'email:', user?.email);
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
  const [user, setUser] = useState<User | null>(() => getStoredAuth().user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');

    if (oauthToken) {
      console.log('[Auth] Found token in URL, restoring session...');
      try {
        const base64Url = oauthToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64)) as { id: string; email: string; role: string };
        const restoredUser: User = { id: decoded.id, _id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.email.split('@')[0] };
        localStorage.setItem('token', oauthToken);
        localStorage.setItem('user', JSON.stringify(restoredUser));
        setUser(restoredUser);
        console.log('[Auth] Session restored from URL token');
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.error('[Auth] Failed to restore session from URL:', e);
      }
    } else {
      const { token, user: storedUser } = getStoredAuth();
      console.log('[Auth] useEffect - token:', !!token, 'storedUser:', !!storedUser);
      if (token && storedUser) {
        setUser(storedUser);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string, user: User) => {
    console.log('[Auth] Login called, token:', !!token, 'user:', user.email);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    console.log('[Auth] Logout called');
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