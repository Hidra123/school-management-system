"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Avatar,
  Badge,
  EmptyState,
  Field,
  Loader,
  Modal,
  PageHeader,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import { delJSON, postJSON, putJSON, useFetch } from "@/lib/utils";

type SubjectRow = { id: number; name: string; code: string; teacherId: number | null; teacherName: string | null };

const emptyForm = { name: "", code: "" };

export default function AdminManageSubjectsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, error, refresh } = useFetch<SubjectRow[]>("/api/subjects");
  const list = data ?? [];

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(s: SubjectRow) {
    setEditing(s);
    setForm({ name: s.name, code: s.code });
    setFormError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await putJSON(`/api/subjects/${editing.id}`, form);
      else await postJSON("/api/subjects", form);
      setOpen(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: SubjectRow) {
    if (!window.confirm(`Delete subject ${s.name}?`)) return;
    try {
      await delJSON(`/api/subjects/${s.id}`);
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  return (
    <AppShell>
      <PageHeader icon="📚" title="Manage Subjects" subtitle={`${list.length} subject${list.length === 1 ? "" : "s"} registered`}>
        <button onClick={openAdd} className={btnPrimary}>+ Add Subject</button>
      </PageHeader>

      {loading && !data ? (
        <Loader />
      ) : error && !data ? (
        <EmptyState icon="⚠️" title="Failed to load" message={error} />
      ) : list.length === 0 ? (
        <EmptyState icon="📚" title="No subjects yet" message="Add your first subject." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <div key={s.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg text-white">📘</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-bold text-slate-900">{s.name}</h2>
                    {s.code && <Badge tone="emerald">{s.code}</Badge>}
                  </div>
                </div>
                <button onClick={() => remove(s)} className="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">🗑️</button>
              </div>
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <Avatar name={s.teacherName ?? "?"} tone={s.teacherName ? "indigo" : "slate"} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Subject Teacher</p>
                  <p className="truncate text-sm font-bold text-slate-800">
                    {s.teacherName ?? <span className="font-medium italic text-slate-400">Not assigned</span>}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                To assign a teacher, go to <span className="font-semibold text-slate-500">Manage Teachers → 📚 Assign Subjects &amp; Classes</span>.
              </p>
              <button onClick={() => openEdit(s)} className="mt-2 w-full rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100">✏️ Edit Subject</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit: ${editing.name}` : "Add Subject"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Subject Name" required>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" required />
          </Field>
          <Field label="Subject Code">
            <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH" />
          </Field>
          <p className="rounded-xl bg-indigo-50/60 px-3.5 py-2.5 text-xs text-indigo-700">
            💡 To assign a teacher to this subject, use <span className="font-semibold">Manage Teachers → 📚 Assign Subjects &amp; Classes</span> after saving.
          </p>
          {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : editing ? "Save Changes" : "Add Subject"}</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
