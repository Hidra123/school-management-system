"use client";

import AppShell from "@/components/AppShell";
import { PageHeader } from "@/components/ui";

export default function ExaminationsPage() {
  return (
    <AppShell permission="exams.view">
      <PageHeader icon="📋" title="Examinations" subtitle="Manage examinations, routines and publish results" />

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="text-5xl">📋</div>
        <h2 className="mt-4 text-xl font-bold text-slate-800">Examinations</h2>
        <p className="mt-2 max-w-md mx-auto text-sm text-slate-500">
          Manage examinations, routines and publish results. This module is coming soon — it will be built in the next update.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
          🚧 Under Development
        </div>
      </div>
    </AppShell>
  );
}
