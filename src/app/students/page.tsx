"use client";

import { useMemo, useState } from "react";
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
import AppShell from "@/components/AppShell";
import ImportStudentsModal from "@/components/ImportStudentsModal";
import { cls, delJSON, postJSON, putJSON, shortDate, todayStr, useFetch } from "@/lib/utils";

type Student = {
  id: number;
  admissionNo: string;
  name: string;
  gender: "male" | "female";
  classId: number | null;
  className: string | null;
  dateOfBirth: string | null;
  guardianName: string;
  guardianPhone: string;
  guardianAddress: string;
  enrollmentDate: string | null;
  createdAt: string;
};

type ClassRow = { id: number; name: string; section: string };

const emptyForm = {
  admissionNo: "",
  name: "",
  gender: "male",
  classId: "",
  dateOfBirth: "",
  guardianName: "",
  guardianPhone: "",
  guardianAddress: "",
  enrollmentDate: "",
};

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (classFilter) p.set("classId", classFilter);
    if (search.trim()) p.set("q", search.trim());
    const qs = p.toString();
    return qs ? `/api/students?${qs}` : "/api/students";
  }, [classFilter, search]);

  const { data, loading, error, refresh } = useFetch<Student[]>(url);
  const classesFetch = useFetch<ClassRow[]>("/api/classes");
  const classList = classesFetch.data ?? [];

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, enrollmentDate: todayStr() });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      admissionNo: s.admissionNo,
      name: s.name,
      gender: s.gender,
      classId: s.classId ? String(s.classId) : "",
      dateOfBirth: s.dateOfBirth ?? "",
      guardianName: s.guardianName ?? "",
      guardianPhone: s.guardianPhone ?? "",
      guardianAddress: s.guardianAddress ?? "",
      enrollmentDate: s.enrollmentDate ?? "",
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
        admissionNo: form.admissionNo,
        name: form.name,
        gender: form.gender,
        classId: form.classId,
        dateOfBirth: form.dateOfBirth,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        guardianAddress: form.guardianAddress,
        enrollmentDate: form.enrollmentDate,
      };
      if (editing) await putJSON(`/api/students/${editing.id}`, body);
      else await postJSON("/api/students", body);
      setOpen(false);
      refresh();
      classesFetch.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Student) {
    if (!window.confirm(`Are you sure you want to delete ${s.name}?`)) return;
    try {
      await delJSON(`/api/students/${s.id}`);
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  const filtered = data ?? [];

  return (
    <AppShell permission="students.view">
    <div>
      <PageHeader
        icon="👨‍🎓"
        title="Students"
        subtitle={`${filtered.length} student${filtered.length === 1 ? "" : "s"}`}
      >
        <button onClick={() => setImportOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100">
          📤 Import from Excel
        </button>
        <button onClick={openAdd} className={btnPrimary}>
          + Add Student
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, admission no., guardian..."
            className={cls(inputCls, "pl-10")}
          />
        </div>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={cls(inputCls, "sm:w-56")}>
          <option value="">All classes</option>
          {classList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <Loader />
      ) : error && !data ? (
        <EmptyState icon="⚠️" title="Failed to load" message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="👨‍🎓"
          title="No students found"
          message="Add the first student using the button above."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Gender</th>
                  <th className="px-4 py-3.5">Class</th>
                  <th className="px-4 py-3.5">Guardian</th>
                  <th className="px-4 py-3.5">Guardian Phone</th>
                  <th className="px-4 py-3.5">Enrolled</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="transition hover:bg-indigo-50/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} tone={s.gender === "female" ? "rose" : "indigo"} />
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.admissionNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={s.gender === "female" ? "rose" : "blue"}>
                        {s.gender === "female" ? "👧 Girl" : "👦 Boy"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {s.className ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.guardianName || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{s.guardianPhone || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{shortDate(s.enrollmentDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(s)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => remove(s)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit: ${editing.name}` : "Add Student"}
        wide
      >
        <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Admission No." className="sm:col-span-1">
            <input
              className={inputCls}
              value={form.admissionNo}
              onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
              placeholder="ADM-001 (leave blank to auto-generate)"
            />
          </Field>
          <Field label="Full Name" required>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. John Hassan Juma"
              required
            />
          </Field>
          <Field label="Gender" required>
            <select
              className={inputCls}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Class">
            <select
              className={inputCls}
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
            >
              <option value="">— No class —</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ` — ${c.section}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date of Birth">
            <input
              type="date"
              className={inputCls}
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </Field>
          <Field label="Guardian Name">
            <input
              className={inputCls}
              value={form.guardianName}
              onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
              placeholder="e.g. Hassan Juma"
            />
          </Field>
          <Field label="Guardian Phone">
            <input
              className={inputCls}
              value={form.guardianPhone}
              onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
              placeholder="+255 7XX XXX XXX"
            />
          </Field>
          <Field label="Guardian Address">
            <input
              className={inputCls}
              value={form.guardianAddress}
              onChange={(e) => setForm({ ...form, guardianAddress: e.target.value })}
              placeholder="e.g. Rombo"
            />
          </Field>
          <Field label="Enrollment Date">
            <input
              type="date"
              className={inputCls}
              value={form.enrollmentDate}
              onChange={(e) => setForm({ ...form, enrollmentDate: e.target.value })}
            />
          </Field>
          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            {formError && <p className="mr-auto text-sm font-semibold text-rose-600">{formError}</p>}
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Student"}
            </button>
          </div>
        </form>
      </Modal>

      <ImportStudentsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          refresh();
          classesFetch.refresh();
        }}
        classes={classList}
      />
    </div>
    </AppShell>
  );
}
