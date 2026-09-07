"use client";

import AppShell from "@/components/AppShell";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, Badge, PageHeader } from "@/components/ui";

export default function AdminProfilePage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <PageHeader icon="👤" title="Admin Profile" subtitle="Your administrator account and password" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {user && <Avatar name={user.name} tone="indigo" />}
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">Username: <span className="font-semibold text-indigo-700">{user?.username}</span></p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between"><dt className="text-slate-500">Role</dt><dd><Badge tone="indigo">🛡️ Administrator</Badge></dd></div>
            <div className="flex items-center justify-between"><dt className="text-slate-500">Access</dt><dd className="font-semibold text-slate-700">Full access</dd></div>
            <div className="flex items-center justify-between"><dt className="text-slate-500">Login page</dt><dd className="font-semibold text-slate-700">Admin Login tab</dd></div>
          </dl>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
            💡 Staff sign in with their <span className="font-semibold">Check Number</span>. New staff receive the default password <span className="font-mono font-semibold">shulehub2025</span> and must change it on first login.
          </div>
        </div>

        <div className="lg:col-span-2">
          <ChangePasswordForm />
        </div>
      </div>
    </AppShell>
  );
}
