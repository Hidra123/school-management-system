"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Avatar,
  EmptyState,
  Field,
  Loader,
  Modal,
  PageHeader,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import { cls, delJSON, postJSON, putJSON, shortDate, todayStr, useFetch } from "@/lib/utils";

type Teacher = {
  id: number; name: string; email: string; phone: string;
  subject: string; qualification: string; hireDate: string | null;
};

const emptyForm = { name: "", username: "", email: "", phone: "", qualification: "", hireDate: "" };

export default function AdminManageTeachersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState<Record<number, boolean>>({});

  const { data, loading, error, refresh } = useFetch<Teacher[]>("/api/teachers");
  // Also fetch members to show username/password
  const membersFetch = useFetch<Array<{ id: number; name: string; username: string; rawPassword: string }>>("/api/admin/members");
  const membersMap = new Map((membersFetch.data ?? []).map((m) => [m.name, m]));

  const list = (data ?? []).filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [t.name, t.email, t.phone, t.qualification].join(" ").toLowerCase().includes(q);
  });

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, hireDate: todayStr() });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(t: Teacher) {
    setEditing(t);
    const member = membersMap.get(t.name);
    setForm({
      name: t.name,
      username: member?.username ?? "",
      email: t.email ?? "",
      phone: t.phone ?? "",
      qualification: t.qualification ?? "",
      hireDate: t.hireDate ?? "",
    });
    setFormError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const teacherBody = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: "",
        qualification: form.qualification,
        hireDate: form.hireDate,
      };
      if (editing) {
        await putJSON(`/api/teachers/${editing.id}`, teacherBody);
      } else {
        await postJSON("/api/teachers", teacherBody);
      }
      setOpen(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: Teacher) {
    if (!window.confirm(`Remove ${t.name}?`)) return;
    try {
      await delJSON(`/api/teachers/${t.id}`);
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  function toggleShowPwd(id: number) {
    setShowPwd((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <AppShell>
      <PageHeader icon="👨‍🏫" title="Manage Teachers" subtitle={`${list.length} teacher${list.length === 1 ? "" : "s"}`}>
        <button onClick={openAdd} className={btnPrimary}>+ Add Teacher</button>
      </PageHeader>

      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teachers..." className={cls(inputCls, "pl-10")} />
        </div>
      </div>

      {loading && !data ? (
        <Loader />
      ) : error && !data ? (
        <EmptyState icon="⚠️" title="Failed to load" message={error} />
      ) : list.length === 0 ? (
        <EmptyState icon="👨‍🏫" title="No teachers yet" message="Add your first teacher." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const member = membersMap.get(t.name);
            const pwd = member?.rawPassword ?? "—";
            const isHidden = !showPwd[t.id];
            return (
              <div key={t.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-start gap-3">
                  <Avatar name={t.name} tone="violet" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{t.name}</p>
                    <p className="truncate text-xs text-slate-500">{t.qualification || "No qualification set"}</p>
                  </div>
                  <button onClick={() => remove(t)} className="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50">🗑️</button>
                </div>

                <dl className="mt-4 space-y-1.5 text-sm">
                  {/* Username */}
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Username:</dt>
                    <dd className="text-right font-bold text-indigo-700">{member?.username ?? "—"}</dd>
                  </div>
                  {/* Password with show/hide */}
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">Password:</dt>
                    <dd className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-semibold text-slate-700">
                        {isHidden ? "••••••••" : pwd}
                      </span>
                      <button
                        onClick={() => toggleShowPwd(t.id)}
                        className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title={isHidden ? "Show password" : "Hide password"}
                      >
                        {isHidden ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </button>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Phone:</dt>
                    <dd className="text-right font-semibold text-slate-700">{t.phone || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Email:</dt>
                    <dd className="max-w-[60%] truncate text-right font-semibold text-slate-700">{t.email || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Registered:</dt>
                    <dd className="text-right font-semibold text-slate-700">{shortDate(t.hireDate)}</dd>
                  </div>
                </dl>

                <button onClick={() => openEdit(t)} className="mt-4 w-full rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100">✏️ Edit Details</button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit: ${editing.name}` : "Add Teacher"} wide>
        <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" required className="sm:col-span-2">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. John Doe" />
          </Field>
          <Field label="Username (Check Number)" required>
            <input className={inputCls} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required placeholder="e.g. TCHR-001" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teacher@school.com" />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255 7XX XXX XXX" />
          </Field>
          <Field label="Qualification">
            <input className={inputCls} value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. B.Ed. Mathematics" />
          </Field>
          <Field label="Registered Date" className="sm:col-span-2">
            <input type="date" className={inputCls} value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
          </Field>
          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            {formError && <p className="mr-auto text-sm font-semibold text-rose-600">{formError}</p>}
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : editing ? "Save Changes" : "Add Teacher"}</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
