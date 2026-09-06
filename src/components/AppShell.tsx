"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";
import { Loader } from "@/components/ui";

export default function AppShell({ children, permission }: { children: ReactNode; permission?: string }) {
  const { user, loading, hasPerm } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader label="Loading..." />
      </div>
    );
  }

  if (!user) return null;

  if (permission && !hasPerm(permission)) {
    return (
      <>
        <Sidebar />
        <div className="lg:pl-64">
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
              <div className="text-5xl">🔒</div>
              <h2 className="mt-4 text-xl font-bold text-slate-800">Access Denied</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                You do not have permission to access this page. Contact your admin to request access.
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </>
  );
}
