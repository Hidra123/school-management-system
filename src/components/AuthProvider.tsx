"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type User = {
  id: number;
  name: string;
  username: string;
  role: "admin" | "member";
  mustChangePassword: boolean;
  permissions: string[];
  staffRole: string | null;
} | null;

type AuthCtx = {
  user: User;
  loading: boolean;
  refresh: () => void;
  logout: () => Promise<void>;
  hasPerm: (perm: string) => boolean;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  refresh: () => {},
  logout: async () => {},
  hasPerm: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: User }) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/login";
  }, []);

  const hasPerm = useCallback(
    (perm: string) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      return user.permissions.includes(perm);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout, hasPerm }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
