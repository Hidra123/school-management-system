"use client";

import { useState } from "react";
import {
  EmptyState,
  Field,
  Loader,
  Modal,
  PageHeader,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import AppShell from "@/components/AppShell";
import { cls, delJSON, postJSON, putJSON, useFetch } from "@/lib/utils";

type ClassRow = {
  id: number;
  name: string;
  section: string;
  capacity: number;
  studentCount: number;
  createdAt: string;
};

const emptyForm = { name: "", section: "", capacity: "40" };

const colors = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
];

export default function ClassesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, error, refresh } = useFetch<ClassRow[]>("/api/classes");
  const list = data ?? [];

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(c: ClassRow) {
    setEditing(c);
    setForm({ name: c.name, section: c.section, capacity: String(c.capacity) });
    setFormError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = { ...form, capacity: Number(form.capacity) || 40 };
      if (editing) await putJSON(`/api/classes/${editing.id}`, body);
      else await postJSON("/api/classes", body);
      setOpen(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: ClassRow) {
    if (!window.confirm(`Are you sure you want to delete ${c.name}?`)) return;
    try {
      await delJSON(`/api/classes/${c.id}`);
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  return (
    <AppShell permission="classes.view">
    <div>
      <PageHeader icon="🏫" title="Classes" subtitle={`${list.length} class${list.length === 1 ? "" : "es"}`}>
        <button onClick={openAdd} className={btnPrimary}>
          + Add Class
        </button>
      </PageHeader>

      {loading && !data ? (
        <Loader />
      ) : error && !data ? (
        <EmptyState icon="⚠️" title="Failed to load" message={error} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="🏫"
          title="No classes yet"
          message="Start by adding the first class."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c, i) => {
            const pct = c.capacity > 0 ? Math.min(100, Math.round((c.studentCount / c.capacity) * 100)) : 0;
            const full = c.studentCount >= c.capacity;
            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md">
                <div className={cls("flex items-center justify-between bg-gradient-to-br px-5 py-4 text-white", colors[i % colors.length])}>
                  <div>
                    <h2 className="text-lg font-extrabold">{c.name}</h2>
                    {c.section && <p className="text-xs font-medium text-white/80">Section: {c.section}</p>}
                  </div>
                  <span className="text-3xl">🏫</span>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600">Students</span>
                    <span className="font-extrabold text-slate-900">
                      {c.studentCount}
                      <span className="font-medium text-slate-400"> / {c.capacity}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cls(
                        "h-full rounded-full transition-all",
                        full ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={cls("mt-2 text-xs font-semibold", full ? "text-rose-600" : "text-slate-500")}>
                    {full ? "Class is full!" : pct >= 80 ? "Almost full" : "Enough space available"}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="flex-1 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit Class: ${editing.name}` : "Add Class"}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Class Name" required>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Grade 5"
              required
            />
          </Field>
          <Field label="Section">
            <input
              className={inputCls}
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              placeholder="e.g. A / B / Mixed"
            />
          </Field>
          <Field label="Capacity (Number of Students)">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </Field>
          {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Class"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
    </AppShell>
  );
}
