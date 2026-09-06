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
  btnDanger,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import { ALL_PERMISSIONS, getPermissionGroups } from "@/lib/permissions";
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

const emptyForm = { name: "", email: "", password: "", role: "member" as "admin" | "member" };

export default function AdminPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, error, refresh } = useFetch<Member[]>("/api/admin/members");
  const list = data ?? [];
  const groups = getPermissionGroups();

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
      <PageHeader icon="⚙️" title="Admin Panel" subtitle="Manage team members and their permissions">
        <button onClick={openAdd} className={btnPrimary}>
          + Add Member
        </button>
      </PageHeader>

      {loading && !data ? (
        <Loader />
      ) : error && !data ? (
        <EmptyState icon="⚠️" title="Failed to load" message={error} />
      ) : list.length === 0 ? (
        <EmptyState icon="👥" title="No members" message="Add your first team member." />
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

                {/* Permissions preview */}
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
                      m.permissions.slice(0, 8).map((p) => {
                        const pDef = ALL_PERMISSIONS.find((x) => x.key === p);
                        return (
                          <Badge key={p} tone="slate">
                            {pDef?.label ?? p}
                          </Badge>
                        );
                      })
                    )}
                    {m.role !== "admin" && m.permissions.length > 8 && (
                      <Badge tone="slate">+{m.permissions.length - 8} more</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openEdit(m)}
                    className="flex-1 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    ✏️ Edit / Permissions
                  </button>
                  <button
                    onClick={() => toggleActive(m)}
                    className={cls(
                      "rounded-xl border px-3 py-2 text-sm font-bold transition",
                      m.active
                        ? "border-amber-100 bg-amber-50/60 text-amber-700 hover:bg-amber-100"
                        : "border-emerald-100 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100",
                    )}
                  >
                    {m.active ? "🚫 Disable" : "✅ Enable"}
                  </button>
                  <button
                    onClick={() => remove(m)}
                    className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit: ${editing.name}` : "Add Member"} wide>
        <form onSubmit={save} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" required>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. John Doe"
                required
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@school.com"
                required={!editing}
              />
            </Field>
            <Field label={editing ? "New Password (leave blank to keep)" : "Password"} required={!editing}>
              <input
                type="password"
                className={inputCls}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? "Leave blank to keep current" : "Min 4 characters"}
                minLength={editing ? 0 : 4}
                required={!editing}
              />
            </Field>
            <Field label="Role" required>
              <select
                className={inputCls}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "member" })}
              >
                <option value="member">👤 Member (Custom Permissions)</option>
                <option value="admin">🛡️ Admin (Full Access)</option>
              </select>
            </Field>
          </div>

          {/* Permission checkboxes — only for members */}
          {form.role === "member" && (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  🔑 Assign Permissions ({selectedPerms.size} of {ALL_PERMISSIONS.length})
                </h3>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} className="text-xs font-bold text-indigo-600 hover:underline">
                    Select All
                  </button>
                  <button type="button" onClick={selectNone} className="text-xs font-bold text-slate-500 hover:underline">
                    Clear All
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
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
                        <span className="text-sm font-bold text-slate-800">
                          {perms[0].icon} {groupName}
                        </span>
                      </label>
                      <div className="ml-6 mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {perms.map((p) => (
                          <label key={p.key} className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedPerms.has(p.key)}
                              onChange={() => togglePerm(p.key)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                            />
                            <span className="text-xs text-slate-600">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {form.role === "admin" && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              🛡️ <strong>Admin</strong> has full access to all features. No need to select individual permissions.
            </div>
          )}

          {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Member"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
