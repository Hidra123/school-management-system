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
  StatCard,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import { ALL_PERMISSIONS, ROLE_PRESETS, getPermissionGroups } from "@/lib/permissions";
import { cls, delJSON, postJSON, putJSON, useFetch } from "@/lib/utils";

type Member = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member";
  active: boolean;
  permissions: string[];
  createdAt: string;
};

type Stats = { counts: { students: number; teachers: number; classes: number; subjects: number } };

const emptyForm = { name: "", email: "", password: "", role: "member" as "admin" | "member" };

export default function RoleAssignmentsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, loading, error, refresh } = useFetch<Member[]>("/api/admin/members");
  const stats = useFetch<Stats>("/api/stats");
  const list = (data ?? []).filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });
  const groups = getPermissionGroups();

  const totalMembers = data?.length ?? 0;
  const activeMembers = data?.filter((m) => m.active).length ?? 0;
  const adminCount = data?.filter((m) => m.role === "admin").length ?? 0;

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setSelectedPerms(new Set());
    setFormError(null);
    setOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({ name: m.name, email: m.email, password: "", role: m.role });
    setSelectedPerms(new Set(m.permissions.filter((p) => p !== "*")));
    setFormError(null);
    setOpen(true);
  }

  function togglePerm(key: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(group: string) {
    const groupPerms = ALL_PERMISSIONS.filter((p) => p.group === group).map((p) => p.key);
    const allSelected = groupPerms.every((k) => selectedPerms.has(k));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      for (const k of groupPerms) {
        if (allSelected) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }

  function applyPreset(presetKey: keyof typeof ROLE_PRESETS) {
    const preset = ROLE_PRESETS[presetKey];
    setSelectedPerms(new Set(preset.permissions));
    setForm((f) => ({ ...f, role: "member" }));
  }

  function selectAll() {
    setSelectedPerms(new Set(ALL_PERMISSIONS.map((p) => p.key)));
  }

  function selectNone() {
    setSelectedPerms(new Set());
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        role: form.role,
        permissions: form.role === "admin" ? [] : Array.from(selectedPerms),
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
      window.alert(err instanceof Error ? err.message : "Failed to update.");
    }
  }

  async function remove(m: Member) {
    if (!window.confirm(`Are you sure you want to delete ${m.name}?`)) return;
    try {
      await delJSON(`/api/admin/members/${m.id}`);
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  return (
    <AppShell>
      {/* Welcome banner */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              System Online
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Secured</span>
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Welcome, Administrator 👋</h1>
            <p className="mt-1 text-sm text-slate-400">{new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-extrabold text-amber-400">{stats.data?.counts.students ?? "—"}</p>
            <p className="text-xs font-semibold text-slate-400">Total Students Enrolled</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon="👨‍🏫" label="Total Teachers" value={stats.data?.counts.teachers ?? "—"} tone="indigo" />
        <StatCard icon="👨‍🎓" label="Total Students" value={stats.data?.counts.students ?? "—"} tone="blue" />
        <StatCard icon="🏫" label="Classes" value={stats.data?.counts.classes ?? "—"} tone="emerald" />
        <StatCard icon="📚" label="Subjects" value={stats.data?.counts.subjects ?? "—"} tone="violet" />
        <StatCard icon="👥" label="Active Users" value={activeMembers} sub={`${adminCount} admin${adminCount === 1 ? "" : "s"}`} tone="amber" />
      </section>

      {/* Quick Actions */}
      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          ⚡ Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Add Teacher", icon: "👨‍🏫", href: "/teachers", color: "bg-emerald-500" },
            { label: "Approvals", icon: "✅", href: "/students", color: "bg-indigo-500" },
            { label: "Monitor", icon: "📡", href: "/activity", color: "bg-violet-500" },
            { label: "Activity", icon: "📊", href: "/activity", color: "bg-amber-500" },
            { label: "Sessions", icon: "👥", href: "/admin", color: "bg-rose-500" },
            { label: "Settings", icon: "⚙️", href: "/admin", color: "bg-slate-600" },
          ].map((a) => (
            <a
              key={a.label}
              href={a.href}
              className={cls("flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90", a.color)}
            >
              <span>{a.icon}</span> {a.label}
            </a>
          ))}
        </div>
      </section>

      {/* Members Management */}
      <PageHeader icon="👥" title="Team Members" subtitle={`${totalMembers} member${totalMembers === 1 ? "" : "s"} registered`}>
        <button onClick={openAdd} className={btnPrimary}>
          + Add Member
        </button>
      </PageHeader>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className={cls(inputCls, "pl-10")}
          />
        </div>
      </div>

      {loading && !data ? (
        <Loader />
      ) : error && !data ? (
        <EmptyState icon="⚠️" title="Failed to load" message={error} />
      ) : list.length === 0 ? (
        <EmptyState icon="👥" title="No members found" message="Add your first team member." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {list.map((m) => {
            const permCount = m.role === "admin" ? "All" : String(m.permissions.length);
            return (
              <div
                key={m.id}
                className={cls(
                  "rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md",
                  m.active ? "border-slate-200/80" : "border-rose-200 bg-rose-50/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={m.name} tone={m.role === "admin" ? "amber" : "indigo"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-slate-900">{m.name}</p>
                      <Badge tone={m.role === "admin" ? "amber" : "indigo"}>
                        {m.role === "admin" ? "🛡️ Admin" : "👤 Member"}
                      </Badge>
                      {!m.active && <Badge tone="red">Disabled</Badge>}
                    </div>
                    <p className="truncate text-xs text-slate-500">{m.email}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Permissions ({permCount})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.role === "admin" ? (
                      <Badge tone="amber">✨ Full Access (All Features)</Badge>
                    ) : m.permissions.length === 0 ? (
                      <span className="text-xs italic text-slate-400">No permissions assigned</span>
                    ) : (
                      m.permissions.slice(0, 6).map((p) => {
                        const pDef = ALL_PERMISSIONS.find((x) => x.key === p);
                        return <Badge key={p} tone="slate">{pDef?.label ?? p}</Badge>;
                      })
                    )}
                    {m.role !== "admin" && m.permissions.length > 6 && (
                      <Badge tone="indigo">+{m.permissions.length - 6} more</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={() => openEdit(m)} className="flex-1 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100">
                    ✏️ Edit / Permissions
                  </button>
                  <button
                    onClick={() => toggleActive(m)}
                    className={cls("rounded-xl border px-3 py-2 text-sm font-bold transition", m.active ? "border-amber-100 bg-amber-50/60 text-amber-700 hover:bg-amber-100" : "border-emerald-100 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100")}
                  >
                    {m.active ? "🚫" : "✅"}
                  </button>
                  <button onClick={() => remove(m)} className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100">
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit: ${editing.name}` : "Add Member"} wide>
        <form onSubmit={save} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" required>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Doe" required />
            </Field>
            <Field label="Email" required>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@school.com" required={!editing} />
            </Field>
            <Field label={editing ? "New Password (blank = keep)" : "Password"} required={!editing}>
              <input type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Leave blank to keep" : "Min 4 characters"} minLength={editing ? 0 : 4} required={!editing} autoComplete="new-password" />
            </Field>
            <Field label="Role" required>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "member" })}>
                <option value="member">👤 Member (Custom Permissions)</option>
                <option value="admin">🛡️ Admin (Full Access)</option>
              </select>
            </Field>
          </div>

          {form.role === "member" && (
            <>
              {/* Role Presets */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <h3 className="mb-3 text-sm font-bold text-indigo-900">🎯 Quick Role Presets (click to auto-fill permissions)</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key as keyof typeof ROLE_PRESETS)}
                      className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                    >
                      {preset.label}
                      <span className="ml-1 text-xs font-medium text-indigo-400">({preset.permissions.length})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission checkboxes */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    🔑 Permissions ({selectedPerms.size} of {ALL_PERMISSIONS.length})
                  </h3>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="text-xs font-bold text-indigo-600 hover:underline">Select All</button>
                    <button type="button" onClick={selectNone} className="text-xs font-bold text-slate-500 hover:underline">Clear All</button>
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
                            <label key={p.key} className="flex cursor-pointer items-center gap-2">
                              <input type="checkbox" checked={selectedPerms.has(p.key)} onChange={() => togglePerm(p.key)} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600" />
                              <span className="text-xs text-slate-600">{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {form.role === "admin" && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              🛡️ <strong>Admin</strong> has full access to all features. No need to select individual permissions.
            </div>
          )}

          {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Member"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
