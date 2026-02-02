import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, setAuthToken, AuthUser } from '../services/api';
import { disconnectSocket } from '../realtime/socket';

const TOKEN_KEY = 'template_manager_token';
const USER_KEY = 'template_manager_user';

/** Extract error message from axios error; supports both { error } and { errors: [{ msg }] } (express-validator) */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return fallback;
  const data = (err as { response?: { data?: unknown } }).response?.data;
  if (!data || typeof data !== 'object') return fallback;
  const d = data as { error?: string; errors?: Array<{ msg?: string }> };
  if (typeof d.error === 'string') return d.error;
  if (Array.isArray(d.errors) && d.errors[0]?.msg) return d.errors[0].msg;
  return fallback;
}

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
  deleteAccount: (password: string) => Promise<void>;
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
      const msg = extractErrorMessage(err, 'Ошибка входа');
      setError(msg);
      throw err;
    }
  }, [persistAuth]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    try {
      const data = await authApi.register(email, password, name);
      persistAuth(data.token, data.user);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Ошибка регистрации');
      setError(msg);
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
      const msg = extractErrorMessage(err, 'Ошибка обновления профиля');
      setError(msg);
      throw err;
    }
  }, [updateUser]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setError(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Ошибка смены пароля');
      setError(msg);
      throw err;
    }
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    setError(null);
    try {
      await authApi.deleteAccount(password);
      logout();
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Ошибка удаления аккаунта');
      setError(msg);
      throw err;
    }
  }, [logout]);

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
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
