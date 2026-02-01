import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, setAuthToken, AuthUser } from '../services/api';
import { disconnectSocket } from '../realtime/socket';

const TOKEN_KEY = 'template_manager_token';
const USER_KEY = 'template_manager_user';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (user: AuthUser) => void;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistAuth = useCallback((newToken: string | null, newUser: AuthUser | null) => {
    setTokenState(newToken);
    setUser(newUser);
    setAuthToken(newToken);
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    persistAuth(null, null);
  }, [persistAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const data = await authApi.login(email, password);
      persistAuth(data.token, data.user);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Ошибка входа';
      setError(msg || 'Ошибка входа');
      throw err;
    }
  }, [persistAuth]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    try {
      const data = await authApi.register(email, password, name);
      persistAuth(data.token, data.user);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Ошибка регистрации';
      setError(msg || 'Ошибка регистрации');
      throw err;
    }
  }, [persistAuth]);

  const updateUser = useCallback((newUser: AuthUser) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    }
  }, []);

  const updateProfile = useCallback(async (data: { name?: string; email?: string }) => {
    setError(null);
    try {
      const { user: updatedUser } = await authApi.updateProfile(data);
      updateUser(updatedUser);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Ошибка обновления профиля';
      setError(msg || 'Ошибка обновления профиля');
      throw err;
    }
  }, [updateUser]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setError(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Ошибка смены пароля';
      setError(msg || 'Ошибка смены пароля');
      throw err;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }
      setAuthToken(storedToken);
      try {
        const { user: meUser } = await authApi.me();
        setUser(meUser);
        localStorage.setItem(USER_KEY, JSON.stringify(meUser));
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [logout]);

  const value: AuthContextValue = {
    token,
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError: () => setError(null),
    updateUser,
    updateProfile,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
