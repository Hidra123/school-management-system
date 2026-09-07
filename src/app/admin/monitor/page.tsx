"use client";

import AppShell from "@/components/AppShell";
import { PageHeader } from "@/components/ui";

export default function MonitorDashboardsPage() {
  return (
    <AppShell>
      <PageHeader icon="📡" title="MonitorDashboards" subtitle="Monitor member dashboards and activities" />
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="text-5xl">📡</div>
        <h2 className="mt-4 text-xl font-bold text-slate-800">MonitorDashboards</h2>
        <p className="mt-2 mx-auto max-w-md text-sm text-slate-500">Monitor member dashboards and activities. This module is coming soon.</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
          🚧 Under Development
        </div>
      </div>
    </AppShell>
  );
}
