"use client";

import AppShell from "@/components/AppShell";
import { PageHeader } from "@/components/ui";

export default function LessonPlansPage() {
  return (
    <AppShell permission="lessonplan.view">
      <div className="space-y-4">
        <PageHeader icon="📖" title="Lesson Plans" subtitle="Schemes of work, lesson preparation and syllabus alignment" />

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-3xl text-amber-600 border border-amber-200 shadow-sm">
              📖
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-900">Lesson Plans &amp; Schemes of Work</h2>
            <p className="mt-1.5 max-w-lg text-xs text-slate-500 leading-relaxed">
              Moduli hii inatengenezwa kulingana na miongozo na mihtasari rasmi ya Taasisi ya Elimu Tanzania (TET / TIE).
              Itazinduliwa mara baada ya kukusanya na kukamilisha taarifa zote za mtaala.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-black text-amber-700 border border-amber-500/20">
              <span>⏳</span> Inasubiri Taarifa za TIE / Mtaala Mpya
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
