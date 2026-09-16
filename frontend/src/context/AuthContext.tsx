import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError, authApi, tokenStorage } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = tokenStorage.get();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .me()
      .then((profile) => active && setUser(profile))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) tokenStorage.clear();
      })
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login: async (email, password) => {
        const result = await authApi.login({ email, password });
        tokenStorage.set(result.token);
        setUser(result.user);
      },
      register: async (name, email, password) => {
        const result = await authApi.register({ name, email, password });
        tokenStorage.set(result.token);
        setUser(result.user);
      },
      logout,
    }),
    [isLoading, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return context;
}
