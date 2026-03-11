import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import api from '@/lib/api';
import type { AuthUser } from '@/types';

const TOKEN_KEY = 'auth_token';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  role: AuthUser['role'] | null;
  tenantId: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    isLoading: true,
  });

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const { data } = await api.post<{ token: string; user: AuthUser }>(
        '/auth/login',
        { email, password }
      );
      localStorage.setItem(TOKEN_KEY, data.token);
      setState({ user: data.user, token: data.token, isLoading: false });
      return data.user;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, isLoading: false });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;
    const { data } = await api.get<AuthUser>('/auth/me');
    setState((s) => ({ ...s, user: data }));
  }, [state.token]);

  useEffect(() => {
    if (!state.token) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    api
      .get<AuthUser>('/auth/me')
      .then(({ data }) => {
        setState((s) => ({ ...s, user: data, isLoading: false }));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, token: null, isLoading: false });
      });
  }, [state.token]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshUser,
    role: state.user?.role ?? null,
    tenantId: state.user?.tenantId ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
