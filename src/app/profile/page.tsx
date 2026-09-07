"use client";

import AppShell from "@/components/AppShell";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, PageHeader } from "@/components/ui";

export default function ProfilePage() {
  const { user } = useAuth();
  const forced = !!user?.mustChangePassword;

  return (
    <AppShell>
      <PageHeader
        icon="🔑"
        title="Change Password"
        subtitle={forced ? "You must set a new password before continuing" : "Update your account password"}
      />

      {forced && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
          <span className="text-2xl">⚠️</span>
          <div className="text-sm">
            <p className="font-bold">First login detected</p>
            <p className="mt-0.5">
              For security, you are required to replace the default password (<span className="font-mono font-semibold">shulehub2025</span>) with your own private password. Other pages will be unlocked once this is done.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {user && <Avatar name={user.name} tone="violet" />}
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">Check Number: <span className="font-semibold text-indigo-700">{user?.username}</span></p>
            </div>
          </div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Role</dt><dd className="font-semibold text-slate-700">Staff Member</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Permissions</dt><dd className="font-semibold text-slate-700">{user?.permissions.length ?? 0}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Password status</dt><dd className={forced ? "font-semibold text-amber-600" : "font-semibold text-emerald-600"}>{forced ? "Default (change now)" : "Custom ✓"}</dd></div>
          </dl>
        </div>

        <div className="lg:col-span-2">
          <ChangePasswordForm redirectTo="/" />
        </div>
      </div>
    </AppShell>
  );
}
