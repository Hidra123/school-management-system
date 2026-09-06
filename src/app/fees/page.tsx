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
import { cls, delJSON, money, postJSON, putJSON, shortDate, todayStr, useFetch } from "@/lib/utils";

type FeeRow = {
  id: number;
  studentId: number;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  createdAt: string;
  studentName: string;
  admissionNo: string;
  className: string | null;
};

type StudentLight = { id: number; admissionNo: string; name: string };

const emptyForm = { studentId: "", description: "Term 1 Fees", amount: "", dueDate: "" };

type StatusKey = "paid" | "partial" | "unpaid" | "overdue";

function feeStatus(f: FeeRow): StatusKey {
  const balance = f.amount - f.paidAmount;
  if (balance <= 0) return "paid";
  if (f.dueDate && f.dueDate < todayStr()) return "overdue";
  if (f.paidAmount > 0) return "partial";
  return "unpaid";
}

const statusMeta: Record<StatusKey, { label: string; tone: "emerald" | "amber" | "slate" | "red"; icon: string }> = {
  paid: { label: "Paid", tone: "emerald", icon: "✅" },
  partial: { label: "Partially Paid", tone: "amber", icon: "🟡" },
  unpaid: { label: "Unpaid", tone: "slate", icon: "⏳" },
  overdue: { label: "Overdue", tone: "red", icon: "⚠️" },
};

export default function FeesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | StatusKey>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<FeeRow | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const { data, loading, error, refresh } = useFetch<FeeRow[]>("/api/fees");
  const studentsFetch = useFetch<StudentLight[]>("/api/students");
  const studentList = studentsFetch.data ?? [];
  const all = data ?? [];

  const totals = useMemo(() => {
    let collected = 0;
    let expected = 0;
    const st: Record<StatusKey, number> = { paid: 0, partial: 0, unpaid: 0, overdue: 0 };
    for (const f of all) {
      collected += f.paidAmount;
      expected += f.amount;
      st[feeStatus(f)] += 1;
    }
    return { collected, expected, balance: expected - collected, ...st };
  }, [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((f) => {
      if (statusFilter && feeStatus(f) !== statusFilter) return false;
      if (!q) return true;
      return [f.studentName, f.admissionNo, f.description, f.className]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [all, search, statusFilter]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, dueDate: "" });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(f: FeeRow) {
    setEditing(f);
    setForm({
      studentId: String(f.studentId),
      description: f.description,
      amount: String(f.amount),
      dueDate: f.dueDate ?? "",
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
        studentId: form.studentId,
        description: form.description,
        amount: Number(form.amount),
        dueDate: form.dueDate,
      };
      if (editing) await putJSON(`/api/fees/${editing.id}`, body);
      else await postJSON("/api/fees", body);
      setOpen(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function openPay(f: FeeRow) {
    setPayFor(f);
    setPayAmount("");
    setFormError(null);
  }

  async function submitPay(e: React.FormEvent) {
    e.preventDefault();
    if (!payFor) return;
    const balance = payFor.amount - payFor.paidAmount;
    const n = Number(payAmount);
    if (!Number.isFinite(n) || n <= 0) {
      setFormError("Enter a valid payment amount.");
      return;
    }
    const payment = Math.min(n, balance);
    setSaving(true);
    setFormError(null);
    try {
      await putJSON(`/api/fees/${payFor.id}`, { payment });
      refresh();
      setPayFor(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(f: FeeRow) {
    if (!window.confirm(`Delete the fee record for ${f.studentName}?`)) return;
    try {
      await delJSON(`/api/fees/${f.id}`);
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  const payBalance = payFor ? payFor.amount - payFor.paidAmount : 0;

  return (
    <AppShell permission="fees.view">
    <div>
      <PageHeader icon="💰" title="Fees" subtitle="Manage school fees and payments">
        <button onClick={openAdd} className={btnPrimary}>
          + Add Fee
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collected</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-600">{money(totals.collected)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding</p>
          <p className="mt-1 text-xl font-extrabold text-rose-600">{money(totals.balance)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fully Paid</p>
          <p className="mt-1 text-xl font-extrabold text-slate-900">
            {totals.paid}
            <span className="text-sm font-semibold text-slate-400"> / {all.length}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overdue</p>
          <p className="mt-1 text-xl font-extrabold text-red-600">{totals.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, admission no., description..."
            className={cls(inputCls, "pl-10")}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | StatusKey)}
          className={cls(inputCls, "sm:w-56")}
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partially paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {loading && !data ? (
        <Loader />
      ) : error && !data ? (
        <EmptyState icon="⚠️" title="Failed to load" message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="💰"
          title="No fee records"
          message="Add a fee for a student using the button above."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5">Total Fee</th>
                  <th className="px-4 py-3.5">Paid</th>
                  <th className="px-4 py-3.5">Balance</th>
                  <th className="px-4 py-3.5">Due Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((f) => {
                  const st = feeStatus(f);
                  const meta = statusMeta[st];
                  const balance = Math.max(0, f.amount - f.paidAmount);
                  const pct = f.amount > 0 ? Math.min(100, Math.round((f.paidAmount / f.amount) * 100)) : 0;
                  return (
                    <tr key={f.id} className="transition hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={f.studentName} tone="amber" />
                          <div>
                            <p className="font-bold text-slate-900">{f.studentName}</p>
                            <p className="text-xs text-slate-500">
                              {f.admissionNo}
                              {f.className ? ` • ${f.className}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[180px] px-4 py-3">
                        <p className="truncate font-semibold text-slate-700">{f.description}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{money(f.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-semibold text-slate-600">{money(f.paidAmount)}</span>
                        </div>
                      </td>
                      <td className={cls("px-4 py-3 font-bold", balance > 0 ? "text-rose-600" : "text-emerald-600")}>
                        {money(balance)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{shortDate(f.dueDate)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>
                          {meta.icon} {meta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openPay(f)}
                            disabled={balance <= 0}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                          >
                            💵 Pay
                          </button>
                          <button
                            onClick={() => openEdit(f)}
                            className="rounded-lg px-2 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => remove(f)}
                            className="rounded-lg px-2 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit fee modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit Fee: ${editing.studentName}` : "Add Fee"}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Student" required>
            <select
              className={inputCls}
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              required
            >
              <option value="">— Select student —</option>
              {studentList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.admissionNo})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input
              className={inputCls}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Term 1 Fees"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fee Amount (TZS)" required>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="150000"
                required
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                className={inputCls}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </Field>
          </div>
          {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Fee"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay modal */}
      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={`💵 Record Payment — ${payFor?.studentName ?? ""}`}>
        {payFor && (
          <form onSubmit={submitPay} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total fee:</span>
                <span className="font-bold text-slate-900">{money(payFor.amount)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Paid so far:</span>
                <span className="font-bold text-emerald-600">{money(payFor.paidAmount)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-semibold text-slate-600">Balance:</span>
                <span className="font-extrabold text-rose-600">{money(payBalance)}</span>
              </div>
            </div>
            <Field label="Payment Amount (TZS)" required>
              <input
                type="number"
                min={1}
                max={payBalance}
                className={inputCls}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={String(Math.round(payBalance))}
                required
              />
            </Field>
            <div className="flex gap-2">
              {[0.25, 0.5, 1].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPayAmount(String(Math.round(payBalance * p)))}
                  className={btnGhost}
                >
                  {p === 1 ? "Full Amount" : `${p * 100}%`}
                </button>
              ))}
            </div>
            {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPayFor(null)} className={btnGhost}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? "Saving..." : "✅ Confirm Payment"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
    </AppShell>
  );
}
