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
import { ALL_PERMISSIONS, ROLE_PRESETS, getPermissionGroups } from "@/lib/permissions";
import { cls, delJSON, postJSON, putJSON, useFetch } from "@/lib/utils";

type Member = {
  id: number; name: string; username: string; email: string;
  role: "admin" | "member"; active: boolean;
  rawPassword?: string; mustChangePassword?: boolean;
  permissions: string[]; createdAt: string;
};
type ClassRow = { id: number; name: string; section: string };
type SubjectRow = { id: number; name: string; code: string };
type Teacher = { id: number; name: string };

const ROLES = [
  { key: "academic_master", label: "📘 Academic Master", color: "bg-indigo-500" },
  { key: "class_teacher", label: "🏫 Class Teacher", color: "bg-emerald-500" },
  { key: "teacher", label: "👨‍🏫 Subject Teacher", color: "bg-violet-500" },
  { key: "accountant", label: "💰 Accountant", color: "bg-amber-500" },
  { key: "sports", label: "⚽ Sports Manager", color: "bg-rose-500" },
  { key: "lab", label: "🔬 Lab Technician", color: "bg-cyan-500" },
  { key: "librarian", label: "📚 Librarian", color: "bg-lime-600" },
];

const emptyForm = { name: "", username: "", email: "", password: "", selectedRole: "" };

const DEFAULT_PASSWORD = "shulehub2025";

/** Permission presets for roles that are not in ROLE_PRESETS (non-teaching staff). */
const EXTRA_PRESETS: Record<string, readonly string[]> = {
  accountant: ["dashboard", "students.view", "classes.view", "fees.view", "fees.manage", "messages.view", "messages.send", "profile.edit"],
  sports: ["dashboard", "students.view", "classes.view", "timetable.view", "tod.view", "tod.manage", "messages.view", "messages.send", "profile.edit"],
  lab: ["dashboard", "students.view", "classes.view", "subjects.view", "timetable.view", "lessonplan.view", "logbook.view", "logbook.manage", "messages.view", "messages.send", "profile.edit"],
  librarian: ["dashboard", "students.view", "classes.view", "timetable.view", "messages.view", "messages.send", "profile.edit"],
};

