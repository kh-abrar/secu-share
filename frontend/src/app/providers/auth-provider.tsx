import { createContext, useContext, useMemo, useState } from "react";
import type {PropsWithChildren} from "react";

type User = { id: string; email: string } | null;
type AuthContextValue = {
  user: User;
  login: (email: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User>(null);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    login: (email) => setUser({ id: "demo", email }),
    logout: () => setUser(null),
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
