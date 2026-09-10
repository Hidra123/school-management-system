"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Badge,
  EmptyState,
  Field,
  Loader,
  Modal,
  PageHeader,
  StatCard,
  btnDanger,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { staffRoleLabel } from "@/lib/permissions";
import { cls, postJSON, shortDate, useFetch } from "@/lib/utils";

type YearItem = {
  id: number;
  year: string;
  isActive: boolean;
  studentsArchived: number;
  createdAt: string;
};

type ClassItem = {
  id: number;
  name: string;
  section: string;
};

type YearResponse = {
  activeYear: string;
  years: YearItem[];
  classes: ClassItem[];
  totalAlumni: number;
};

type PromotionStep = {
  fromClassId: number;
  fromClassName: string;
  fromClassSection: string;
  toClassId: number | null;
  toClassName: string;
  studentCount: number;
  isGraduating: boolean;
};

type PreviewResponse = {
  preview: PromotionStep[];
  totalStudents: number;
  totalGraduating: number;
  totalPromoted: number;
};

type AlumniItem = {
  id: number;
  studentId: number;
  admissionNo: string;
  name: string;
  gender: "male" | "female";
  previousClassId: number | null;
  previousClassName: string;
  graduatedYear: string;
  createdAt: string;
};

export default function AcademicYearProgressionPage() {
  const { user } = useAuth();
  const yearFetch = useFetch<YearResponse>("/api/academic-year");
  const data = yearFetch.data;
  const activeYear = data?.activeYear || "2026";

  // Section 1: Switcher states
  const [selectedYearToActivate, setSelectedYearToActivate] = useState("");
  const [newYearInput, setNewYearInput] = useState("");
  const [yearActionLoading, setYearActionLoading] = useState(false);
  const [yearMsg, setYearMsg] = useState<string | null>(null);

  // Section 2: Promotion Engine states
  const [previewClassId, setPreviewClassId] = useState("all");
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [fromYearInput, setFromYearInput] = useState("");
  const [toYearInput, setToYearInput] = useState("");
  const [promoteClassId, setPromoteClassId] = useState("all");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<{
    promotedCount: number;
    graduatedCount: number;
    fromYear: string;
    toYear: string;
  } | null>(null);

  // Section 3: Alumni states
  const [alumniLoaded, setAlumniLoaded] = useState(false);
  const [alumniYearFilter, setAlumniYearFilter] = useState("all");
  const [alumniSearch, setAlumniSearch] = useState("");
  const alumniUrl = useMemo(() => {
    if (!alumniLoaded) return null;
    const p = new URLSearchParams();
    if (alumniYearFilter) p.set("year", alumniYearFilter);
    if (alumniSearch.trim()) p.set("q", alumniSearch.trim());
    return `/api/academic-year/alumni?${p.toString()}`;
  }, [alumniLoaded, alumniYearFilter, alumniSearch]);

  const alumniFetch = useFetch<{ alumni: AlumniItem[] }>(alumniUrl);
  const alumniList = alumniFetch.data?.alumni ?? [];

  // Effective from year default to activeYear
  const effectiveFromYear = fromYearInput || activeYear;
  const computedNextYear = useMemo(() => {
    const num = parseInt(effectiveFromYear, 10);
    return !isNaN(num) ? String(num + 1) : "";
  }, [effectiveFromYear]);
  const effectiveToYear = toYearInput || computedNextYear;

  // ---------------- ACTIONS: YEAR SWITCHER ----------------
  async function handleCreateYear() {
    const y = newYearInput.trim();
    if (!y) return;
    setYearActionLoading(true);
    setYearMsg(null);
    try {
      await postJSON("/api/academic-year", { action: "create_year", year: y });
      setNewYearInput("");
      setYearMsg(`✅ Academic Year ${y} created successfully.`);
      yearFetch.refresh();
      setTimeout(() => setYearMsg(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create year.");
    } finally {
      setYearActionLoading(false);
    }
  }

  async function handleActivateYear(targetYear?: string) {
    const y = targetYear || selectedYearToActivate;
    if (!y) return;
    setYearActionLoading(true);
    setYearMsg(null);
    try {
      await postJSON("/api/academic-year", { action: "activate_year", year: y });
      setYearMsg(`✅ Switched active academic year to ${y}.`);
      yearFetch.refresh();
      setTimeout(() => setYearMsg(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to activate year.");
    } finally {
      setYearActionLoading(false);
    }
  }

  async function handleDeleteYear(targetYear: string) {
    if (!window.confirm(`Delete academic year ${targetYear}?`)) return;
    try {
      await postJSON("/api/academic-year", { action: "delete_year", year: targetYear });
      yearFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete year.");
    }
  }

  // ---------------- ACTIONS: PROMOTION ----------------
  async function handlePreviewPromotion() {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await postJSON<PreviewResponse>("/api/academic-year/preview-promotion", {
        classId: previewClassId,
      });
      setPreviewData(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to preview promotion.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function openConfirmPromotion() {
    if (!effectiveFromYear || !effectiveToYear) {
      alert("Please specify both From Year and To Year.");
      return;
    }
    setConfirmModalOpen(true);
  }

  async function executePromotion() {
    setPromoting(true);
    setPromoteResult(null);
    try {
      const res = await postJSON<{
        ok: boolean;
        promotedCount: number;
        graduatedCount: number;
        fromYear: string;
        toYear: string;
      }>("/api/academic-year/promote", {
        fromYear: effectiveFromYear,
        toYear: effectiveToYear,
        classId: promoteClassId,
      });
      setPromoteResult(res);
      setConfirmModalOpen(false);
      setPreviewData(null);
      yearFetch.refresh();
      if (alumniLoaded) alumniFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Promotion failed.");
    } finally {
      setPromoting(false);
    }
  }

  const roleBadge = user?.role === "member" ? staffRoleLabel(user.staffRole) : "🛡️ Admin";

  return (
    <AppShell permission="year.manage">
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          icon="📅"
          title="Academic Year Progression"
          subtitle="Promote students between forms, archive completed years, and switch the active academic year"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
            {roleBadge}
          </span>
        </PageHeader>

        {/* Top Hero Banner */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-md">
              📅
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Academic Year Progression</h2>
              <p className="text-xs text-slate-500">
                Promote students between forms, archive completed years, and switch the active academic year
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-2 text-right">
              <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-700">
                Active Year
              </span>
              <span className="text-xl font-black text-indigo-950">{activeYear}</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION 1: ACADEMIC YEAR SWITCHER                              */}
        {/* ============================================================== */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-white">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>🔄</span>
              <span>Academic Year Switcher</span>
            </div>
            <button
              onClick={() => yearFetch.refresh()}
              className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20 transition flex items-center gap-1.5"
            >
              <span>🔄</span> Refresh
            </button>
          </div>

          <div className="p-5 space-y-4">
            {yearMsg && (
              <div className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 border border-emerald-200">
                {yearMsg}
              </div>
            )}

            {/* Controls Bar */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-end">
              <div className="lg:col-span-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Select Academic Year to Activate
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedYearToActivate || activeYear}
                    onChange={(e) => setSelectedYearToActivate(e.target.value)}
                    className={cls(inputCls, "text-xs font-bold")}
                  >
                    {(data?.years ?? []).map((y) => (
                      <option key={y.id} value={y.year}>
                        {y.year} {y.isActive ? "★ ACTIVE" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleActivateYear()}
                    disabled={yearActionLoading || (selectedYearToActivate || activeYear) === activeYear}
                    className={cls(
                      "rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition",
                      (selectedYearToActivate || activeYear) === activeYear
                        ? "bg-slate-100 text-slate-400 cursor-default"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
                    )}
                  >
                    Activate Selected Year
                  </button>
                </div>
              </div>

              <div className="lg:col-span-8 flex flex-wrap items-end gap-2 justify-end">
                <div className="w-56">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Create New Academic Year
                  </label>
                  <input
                    type="text"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    placeholder="e.g. 2027"
                    className={cls(inputCls, "text-xs")}
                  />
                </div>
                <button
                  onClick={handleCreateYear}
                  disabled={yearActionLoading || !newYearInput.trim()}
                  className={cls(
                    "rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm disabled:opacity-50",
                  )}
                >
                  + Create Year
                </button>
              </div>
            </div>

            {/* Table of Academic Years */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left font-extrabold uppercase">#</th>
                    <th className="px-3.5 py-2.5 text-left font-extrabold uppercase">Academic Year</th>
                    <th className="px-3.5 py-2.5 text-left font-extrabold uppercase">Status</th>
                    <th className="px-3.5 py-2.5 text-right font-extrabold uppercase">Students Archived</th>
                    <th className="px-3.5 py-2.5 text-left font-extrabold uppercase">Created</th>
                    <th className="px-3.5 py-2.5 text-right font-extrabold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.years ?? []).map((y, idx) => (
                    <tr key={y.id} className={cls("hover:bg-slate-50", y.isActive && "bg-emerald-50/40")}>
                      <td className="px-3.5 py-2.5 text-slate-500">{idx + 1}</td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 text-sm">
                        {y.year}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {y.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-700">
                        {y.studentsArchived}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500">{shortDate(y.createdAt)}</td>
                      <td className="px-3.5 py-2.5 text-right">
                        {y.isActive ? (
                          <span className="text-emerald-700 font-bold text-xs">✓ Current</span>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleActivateYear(y.year)}
                              className="rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 text-xs font-bold"
                            >
                              Activate
                            </button>
                            {y.studentsArchived === 0 && (
                              <button
                                onClick={() => handleDeleteYear(y.year)}
                                className="rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 text-xs font-bold"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 2: CLASS PROMOTION ENGINE                              */}
        {/* ============================================================== */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3 text-white">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>➔</span>
              <span>Class Promotion Engine</span>
            </div>
            <span className="text-xs text-slate-300">
              Move students up one Form level at end of academic year
            </span>
          </div>

          <div className="p-5 space-y-5">
            {/* Promotion Result Alert */}
            {promoteResult && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 space-y-1">
                <p className="font-extrabold text-sm text-emerald-900">
                  🎉 Promotion Completed Successfully!
                </p>
                <p className="text-xs text-emerald-800">
                  Promoted <b>{promoteResult.promotedCount}</b> student(s) to the next Form level, and archived <b>{promoteResult.graduatedCount}</b> graduating Form 4 student(s) to the Alumni Archive.
                  Active academic year is now <b>{promoteResult.toYear}</b>.
                </p>
              </div>
            )}

            {/* Explanatory Banner */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-950">
              <p className="font-extrabold text-indigo-900 mb-1">ℹ️ How Promotion Works:</p>
              <div className="flex flex-wrap items-center gap-2 text-slate-700 font-semibold">
                <span className="bg-white px-2 py-0.5 rounded border border-indigo-200">Form 1 → Form 2</span>
                <span>|</span>
                <span className="bg-white px-2 py-0.5 rounded border border-indigo-200">Form 2 → Form 3</span>
                <span>|</span>
                <span className="bg-white px-2 py-0.5 rounded border border-indigo-200">Form 3 → Form 4</span>
                <span>|</span>
                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-bold">
                  Form 4 → Graduated (Alumni — records kept safely)
                </span>
              </div>
            </div>

            {/* STEP 1: PREVIEW */}
            <div className="space-y-3 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-600 text-[10px] text-white">
                  1
                </span>
                <span>STEP 1 — PREVIEW STUDENTS BY CLASS</span>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="w-56">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    Select Class to Preview
                  </label>
                  <select
                    value={previewClassId}
                    onChange={(e) => setPreviewClassId(e.target.value)}
                    className={cls(inputCls, "text-xs font-bold")}
                  >
                    <option value="all">-- All Classes --</option>
                    {(data?.classes ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handlePreviewPromotion}
                  disabled={previewLoading}
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <span>👁️</span> {previewLoading ? "Calculating..." : "Preview"}
                </button>
              </div>

              {/* Preview Results Table */}
              {previewData && (
                <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 flex justify-between">
                    <span>Promotion Preview Summary</span>
                    <span>
                      {previewData.totalStudents} total students ({previewData.totalPromoted} promote, {previewData.totalGraduating} graduate)
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Current Class</th>
                        <th className="px-3 py-2 text-right">Students</th>
                        <th className="px-3 py-2 text-center">➔</th>
                        <th className="px-3 py-2 text-left">Destination Level</th>
                        <th className="px-3 py-2 text-center">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.preview.map((p) => (
                        <tr key={p.fromClassId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-800">
                            {p.fromClassName} {p.fromClassSection ? `(${p.fromClassSection})` : ""}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">
                            {p.studentCount}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-400 font-bold">➔</td>
                          <td className="px-3 py-2 font-bold text-slate-800">{p.toClassName}</td>
                          <td className="px-3 py-2 text-center">
                            {p.isGraduating ? (
                              <Badge tone="amber">🎓 Graduates to Alumni</Badge>
                            ) : (
                              <Badge tone="emerald">Promotes to next Form</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* STEP 2: EXECUTE PROMOTION */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-[10px] text-white">
                  2
                </span>
                <span>STEP 2 — EXECUTE PROMOTION</span>
              </div>

              {/* Warning Banner */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 leading-relaxed font-semibold">
                ⚠️ Warning: This action moves students permanently. A confirmation is required.
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    From Academic Year
                  </label>
                  <input
                    type="text"
                    value={effectiveFromYear}
                    onChange={(e) => setFromYearInput(e.target.value)}
                    className={cls(inputCls, "text-xs font-bold")}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    To Academic Year
                  </label>
                  <input
                    type="text"
                    value={effectiveToYear}
                    onChange={(e) => setToYearInput(e.target.value)}
                    placeholder="e.g. 2027"
                    className={cls(inputCls, "text-xs font-bold")}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    Promote Which Class
                  </label>
                  <select
                    value={promoteClassId}
                    onChange={(e) => setPromoteClassId(e.target.value)}
                    className={cls(inputCls, "text-xs font-bold")}
                  >
                    <option value="all">All Classes (Bulk Promotion)</option>
                    {(data?.classes ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={openConfirmPromotion}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>➔</span> Run Promotion
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 3: ALUMNI ARCHIVE (GRADUATED STUDENTS)                 */}
        {/* ============================================================== */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3 text-white">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>🎓</span>
              <span>Alumni Archive (Graduated Students)</span>
            </div>
            <button
              onClick={() => {
                setAlumniLoaded(true);
                alumniFetch.refresh();
              }}
              className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20 transition flex items-center gap-1.5"
            >
              <span>🔄</span> Load Alumni
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-48">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Filter by Year
                </label>
                <select
                  value={alumniYearFilter}
                  onChange={(e) => {
                    setAlumniYearFilter(e.target.value);
                    if (!alumniLoaded) setAlumniLoaded(true);
                  }}
                  className={cls(inputCls, "text-xs font-bold")}
                >
                  <option value="all">All Years</option>
                  {(data?.years ?? []).map((y) => (
                    <option key={y.id} value={y.year}>
                      Class of {y.year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-64">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={alumniSearch}
                  onChange={(e) => {
                    setAlumniSearch(e.target.value);
                    if (!alumniLoaded) setAlumniLoaded(true);
                  }}
                  placeholder="Search alumni..."
                  className={cls(inputCls, "text-xs")}
                />
              </div>

              <div className="ml-auto text-xs text-slate-500 font-semibold pt-4">
                {alumniLoaded ? `${alumniList.length} alumni record(s)` : `${data?.totalAlumni ?? 0} total alumni in database`}
              </div>
            </div>

            {/* Table */}
            {!alumniLoaded ? (
              <div className="py-14 text-center text-slate-400">
                <p className="text-3xl mb-1">🎓</p>
                <p className="text-xs font-bold text-slate-600">Click Load Alumni to view graduated students.</p>
                <button
                  type="button"
                  onClick={() => setAlumniLoaded(true)}
                  className="mt-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-1.5 text-xs font-bold transition"
                >
                  Load Alumni Records
                </button>
              </div>
            ) : alumniFetch.loading ? (
              <div className="py-12">
                <Loader label="Loading alumni archive..." />
              </div>
            ) : alumniList.length === 0 ? (
              <EmptyState
                icon="🎓"
                title="No alumni records found"
                message="Students who complete Form 4 during end-of-year promotion are automatically archived here."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left font-extrabold uppercase">#</th>
                      <th className="px-3.5 py-2.5 text-left font-extrabold uppercase">Name</th>
                      <th className="px-3.5 py-2.5 text-left font-extrabold uppercase">Sex</th>
                      <th className="px-3.5 py-2.5 text-left font-extrabold uppercase">Adm No.</th>
                      <th className="px-3.5 py-2.5 text-center font-extrabold uppercase">Graduated Year</th>
                      <th className="px-3.5 py-2.5 text-left font-extrabold uppercase">Previous Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {alumniList.map((a, idx) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-3.5 py-2 font-bold text-slate-900">{a.name}</td>
                        <td className="px-3.5 py-2 capitalize text-slate-600">{a.gender}</td>
                        <td className="px-3.5 py-2 font-mono font-bold text-indigo-700">{a.admissionNo}</td>
                        <td className="px-3.5 py-2 text-center font-mono font-bold text-slate-800">
                          {a.graduatedYear}
                        </td>
                        <td className="px-3.5 py-2 text-slate-600">{a.previousClassName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Modal: Confirm Promotion */}
        {confirmModalOpen && (
          <Modal
            open={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            title="⚠️ Confirm Student Promotion"
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 leading-relaxed space-y-2">
                <p className="font-extrabold text-sm text-amber-950">
                  Are you sure you want to execute promotion?
                </p>
                <p>
                  You are about to promote students from <b>{effectiveFromYear}</b> to <b>{effectiveToYear}</b>.
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  <li>Form 1 students will move up to <b>Form 2</b></li>
                  <li>Form 2 students will move up to <b>Form 3</b></li>
                  <li>Form 3 students will move up to <b>Form 4</b></li>
                  <li>Form 4 students will <b>graduate</b> and be permanently archived in the Alumni record</li>
                  <li>Active Academic Year will be switched to <b>{effectiveToYear}</b></li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(false)}
                  className={btnGhost}
                  disabled={promoting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executePromotion}
                  disabled={promoting}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
                >
                  {promoting ? "Promoting..." : "✅ Yes, Run Promotion"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
