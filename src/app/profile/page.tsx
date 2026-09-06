"use client";

import AppShell from "@/components/AppShell";
import { PageHeader } from "@/components/ui";

export default function ProfilePage() {
  return (
    <AppShell permission="profile.edit">
      <PageHeader icon="🔑" title="Change Password" subtitle="Update your account password" />
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="text-5xl">🔑</div>
        <h2 className="mt-4 text-xl font-bold text-slate-800">Change Password</h2>
        <p className="mt-2 mx-auto max-w-md text-sm text-slate-500">Password change feature coming soon.</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
          🚧 Under Development
        </div>
      </div>
    </AppShell>
  );
}
