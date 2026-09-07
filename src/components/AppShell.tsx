"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { Sidebar } from "./Sidebar";

// Pages that don't require sidebar
const NO_SIDEBAR_PAGES = ["/login", "/api"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, mustChangePassword } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Check if we should show sidebar
  const showSidebar = !NO_SIDEBAR_PAGES.some((p) => 
    pathname === p || pathname?.startsWith(p)
  );

  // Redirect logic
  useEffect(() => {
    // If no user and not on login page, redirect to login
    if (!user && pathname !== "/login" && !pathname?.startsWith("/api")) {
      window.location.href = "/login";
      return;
    }

    // If user exists and on login page, redirect to appropriate dashboard
    if (user && pathname === "/login") {
      window.location.href = isAdmin ? "/admin" : "/";
      return;
    }

    // Force password change on first login
    if (user && mustChangePassword && pathname !== "/profile") {
      window.location.href = "/profile";
      return;
    }

    // Admin should not access member pages
    if (user && isAdmin) {
      const memberPages = [
        "/students",
        "/teachers",
        "/classes",
        "/subjects",
        "/attendance",
        "/grades",
        "/fees",
        "/exams",
        "/timetable",
        "/assignments",
        "/lesson-plans",
        "/logbook",
        "/tod",
        "/messages",
        "/profile",
      ];
      if (memberPages.some((p) => pathname === p || pathname?.startsWith(`${p}/`))) {
        window.location.href = "/admin";
        return;
      }
    }

    // Members should not access admin pages
    if (user && !isAdmin) {
      if (pathname?.startsWith("/admin")) {
        window.location.href = "/";
        return;
      }
    }
  }, [user, isAdmin, mustChangePassword, pathname, router]);

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
