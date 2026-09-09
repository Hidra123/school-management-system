"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton, EmptyState, Loader, inputCls, useActionState } from "@/components/ui";
import { cls, putJSON, useFetch } from "@/lib/utils";
import ClassResultReport, { type ClassResultsData } from "./ClassResultReport";
import StudentReportCard, { type StudentReportData } from "./StudentReportCard";

type ClassRow = { id: number; name: string; section: string };
type ExamRow = { id: number; name: string; status: string };
type StudentLight = { id: number; name: string; admissionNo: string };
type Settings = { id: number; submissionOpensAt: string | null; submissionClosesAt: string | null };

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExamRoutineResultsTab() {
  const classesFetch = useFetch<ClassRow[]>("/api/classes");
  const examsFetch = useFetch<ExamRow[]>("/api/exams");
  const classList = classesFetch.data ?? [];
  const examList = examsFetch.data ?? [];

  // ---- Submission deadline settings ----
  const settingsFetch = useFetch<Settings>("/api/exams/settings");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [loadedSettings, setLoadedSettings] = useState(false);
  useEffect(() => {
    if (!settingsFetch.data || loadedSettings) return;
    setOpensAt(toLocalInputValue(settingsFetch.data.submissionOpensAt));
    setClosesAt(toLocalInputValue(settingsFetch.data.submissionClosesAt));
    setLoadedSettings(true);
  }, [settingsFetch.data, loadedSettings]);
  const { loading: savingDeadline, done: deadlineSaved, run: runDeadline } = useActionState();

  async function saveDeadline() {
    await runDeadline(async () => {
      await putJSON("/api/exams/settings", {
        submissionOpensAt: opensAt ? new Date(opensAt).toISOString() : null,
        submissionClosesAt: closesAt ? new Date(closesAt).toISOString() : null,
      });
      settingsFetch.refresh();
    });
  }

  const now = Date.now();
  const closesAtDate = settingsFetch.data?.submissionClosesAt ? new Date(settingsFetch.data.submissionClosesAt) : null;
  const opensAtDate = settingsFetch.data?.submissionOpensAt ? new Date(settingsFetch.data.submissionOpensAt) : null;
  const isClosed = closesAtDate ? now > closesAtDate.getTime() : false;
  const isNotOpenYet = opensAtDate ? now < opensAtDate.getTime() : false;

  // ---- Publish results ----
  const [resultsClassId, setResultsClassId] = useState("");
  const [resultsExamId, setResultsExamId] = useState("");
  const [resultsUrl, setResultsUrl] = useState<string | null>(null);
  const classResults = useFetch<ClassResultsData>(resultsUrl);

  function previewResults() {
    if (!resultsClassId || !resultsExamId) return;
    setResultsUrl(`/api/exams/results?classId=${resultsClassId}&examId=${resultsExamId}`);
  }

  // ---- Individual report cards ----
  const [reportClassId, setReportClassId] = useState("");
  const [reportExamId, setReportExamId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentReportUrl, setStudentReportUrl] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const studentsUrl = useMemo(() => (reportClassId ? `/api/students?classId=${reportClassId}` : null), [reportClassId]);
  const studentsFetch = useFetch<StudentLight[]>(studentsUrl);
  const studentList = useMemo(() => studentsFetch.data ?? [], [studentsFetch.data]);
  const matches = useMemo(
    () => (search.trim() ? studentList.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase())) : []),
    [studentList, search],
  );

  const studentReportFetch = useFetch<StudentReportData>(studentReportUrl);

  function generateSingle() {
    if (!selectedStudentId || !reportExamId) return;
    setShowAll(false);
    setStudentReportUrl(`/api/exams/results/student?studentId=${selectedStudentId}&examId=${reportExamId}`);
  }

  return (
    <div className="space-y-6">
      {/* Deadline settings */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">⏰ Score Submission Deadline Settings</p>
        </div>
        <div className="p-5">
          {isClosed && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-rose-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-rose-800">⏳ Submission is CLOSED</p>
                <p className="text-xs text-rose-600">Closed on {closesAtDate?.toLocaleString()}</p>
              </div>
              <span className="rounded-full bg-rose-200 px-3 py-1 text-xs font-bold text-rose-800">Closed</span>
            </div>
          )}
          {isNotOpenYet && !isClosed && (
            <div className="mb-4 rounded-xl bg-amber-100 px-4 py-3">
              <p className="text-sm font-bold text-amber-800">🔒 Submission has not opened yet</p>
              <p className="text-xs text-amber-600">Opens on {opensAtDate?.toLocaleString()}</p>
            </div>
          )}
          {!isClosed && !isNotOpenYet && (opensAtDate || closesAtDate) && (
            <div className="mb-4 rounded-xl bg-emerald-100 px-4 py-3">
              <p className="text-sm font-bold text-emerald-800">✅ Submission is OPEN</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Submission Opens (Start)</label>
              <input type="datetime-local" className={inputCls} value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Submission Closes (End)</label>
              <input type="datetime-local" className={inputCls} value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <ActionButton onClick={saveDeadline} loading={savingDeadline} done={deadlineSaved} doneText="Saved!">⏰ Save Deadline</ActionButton>
          </div>
        </div>
      </div>

      {/* Publish results */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">📊 Publish Exam Results</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Class</label>
            <select className={cls(inputCls, "sm:w-52")} value={resultsClassId} onChange={(e) => setResultsClassId(e.target.value)}>
              <option value="">-- Select Class --</option>
              {classList.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Exam</label>
            <select className={cls(inputCls, "sm:w-52")} value={resultsExamId} onChange={(e) => setResultsExamId(e.target.value)}>
              <option value="">-- Select Exam --</option>
              {examList.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <button onClick={previewResults} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">👁️ Preview Results</button>
          <button onClick={previewResults} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">🚩 Publish Results</button>
          {classResults.data && (
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">🖨️ Print Report</button>
          )}
        </div>
        {resultsUrl && (
          <div className="border-t border-slate-100 p-5">
            {classResults.loading ? (
              <Loader label="Generating report..." />
            ) : classResults.error ? (
              <EmptyState icon="⚠️" title="Could not generate report" message={classResults.error} />
            ) : classResults.data ? (
              <ClassResultReport data={classResults.data} />
            ) : null}
          </div>
        )}
      </div>

      {/* Individual Report Cards */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">🪪 Individual Student Report Cards</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-violet-700"><span className="grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-white">1</span> SELECT CLASS</p>
              <select className={inputCls} value={reportClassId} onChange={(e) => { setReportClassId(e.target.value); setSelectedStudentId(""); setStudentReportUrl(null); }}>
                <option value="">-- Select Class --</option>
                {classList.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ""}</option>)}
              </select>
            </div>
            <div className={cls("rounded-xl border p-3", reportClassId ? "border-violet-100 bg-violet-50/40" : "border-slate-100 bg-slate-50")}>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-violet-700"><span className="grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-white">2</span> SELECT EXAM</p>
              <select className={inputCls} value={reportExamId} onChange={(e) => setReportExamId(e.target.value)} disabled={!reportClassId}>
                <option value="">-- Select Class First --</option>
                {examList.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={() => { if (reportClassId && reportExamId) setShowAll(true); }}
            disabled={!reportClassId || !reportExamId}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            📚 Generate All Reports
          </button>

          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">🔍 Search &amp; Print Single Student</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className={cls(inputCls, "flex-1")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type student name to search..."
              />
              <select className={cls(inputCls, "sm:w-64")} value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                <option value="">-- Matches appear here --</option>
                {matches.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>)}
              </select>
              <button
                onClick={generateSingle}
                disabled={!selectedStudentId || !reportExamId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                🧾 Generate Report
              </button>
            </div>
          </div>

          {!showAll && studentReportUrl && (
            <div className="mt-5">
              {studentReportFetch.loading ? (
                <Loader label="Generating report card..." />
              ) : studentReportFetch.error ? (
                <EmptyState icon="⚠️" title="Could not generate report" message={studentReportFetch.error} />
              ) : studentReportFetch.data ? (
                <>
                  <div className="mb-2 flex justify-end print:hidden">
                    <button onClick={() => window.print()} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">🖨️ Print</button>
                  </div>
                  <StudentReportCard data={studentReportFetch.data} examId={Number(reportExamId)} />
                </>
              ) : null}
            </div>
          )}

          {showAll && reportClassId && reportExamId && (
            <AllReportsList classId={reportClassId} examId={reportExamId} students={studentList} />
          )}
        </div>
      </div>
    </div>
  );
}

function AllReportsList({ classId, examId, students }: { classId: string; examId: string; students: StudentLight[] }) {
  if (students.length === 0) {
    return <EmptyState icon="👨‍🎓" title="No students in this class" message="Add students to this class first." />;
  }
  return (
    <div className="mt-5 space-y-6">
      <div className="flex justify-end print:hidden">
        <button onClick={() => window.print()} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">🖨️ Print All Reports</button>
      </div>
      {students.map((s) => (
        <SingleAllReport key={s.id} studentId={s.id} examId={Number(examId)} />
      ))}
    </div>
  );
}

function SingleAllReport({ studentId, examId }: { studentId: number; examId: number }) {
  const { data, loading, error } = useFetch<StudentReportData>(`/api/exams/results/student?studentId=${studentId}&examId=${examId}`);
  if (loading) return <Loader label="Loading..." />;
  if (error || !data) return null;
  return (
    <div className="break-after-page">
      <StudentReportCard data={data} examId={examId} editable={false} />
    </div>
  );
}
