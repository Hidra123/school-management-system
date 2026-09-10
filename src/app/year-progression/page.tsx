"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Badge, EmptyState, Loader, PageHeader, inputCls } from "@/components/ui";
import { cls, postJSON, putJSON, useFetch } from "@/lib/utils";

type YearRow = { id: number; year: string; isActive: boolean; studentsArchived: number };
type PreviewRow = {
  classId: number;
  className: string;
  target: { id?: number; name: string; action: "promote" | "graduate" };
  students: { id: number; name: string; gender: string; admissionNo: string }[];
};
type AlumniRow = { id: number; name: string; gender: string; admissionNo: string; graduatedYear: string; previousClassName: string };

export default function YearProgressionPage() {
  const yearsFetch = useFetch<YearRow[]>("/api/academic-years");
  const classesFetch = useFetch<{ id: number; name: string }[]>("/api/classes");
  const [newYear, setNewYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [previewClassId, setPreviewClassId] = useState("");
  const previewFetch = useFetch<PreviewRow[]>(
    previewClassId ? `/api/academic-years/promote?classId=${previewClassId}` : null,
  );
  const preview = useMemo(() => previewFetch.data ?? [], [previewFetch.data]);

  const [selectedYearId, setSelectedYearId] = useState("");

  const years = useMemo(() => yearsFetch.data ?? [], [yearsFetch.data]);
  const activeYear = years.find((y) => y.isActive)?.year ?? "—";

  async function activate(id: number) {
    setBusy(true);
    setMsg(null);
    try {
      await putJSON("/api/academic-years", { id, activate: true });
      setMsg("✅ Academic year activated.");
      yearsFetch.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to activate year.");
    } finally {
      setBusy(false);
    }
  }

  async function createYear() {
    if (!newYear.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await postJSON("/api/academic-years", { year: newYear.trim() });
      setMsg(`✅ Academic year ${newYear.trim()} created.`);
      setNewYear("");
      yearsFetch.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to create year.");
    } finally {
      setBusy(false);
    }
  }

  async function runPromotion(row: PreviewRow) {
    const dest = row.target.action === "graduate" ? "Alumni (graduated)" : row.target.name;
    if (!window.confirm(`Move ALL ${row.students.length} students of ${row.className} to ${dest}? This action is permanent and cannot be undone.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await postJSON<{ moved: number; target: string }>("/api/academic-years/promote", { classId: row.classId, toYear: activeYear });
      setMsg(`✅ Moved ${res.moved} student(s) → ${res.target}.`);
      previewFetch.refresh();
      yearsFetch.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Promotion failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell permission="students.edit">
      <PageHeader icon="🔄" title="Academic Year Progression" subtitle="Promote students between forms, archive completed years, and switch the active academic year" />

      {/* Active year banner */}
      <div className="mb-5 flex items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-xl">📅</div>
          <p className="text-sm font-bold">Academic Year Progression</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-200">Active Year</p>
          <p className="text-2xl font-extrabold">{activeYear}</p>
        </div>
      </div>

      {msg && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">{msg}</p>}

      {/* Year switcher */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">🎓 Academic Year Switcher</p>
          <button onClick={() => yearsFetch.refresh()} className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20">↻ Refresh</button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Select Academic Year to Activate</label>
            <div className="flex gap-2">
              <select
                className={inputCls}
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
              >
                <option value="">-- pick a year --</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year} {y.isActive ? "★ ACTIVE" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Create New Academic Year</label>
              <input value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="e.g. 2027" className={inputCls} />
            </div>
            <button onClick={createYear} disabled={busy || !/^\d{4}$/.test(newYear.trim())} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-40">
              + Create Year
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-bold">#</th>
              <th className="px-5 py-2.5 text-left text-xs font-bold">Academic Year</th>
              <th className="px-5 py-2.5 text-left text-xs font-bold">Status</th>
              <th className="px-5 py-2.5 text-left text-xs font-bold">Students Archived</th>
              <th className="px-5 py-2.5 text-right text-xs font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {years.map((y, i) => (
              <tr key={y.id} className="odd:bg-white even:bg-slate-50/60">
                <td className="px-5 py-3 text-slate-500">{i + 1}</td>
                <td className="px-5 py-3 font-bold text-slate-900">{y.year}</td>
                <td className="px-5 py-3">
                  <Badge tone={y.isActive ? "emerald" : "slate"}>{y.isActive ? "● ACTIVE" : "inactive"}</Badge>
                </td>
                <td className="px-5 py-3 text-slate-600">{y.studentsArchived}</td>
                <td className="px-5 py-3 text-right">
                  {y.isActive ? (
                    <span className="text-xs font-bold text-emerald-600">✓ Current</span>
                  ) : (
                    <button onClick={() => activate(y.id)} disabled={busy} className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
                      ✓ Activate Selected Year
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {years.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No academic years yet — create the first one above.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Promotion engine */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">⚙ Class Promotion Engine</p>
          <p className="text-xs font-semibold text-indigo-300">Move students up one Form level at end of academic year</p>
        </div>
        <div className="p-5">
          <div className="rounded-xl border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-800">
            ℹ️ How Promotion Works: Form 1 → Form 2 | Form 2 → Form 3 | Form 3 → Form 4 | <b className="text-rose-600">Form 4 → Graduated (Alumni)</b> — records kept safely.
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-64">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Step 1 — Preview students by class</label>
              <select value={previewClassId} onChange={(e) => setPreviewClassId(e.target.value)} className={inputCls}>
                <option value="">-- All classes (bulk preview) --</option>
                {(classesFetch.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { setPreviewClassId(previewClassId || "all"); }}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
            >
              👁  Preview
            </button>
          </div>

          {previewFetch.loading && previewClassId ? (
            <div className="mt-6"><Loader label="Building preview..." /></div>
          ) : previewClassId && preview.length > 0 ? (
            <div className="mt-5 space-y-4">
              {preview.map((row) => (
                <div key={row.classId} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {row.className} ‑{row.students.length} students
                      </p>
                      <p className={cls("text-xs font-semibold", row.target.action === "graduate" ? "text-rose-600" : "text-emerald-700")}>
                        {row.target.action === "graduate" ? "🎓 → Alumni (Graduated)" : `↑ → ${row.target.name}`}
                      </p>
                    </div>
                    <button
                      onClick={() => runPromotion(row)}
                      disabled={busy || row.students.length === 0}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      ▶ Run Promotion
                    </button>
                  </div>
                  {row.students.length === 0 ? (
                    <p className="px-4 py-3 text-xs italic text-slate-400">No students in this class.</p>
                  ) : (
                    <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto">
                      {row.students.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs">
                          <span className="font-semibold text-slate-700">{s.name}</span>
                          <span className="text-slate-400">{s.admissionNo}</span>
                          <Badge tone={s.gender === "female" ? "rose" : "blue"}>{s.gender === "female" ? "Female" : "Male"}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : previewClassId ? (
            <p className="mt-5 text-sm italic text-slate-400">No preview — choose a class above.</p>
          ) : (
            <p className="mt-5 text-sm italic text-slate-400">Pick a class (or leave “All classes (bulk preview)” for the whole school) and click Preview.</p>
          )}
        </div>
      </section>

      <AlumniBlock years={years} />
    </AppShell>
  );
}

function AlumniBlock({ years }: { years: YearRow[] }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState("");
  const [search, setSearch] = useState("");
  const alumniFetch = useFetch<AlumniRow[]>(open ? `/api/academic-years?mode=alumni${year ? `&year=${year}` : ""}` : null);
  const rows = useMemo(() => alumniFetch.data ?? [], [alumniFetch.data]);
  const shown = useMemo(
    () => rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.admissionNo.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-5 py-3">
        <p className="text-sm font-bold text-white">🎓 Alumni Archive (Graduated Students)</p>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
        >
          ↻ Load Alumni
        </button>
      </div>
      {!open ? (
        <p className="px-5 py-8 text-center text-sm italic text-slate-400">Click Load Alumni to view graduated students.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
            <select value={year} onChange={(e) => setYear(e.target.value)} className={cls(inputCls, "sm:w-48")}>
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y.id} value={y.year}>{y.year}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alumni…"
              className={cls(inputCls, "flex-1")}
            />
          </div>
          {alumniFetch.loading ? (
            <Loader label="Loading alumni..." />
          ) : shown.length === 0 ? (
            <div className="p-5"><EmptyState icon="🎓" title="No alumni yet" message="Type 4 students graduate to this archive once promotion runs." /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-bold">#</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold">Name</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold">Sex</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold">Adm No.</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold">Graduated Year</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold">Previous Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r, i) => (
                  <tr key={r.id} className="odd:bg-white even:bg-slate-50/60">
                    <td className="px-5 py-2.5 text-slate-400">{i + 1}</td>
                    <td className="px-5 py-2.5 font-bold text-slate-800">{r.name}</td>
                    <td className="px-5 py-2.5 text-slate-600">{r.gender === "female" ? "Female" : "Male"}</td>
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{r.admissionNo}</td>
                    <td className="px-5 py-2.5"><Badge tone="amber">{r.graduatedYear}</Badge></td>
                    <td className="px-5 py-2.5 text-slate-600">{r.previousClassName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
