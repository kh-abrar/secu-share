// src/app/providers/auth-provider.tsx
import { createContext, useContext, useEffect, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "@/hooks/useAuth";

type User = { id: string; email: string; name?: string } | null;
type Credentials = { email: string; password: string; name?: string };

type AuthContextValue = {
  user: User;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signup: (c: Credentials) => Promise<void>;
  login: (c: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const { 
    user, 
    loading, 
    isAuthenticated, 
    error,
    login: storeLogin, 
    logout: storeLogout, 
    register,
    fetchUser,
    clearError 
  } = useAuthStore();

  // Fetch current user on mount to check if session is active
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  async function signup(credentials: Credentials) {
    await register(credentials);
  }

  async function login(credentials: Credentials) {
    await storeLogin(credentials);
  }

  async function logout() {
    await storeLogout();
  }

  const value = useMemo(
    () => ({ 
      user, 
      loading, 
      isAuthenticated,
      error,
      signup, 
      login, 
      logout,
      clearError 
    }),
    [user, loading, isAuthenticated, error, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