export default function AssignmentsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, loading, error, refresh } = useFetch<Member[]>("/api/admin/members");
  const classesFetch = useFetch<ClassRow[]>("/api/classes");
  const subjectsFetch = useFetch<SubjectRow[]>("/api/subjects");
  const groups = getPermissionGroups();

  const members = (data ?? []).filter((m) => m.role === "member");
  const list = members.filter((m) => {
    if (!search.trim()) return true;
    return [m.name, m.username, m.email].join(" ").toLowerCase().includes(search.toLowerCase());
  });

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setSelectedPerms(new Set(["dashboard", "profile.edit"]));
    setFormError(null);
    setOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({ name: m.name, username: m.username, email: m.email, password: "", selectedRole: "" });
    setSelectedPerms(new Set(m.permissions.filter((p) => p !== "*")));
    setFormError(null);
    setOpen(true);
  }

  function togglePerm(key: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleGroup(group: string) {
    const perms = ALL_PERMISSIONS.filter((p) => p.group === group).map((p) => p.key);
    const allSelected = perms.every((k) => selectedPerms.has(k));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      for (const k of perms) { if (allSelected) next.delete(k); else next.add(k); }
      return next;
    });
  }

  function applyRolePreset(presetKey: string) {
    const preset = ROLE_PRESETS[presetKey as keyof typeof ROLE_PRESETS];
    const perms = preset ? preset.permissions : EXTRA_PRESETS[presetKey];
    if (perms) {
      setSelectedPerms(new Set(perms));
      setForm((f) => ({ ...f, selectedRole: presetKey }));
    }
  }

  function selectAll() { setSelectedPerms(new Set(ALL_PERMISSIONS.map((p) => p.key))); }
  function selectNone() { setSelectedPerms(new Set(["dashboard", "profile.edit"])); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password || undefined,
        staffRole: form.selectedRole || undefined,
        role: "member" as const,
        permissions: Array.from(selectedPerms),
      };
      if (editing) await putJSON(`/api/admin/members/${editing.id}`, body);
      else await postJSON("/api/admin/members", body);
      setOpen(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(m: Member) {
    try {
      await putJSON(`/api/admin/members/${m.id}`, { active: !m.active });
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed.");
    }
  }

  async function remove(m: Member) {
    if (!window.confirm(`Delete ${m.name}?`)) return;
    try { await delJSON(`/api/admin/members/${m.id}`); refresh(); }
    catch (err) { window.alert(err instanceof Error ? err.message : "Failed."); }
  }

  function getRoleName(m: Member): string {
    // Detect role from permissions
    for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
      const pset = new Set(preset.permissions);
      const mset = new Set(m.permissions);
      let match = 0;
      for (const p of preset.permissions) if (mset.has(p)) match++;
      if (match >= preset.permissions.length * 0.7) {
        return ROLES.find((r) => r.key === key)?.label ?? key;
      }
    }
    return "👤 Custom Role";
  }

  return (
    <AppShell>
      <PageHeader icon="🎯" title="Assignments" subtitle="Assign roles, classes, subjects and features to staff members">
        <button onClick={openAdd} className={btnPrimary}>+ Add Staff Member</button>
      </PageHeader>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-slate-900">{members.length}</p>
          <p className="text-xs font-semibold text-slate-500">Total Staff</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-600">{members.filter((m) => m.active).length}</p>
          <p className="text-xs font-semibold text-slate-500">Active</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-rose-600">{members.filter((m) => !m.active).length}</p>
          <p className="text-xs font-semibold text-slate-500">Disabled</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-indigo-600">{classesFetch.data?.length ?? 0}</p>
          <p className="text-xs font-semibold text-slate-500">Classes</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5 relative max-w-md">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff..." className={cls(inputCls, "pl-10")} />
      </div>

      {loading && !data ? <Loader /> : error && !data ? (
        <EmptyState icon="⚠️" title="Failed to load" message={error} />
      ) : list.length === 0 ? (
        <EmptyState icon="🎯" title="No staff members yet" message="Add your first staff member and assign their role and features." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((m) => (
            <div key={m.id} className={cls("rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md", m.active ? "border-slate-200/80" : "border-rose-200 bg-rose-50/30")}>
              <div className="flex items-start gap-3">
                <Avatar name={m.name} tone={m.active ? "indigo" : "red"} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{m.name}</p>
                    <Badge tone={m.active ? "emerald" : "red"}>{m.active ? "Active" : "Disabled"}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-indigo-700">{m.username}</span>
                    {m.email ? ` · ${m.email}` : ""}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-indigo-600">{getRoleName(m)}</p>
                </div>
              </div>

              {/* Permissions */}
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Features ({m.permissions.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {m.permissions.slice(0, 8).map((p) => {
                    const def = ALL_PERMISSIONS.find((x) => x.key === p);
                    return <Badge key={p} tone="slate">{def?.label ?? p}</Badge>;
                  })}
                  {m.permissions.length > 8 && <Badge tone="indigo">+{m.permissions.length - 8} more</Badge>}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(m)} className="flex-1 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100">✏️ Edit / Features</button>
                <button onClick={() => toggleActive(m)} className={cls("rounded-xl border px-3 py-2 text-sm font-bold", m.active ? "border-amber-100 bg-amber-50/60 text-amber-700 hover:bg-amber-100" : "border-emerald-100 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100")}>
                  {m.active ? "🚫" : "✅"}
                </button>
                <button onClick={() => remove(m)} className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit: ${editing.name}` : "Add Staff Member"} wide>
        <form onSubmit={save} className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" required>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. John Doe" />
            </Field>
            <Field label="Check Number (login username)" required>
              <input className={inputCls} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required placeholder="e.g. STAFF-001" />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@school.com" />
            </Field>
            <Field label={editing ? "New Password (blank = keep)" : `Password (blank = ${DEFAULT_PASSWORD})`}>
              <input type="text" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={form.password ? 4 : 0} placeholder={editing ? "Leave blank to keep" : DEFAULT_PASSWORD} autoComplete="new-password" />
            </Field>
          </div>
          {!editing && (
            <p className="-mt-2 text-xs text-slate-500">🔐 New staff sign in with their Check Number and must change the password on first login.</p>
          )}

          {/* Role Selection */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
            <h3 className="mb-3 text-sm font-bold text-indigo-900">🎯 Select Role (auto-fills features)</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => applyRolePreset(r.key)}
                  className={cls(
                    "rounded-xl border px-3 py-2.5 text-xs font-bold transition",
                    form.selectedRole === r.key
                      ? "border-indigo-400 bg-indigo-100 text-indigo-800 ring-2 ring-indigo-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Switches */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">🔑 Feature Access ({selectedPerms.size} features enabled)</h3>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-xs font-bold text-indigo-600 hover:underline">All On</button>
                <button type="button" onClick={selectNone} className="text-xs font-bold text-slate-500 hover:underline">Reset</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(groups).map(([groupName, perms]) => {
                const allChecked = perms.every((p) => selectedPerms.has(p.key));
                const someChecked = perms.some((p) => selectedPerms.has(p.key));
                return (
                  <div key={groupName} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => toggleGroup(groupName)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-sm font-bold text-slate-800">{perms[0].icon} {groupName}</span>
                      <span className="ml-auto text-[10px] font-semibold text-slate-400">{perms.filter((p) => selectedPerms.has(p.key)).length}/{perms.length}</span>
                    </label>
                    <div className="ml-6 mt-1.5 space-y-1">
                      {perms.map((p) => (
                        <label key={p.key} className="flex cursor-pointer items-center justify-between gap-2">
                          <span className="text-xs text-slate-600">{p.label}</span>
                          <div
                            onClick={() => togglePerm(p.key)}
                            className={cls(
                              "relative h-5 w-9 cursor-pointer rounded-full transition",
                              selectedPerms.has(p.key) ? "bg-indigo-500" : "bg-slate-300",
                            )}
                          >
                            <div className={cls(
                              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                              selectedPerms.has(p.key) ? "translate-x-4" : "translate-x-0.5",
                            )} />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : editing ? "Save Changes" : "Add & Assign"}</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
