"use client";

import { useState } from "react";
import { ActionButton, Badge, EmptyState, Loader, inputCls, useActionState } from "@/components/ui";
import { cls, delJSON, postJSON, putJSON, shortDate, useFetch } from "@/lib/utils";

type ExamRow = {
  id: number;
  name: string;
  examType: string;
  academicYear: string;
  startDate: string | null;
  endDate: string | null;
  remarks: string;
  status: "active" | "inactive";
  classNames: string[];
  appliesToAllClasses: boolean;
};

const emptyForm = {
  name: "",
  examType: "SE",
  academicYear: "",
  startDate: "",
  endDate: "",
  classes: "",
  remarks: "",
  status: "active" as "active" | "inactive",
};

export default function ManageExaminationsTab() {
  const { data, loading, error, refresh } = useFetch<ExamRow[]>("/api/exams");
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { loading: saving, done, run } = useActionState();

  const examList = data ?? [];

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setFormError(null);
  }

  function edit(e: ExamRow) {
    setEditingId(e.id);
    setForm({
      name: e.name,
      examType: e.examType,
      academicYear: e.academicYear,
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      classes: e.classNames.join(", "),
      remarks: e.remarks,
      status: e.status,
    });
    setFormError(null);
  }

  async function save() {
    if (!form.name.trim()) {
      setFormError("Exam name is required.");
      return;
    }
    setFormError(null);
    try {
      await run(async () => {
        try {
          if (editingId) await putJSON(`/api/exams/${editingId}`, form);
          else await postJSON("/api/exams", form);
        } catch (e) {
          setFormError(e instanceof Error ? e.message : "Failed to save.");
          throw e;
        }
      });
      resetForm();
      refresh();
    } catch {
      /* handled above */
    }
  }

  async function remove(e: ExamRow) {
    if (!window.confirm(`Delete "${e.name}"? All linked scores will lose their exam reference.`)) return;
    try {
      await delJSON(`/api/exams/${e.id}`);
      refresh();
      if (editingId === e.id) resetForm();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Create / Edit Examination */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">➕ {editingId ? "Edit Examination" : "Create Examination"}</p>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Exam Name *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Midterm One 2025"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Exam Type *</label>
              <select className={inputCls} value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })}>
                <option value="SE">School Examination (SE)</option>
                <option value="CAs">Continuous Assessment (CAs)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Academic Year</label>
              <input
                className={inputCls}
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                placeholder="e.g. 2025"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Start Date</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">End Date</label>
              <input type="date" className={inputCls} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Classes</label>
            <input
              className={inputCls}
              value={form.classes}
              onChange={(e) => setForm({ ...form, classes: e.target.value })}
              placeholder="Form 1, Form 2, Form 3, Form 4"
            />
            <p className="mt-1 text-[11px] text-slate-400">Leave blank for all classes</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Remarks</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional remarks..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Exam Status *</label>
            <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}>
              <option value="active">Active - Show to Teachers</option>
              <option value="inactive">Inactive - Hidden from Teachers</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-400">Inactive exams won&apos;t appear for Teachers</p>
          </div>

          {formError && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">{formError}</p>}

          <div className="flex gap-2">
            <ActionButton onClick={save} loading={saving} done={done} doneText="Saved!" variant={editingId ? "warning" : "primary"} fullWidth>
              💾 {editingId ? "Update Exam" : "Save Exam"}
            </ActionButton>
            {editingId && (
              <button onClick={resetForm} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                ✕ Clear
              </button>
            )}
          </div>
          {!editingId && (
            <button onClick={resetForm} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">
              ✕ Clear form
            </button>
          )}
        </div>
      </div>

      {/* Examination List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">📋 Examination List</p>
          <button onClick={() => refresh()} className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20">🔄 Reload</button>
        </div>
        {loading ? (
          <Loader label="Loading examinations..." />
        ) : error ? (
          <EmptyState icon="⚠️" title="Could not load" message={error} />
        ) : examList.length === 0 ? (
          <EmptyState icon="📋" title="No examinations yet" message="Create your first examination using the form on the left." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Exam Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Type</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Year</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Dates</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Status</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {examList.map((e, i) => (
                  <tr key={e.id} className={cls("odd:bg-white even:bg-slate-50/50", editingId === e.id && "bg-amber-50/60")}>
                    <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-800">
                      {e.name}
                      <p className="text-[11px] font-normal text-slate-400">{e.appliesToAllClasses ? "All classes" : e.classNames.join(", ")}</p>
                    </td>
                    <td className="px-3 py-2.5"><Badge tone="blue">{e.examType}</Badge></td>
                    <td className="px-3 py-2.5 text-slate-600">{e.academicYear || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{shortDate(e.startDate)} – {shortDate(e.endDate)}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={e.status === "active" ? "emerald" : "rose"}>{e.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => edit(e)} className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600">✏️</button>
                        <button onClick={() => remove(e)} className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-600">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
