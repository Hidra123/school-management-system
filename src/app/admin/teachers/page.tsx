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
  Spinner,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import { ROLE_PRESETS } from "@/lib/permissions";
import { cls, delJSON, postJSON, putJSON, shortDate, todayStr, useFetch } from "@/lib/utils";

type Teacher = {
  id: number;
  userId: number | null;
  name: string;
  email: string;
  phone: string;
  subject: string;
  qualification: string;
  hireDate: string | null;
  username: string | null;
  rawPassword: string | null;
  mustChangePassword: boolean | null;
  accountActive: boolean | null;
  hasAccount: boolean;
};

type PresetKey = keyof typeof ROLE_PRESETS;

const DEFAULT_PASSWORD = "shulehub2025";
const emptyForm = { name: "", username: "", email: "", phone: "", qualification: "", hireDate: "", preset: "teacher" as PresetKey };

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function AdminManageTeachersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState<Record<number, boolean>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [created, setCreated] = useState<Teacher | null>(null);

  const { data, loading, error, refresh } = useFetch<Teacher[]>("/api/teachers");

  const list = (data ?? []).filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [t.name, t.username ?? "", t.email, t.phone, t.qualification].join(" ").toLowerCase().includes(q);
  });

  const withoutAccount = (data ?? []).filter((t) => !t.hasAccount).length;

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, hireDate: todayStr() });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(t: Teacher) {
    setEditing(t);
    setForm({
      name: t.name,
      username: t.username ?? "",
      email: t.email ?? "",
      phone: t.phone ?? "",
      qualification: t.qualification ?? "",
      hireDate: t.hireDate ?? "",
      preset: "teacher",
    });
    setFormError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name,
        username: form.username,
        email: form.email,
        phone: form.phone,
        subject: "",
        qualification: form.qualification,
        hireDate: form.hireDate,
      };
      if (editing) {
        await putJSON(`/api/teachers/${editing.id}`, body);
      } else {
        const t = await postJSON<Teacher>("/api/teachers", {
          ...body,
          permissions: [...ROLE_PRESETS[form.preset].permissions],
        });
        setCreated(t);
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
    if (!window.confirm(`Remove ${t.name}? This also deletes their login account.`)) return;
    try {
      await delJSON(`/api/teachers/${t.id}`);
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  async function resetPassword(t: Teacher) {
    if (!window.confirm(`Reset ${t.name}'s password to the default "${DEFAULT_PASSWORD}"? They will be asked to change it on next login.`)) return;
    setBusyId(t.id);
    try {
      await putJSON(`/api/teachers/${t.id}`, { resetPassword: true });
      setShowPwd((p) => ({ ...p, [t.id]: true }));
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(t: Teacher) {
    setBusyId(t.id);
    try {
      await putJSON(`/api/teachers/${t.id}`, { accountActive: !t.accountActive });
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to update account.");
    } finally {
      setBusyId(null);
    }
  }

  function toggleShowPwd(id: number) {
    setShowPwd((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <AppShell>
      <PageHeader icon="👨‍🏫" title="Manage Teachers" subtitle={`${list.length} teacher${list.length === 1 ? "" : "s"} · each teacher gets a login account automatically`}>
        <button onClick={openAdd} className={btnPrimary}>+ Add Teacher</button>
      </PageHeader>

      {withoutAccount > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
          <span className="text-xl">⚠️</span>
          <p>
            <span className="font-bold">{withoutAccount} teacher{withoutAccount === 1 ? "" : "s"}</span> without a login account. Click <span className="font-semibold">Create Account</span> on their card and enter a Check Number.
          </p>
        </div>
      )}

      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or check number..." className={cls(inputCls, "pl-10")} />
        </div>
      </div>

      {loading && !data ? (
        <Loader />
      ) : error && !data ? (
        <EmptyState icon="⚠️" title="Failed to load" message={error} />
      ) : list.length === 0 ? (
        <EmptyState icon="👨‍🏫" title="No teachers yet" message="Add your first teacher. A login account is created automatically." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const pwd = t.rawPassword || "—";
            const isHidden = !showPwd[t.id];
            const busy = busyId === t.id;
            return (
              <div key={t.id} className={cls("rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md", t.hasAccount && t.accountActive === false ? "border-rose-200" : "border-slate-200/80")}>
                <div className="flex items-start gap-3">
                  <Avatar name={t.name} tone="violet" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{t.name}</p>
                    <p className="truncate text-xs text-slate-500">{t.qualification || "No qualification set"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {!t.hasAccount ? (
                        <Badge tone="amber">No account</Badge>
                      ) : t.accountActive === false ? (
                        <Badge tone="rose">Deactivated</Badge>
                      ) : t.mustChangePassword ? (
                        <Badge tone="amber">Default password</Badge>
                      ) : (
                        <Badge tone="emerald">Active</Badge>
                      )}
                    </div>
                  </div>
                  <button onClick={() => remove(t)} className="rounded-lg px-2 py-1 text-xs text-rose-500 hover:bg-rose-50" title="Remove teacher">🗑️</button>
                </div>

                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Check Number:</dt>
                    <dd className="text-right font-bold text-indigo-700">{t.username ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">Password:</dt>
                    <dd className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-semibold text-slate-700">
                        {!t.hasAccount ? "—" : isHidden ? "••••••••" : pwd}
                      </span>
                      {t.hasAccount && (
                        <button
                          onClick={() => toggleShowPwd(t.id)}
                          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title={isHidden ? "Show password" : "Hide password"}
                        >
                          <EyeIcon hidden={isHidden} />
                        </button>
                      )}
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

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => openEdit(t)} className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100">
                    {t.hasAccount ? "✏️ Edit" : "🔑 Create Account"}
                  </button>
                  {t.hasAccount ? (
                    <button onClick={() => resetPassword(t)} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60">
                      {busy ? <Spinner size={14} className="text-amber-700" /> : "🔄"} Reset Password
                    </button>
                  ) : (
                    <button onClick={() => openEdit(t)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                      ✏️ Edit Details
                    </button>
                  )}
                </div>
                {t.hasAccount && (
                  <button onClick={() => toggleActive(t)} disabled={busy} className={cls("mt-2 w-full rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60", t.accountActive === false ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "text-slate-500 hover:bg-slate-100")}>
                    {t.accountActive === false ? "✅ Re-activate login" : "⛔ Deactivate login"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? (editing.hasAccount ? `Edit: ${editing.name}` : `Create account: ${editing.name}`) : "Add Teacher"} wide>
        <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" required className="sm:col-span-2">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. John Doe" />
          </Field>
          <Field label="Check Number (login username)" required>
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
          <Field label="Registered Date" className={editing ? "sm:col-span-2" : ""}>
            <input type="date" className={inputCls} value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
          </Field>
          {!editing && (
            <Field label="Initial Role (permissions)">
              <select className={inputCls} value={form.preset} onChange={(e) => setForm({ ...form, preset: e.target.value as PresetKey })}>
                {(Object.keys(ROLE_PRESETS) as PresetKey[]).map((k) => (
                  <option key={k} value={k}>{ROLE_PRESETS[k].label} ({ROLE_PRESETS[k].permissions.length})</option>
                ))}
              </select>
            </Field>
          )}

          {(!editing || !editing.hasAccount) && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-800 sm:col-span-2">
              🔐 A login account will be created with the default password <span className="font-mono font-bold">{DEFAULT_PASSWORD}</span>. The teacher must change it on first login. You can fine-tune permissions later in <span className="font-semibold">Assignments</span>.
            </div>
          )}

          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            {formError && <p className="mr-auto text-sm font-semibold text-rose-600">{formError}</p>}
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving..." : editing ? (editing.hasAccount ? "Save Changes" : "Create Account") : "Add Teacher"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Credentials modal after creating */}
      <Modal open={!!created} onClose={() => setCreated(null)} title="✅ Teacher added">
        {created && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Share these login details with <span className="font-bold text-slate-900">{created.name}</span>:</p>
            <div className="rounded-xl bg-slate-900 p-4 font-mono text-sm text-white">
              <div className="flex justify-between"><span className="text-slate-400">Check Number</span><span className="font-bold">{created.username}</span></div>
              <div className="mt-2 flex justify-between"><span className="text-slate-400">Password</span><span className="font-bold">{created.rawPassword}</span></div>
            </div>
            <p className="text-xs text-slate-500">They will be required to set a new password the first time they sign in.</p>
            <div className="flex justify-end">
              <button onClick={() => setCreated(null)} className={btnPrimary}>Done</button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
