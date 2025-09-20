// src/app/providers/auth-provider.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

type User = { id: string; email: string } | null;
type Credentials = { email: string; password: string };

type AuthContextValue = {
  user: User;
  loading: boolean;
  signup: (c: Credentials) => Promise<void>;
  login: (c: Credentials) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(false);

  // Restore session (demo)
  useEffect(() => {
    const raw = localStorage.getItem("auth:user");
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
  }, []);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function signup({ email }: Credentials) {
    setLoading(true);
    try {
      await sleep(400); // simulate network
      const u = { id: crypto.randomUUID(), email };
      setUser(u);
      localStorage.setItem("auth:user", JSON.stringify(u));
    } finally {
      setLoading(false);
    }
  }

  async function login({ email }: Credentials) {
    setLoading(true);
    try {
      await sleep(300); // simulate network
      const u = { id: crypto.randomUUID(), email };
      setUser(u);
      localStorage.setItem("auth:user", JSON.stringify(u));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("auth:user");
  }

  const value = useMemo(
    () => ({ user, loading, signup, login, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
