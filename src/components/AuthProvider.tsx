"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

interface User {
  id: number;
  name: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  username: string | null;
  mustChangePassword: boolean;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  username: null,
  mustChangePassword: false,
  setUser: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = user?.role === "admin";
  const mustChangePassword = user?.mustChangePassword || false;
  const username = user?.username || null;

  // Check auth on route change
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
          // Redirect to login if not on login page or public page
          if (pathname !== "/login" && !pathname?.startsWith("/api")) {
            window.location.href = "/login";
          }
        }
      } catch {
        setUser(null);
        if (pathname !== "/login" && !pathname?.startsWith("/api")) {
          window.location.href = "/login";
        }
      }
    }

    checkAuth();
  }, [pathname, router]);

  // Force password change redirect
  useEffect(() => {
    if (user && user.mustChangePassword && pathname !== "/profile") {
      window.location.href = "/profile";
    }
  }, [user, pathname]);

  return (
    <AuthContext.Provider
      value={{
        user,
        username,
        mustChangePassword,
        setUser,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
