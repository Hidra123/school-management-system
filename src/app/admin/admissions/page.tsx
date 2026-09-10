"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Badge, EmptyState, Loader, PageHeader, btnPrimary, inputCls } from "@/components/ui";
import { cls, postJSON, useFetch } from "@/lib/utils";

type ApprovalRow = {
  id: number;
  type: "student_admission" | "exam" | "behavior_remark";
  refId: number;
  status: "pending" | "approved" | "rejected";
  summary: string;
  submittedById: number | null;
  submittedByName: string;
  note: string;
  decidedAt: string | null;
  createdAt: string;
};

const TYPES = [
  { key: "student_admission", label: "Student Admissions", icon: "👨‍🎓", hint: "Students admitted by the Academic Master (incl. Excel imports)" },
  { key: "exam", label: "Examinations", icon: "📋", hint: "New examinations created by the Academic Master" },
  { key: "behavior_remark", label: "Behavioural Assessments", icon: "🌟", hint: "Class Teacher behaviour ratings & comments for report cards" },
] as const;

export default function ApproveAdmissionsPage() {
  const { data, loading, error, refresh } = useFetch<ApprovalRow[]>("/api/admin/approvals");
  const [tab, setTab] = useState<(typeof TYPES)[number]["key"]>("student_admission");
  const [showHistory, setShowHistory] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const rows = useMemo(() => data ?? [], [data]);
  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const history = useMemo(() => rows.filter((r) => r.status !== "pending"), [rows]);

  const list = showHistory ? history.filter((r) => r.type === tab) : pending.filter((r) => r.type === tab);

  function count(t: string): number {
    return pending.filter((r) => r.type === t).length;
  }

  async function decide(row: ApprovalRow, action: "approve" | "reject") {
    if (action === "reject" && !window.confirm(`Reject "${row.summary}"? The record will be marked as rejected.`)) return;
    setBusyId(row.id);
    setMsg(null);
    try {
      await postJSON("/api/admin/approvals", { id: row.id, action, note: "" });
      setMsg(action === "approve" ? `✅ "${row.summary}" approved.` : `⚠️ "${row.summary}" rejected.`);
      refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function approveAll() {
    const items = pending.filter((r) => r.type === tab);
    if (items.length === 0) return;
    if (!window.confirm(`Approve all ${items.length} pending item(s) in this tab?`)) return;
    setBusyId(-1);
    setMsg(null);
    try {
      for (const r of items) {
        await postJSON("/api/admin/approvals", { id: r.id, action: "approve", note: "" });
      }
      setMsg(`✅ Approved ${items.length} item(s).`);
      refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell>
      <PageHeader icon="✅" title="Approve Admissions" subtitle="Review and approve sensitive work submitted by Academic and Class Teachers">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHistory(false)}
            className={cls("rounded-xl px-4 py-2 text-xs font-bold transition", !showHistory ? "bg-amber-500 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
          >
            ⏳ Pending ({pending.length})
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={cls("rounded-xl px-4 py-2 text-xs font-bold transition", showHistory ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
          >
            🗂️ History ({history.length})
          </button>
        </div>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cls(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
              tab === t.key ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {t.icon} {t.label}
            {!showHistory && count(t.key) > 0 && (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black text-amber-950">{count(t.key)}</span>
            )}
          </button>
        ))}
      </div>

      {!showHistory && count(tab) > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-inset ring-amber-200">
          <p className="text-xs font-semibold text-amber-800">⏳ {count(tab)} pending — {TYPES.find((t) => t.key === tab)?.hint}</p>
          <button onClick={approveAll} disabled={busyId !== null} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            ✅ Approve all {count(tab)}
          </button>
        </div>
      )}

      {msg && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">{msg}</p>}

      {loading && !data ? (
        <Loader label="Loading approval queue..." />
      ) : error ? (
        <EmptyState icon="⚠️" title="Could not load" message={error} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={showHistory ? "🗂️" : "🎉"}
          title={showHistory ? "No history yet" : "Nothing waiting for approval"}
          message={showHistory ? "Approved and rejected items will appear here." : "Everything from Academic and Class Teachers is already approved. New submissions will appear here automatically."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold">Item</th>
                <th className="px-4 py-3 text-left text-xs font-bold">Submitted By</th>
                <th className="px-4 py-3 text-left text-xs font-bold">When</th>
                <th className="px-4 py-3 text-left text-xs font-bold">Status</th>
                {!showHistory && <th className="px-4 py-3 text-right text-xs font-bold">Decision</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((r, i) => (
                <tr key={r.id} className="odd:bg-white even:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{r.summary || `#${r.refId}`}</td>
                  <td className="px-4 py-3 text-slate-600">{r.submittedByName || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.status === "approved" ? "emerald" : r.status === "rejected" ? "rose" : "amber"}>{r.status}</Badge>
                  </td>
                  {!showHistory && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => decide(r, "approve")}
                          disabled={busyId !== null}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                        >
                          {busyId === r.id ? "..." : "✅ Approve"}
                        </button>
                        <button
                          onClick={() => decide(r, "reject")}
                          disabled={busyId !== null}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40"
                        >
                          {busyId === r.id ? "..." : "✖ Reject"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
