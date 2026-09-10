"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { EXAM_TYPES, examTypeShort, examTypeTone } from "@/lib/examTypes";
import { cls, putJSON, shortDate, useFetch } from "@/lib/utils";

type StudentAdmission = {
  id: number;
  name: string;
  admissionNo: string;
  gender: "male" | "female";
  classId: number | null;
  className: string | null;
  classSection: string | null;
  guardianName: string;
  guardianPhone: string;
  guardianAddress: string;
  enrollmentDate: string | null;
  admissionStatus: string;
  createdAt: string;
};

type ExamApproval = {
  id: number;
  name: string;
  examType: string;
  academicYear: string;
  startDate: string | null;
  endDate: string | null;
  remarks: string;
  status: "active" | "inactive";
  classNames: string[];
  appliesToAllClasses: boolean;
  scoresCount: number;
};

type RemarkApproval = {
  id: number;
  studentId: number;
  studentName: string;
  studentAdmissionNo: string;
  studentGender: "male" | "female";
  classId: number | null;
  className: string | null;
  classSection: string | null;
  examId: number;
  examName: string;
  examType: string;
  academicYear: string;
  behaviorRatings: string;
  academicComment: string;
  principalComment: string;
  academicMasterName: string;
  headmasterName: string;
  isApproved: boolean;
  hasScores: boolean;
  scoresCount: number;
  updatedAt: string;
};

type ApprovalsResponse = {
  students: StudentAdmission[];
  exams: ExamApproval[];
  remarks: RemarkApproval[];
  classes: { id: number; name: string; section: string }[];
  summary: {
    admissions: { total: number; pending: number; approved: number; rejected: number };
    exams: { total: number; active: number; inactive: number };
    remarks: { total: number; approved: number; pending: number };
  };
};

const DEFAULT_BEHAVIOR_CRITERIA = [
  "Communication Skills",
  "Team Work & Collaboration",
  "Discipline & Respect",
  "Leadership & Responsibility",
  "Punctuality & Attendance",
  "Sports & Extracurricular Participation",
] as const;

export default function ApproveAdmissionsPage() {
  const [activeTab, setActiveTab] = useState<"admissions" | "exams" | "remarks" | "timetable">("admissions");

  // Filters
  const [admissionFilter, setAdmissionFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("");
  const [searchStudent, setSearchStudent] = useState<string>("");

  const [examSearch, setExamSearch] = useState<string>("");

  const [remarksClassFilter, setRemarksClassFilter] = useState<string>("");
  const [remarksApprovalFilter, setRemarksApprovalFilter] = useState<string>("all");

  // Review & Edit Remarks Modal
  const [inspectRemark, setInspectRemark] = useState<RemarkApproval | null>(null);
  const [savingRemark, setSavingRemark] = useState(false);
  const [inspectRatings, setInspectRatings] = useState<Record<string, string>>({});
  const [inspectAcademicComment, setInspectAcademicComment] = useState("");
  const [inspectPrincipalComment, setInspectPrincipalComment] = useState("");
  const [inspectHeadmasterName, setInspectHeadmasterName] = useState("");

  const approvalsFetch = useFetch<ApprovalsResponse>("/api/admin/admissions");
  const data = approvalsFetch.data;
  const summary = data?.summary;

  // Filtered Students
  const filteredStudents = useMemo(() => {
    let list = data?.students ?? [];
    if (admissionFilter !== "all") {
      list = list.filter((s) => s.admissionStatus === admissionFilter);
    }
    if (classFilter) {
      list = list.filter((s) => String(s.classId) === classFilter);
    }
    if (searchStudent.trim()) {
      const q = searchStudent.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q) ||
          s.guardianName.toLowerCase().includes(q) ||
          s.guardianPhone.includes(q),
      );
    }
    return list;
  }, [data?.students, admissionFilter, classFilter, searchStudent]);

  // Filtered Exams
  const filteredExams = useMemo(() => {
    let list = data?.exams ?? [];
    if (examSearch.trim()) {
      const q = examSearch.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q) || e.academicYear.includes(q));
    }
    return list;
  }, [data?.exams, examSearch]);

  // Filtered Remarks
  const filteredRemarks = useMemo(() => {
    let list = data?.remarks ?? [];
    if (remarksClassFilter) {
      list = list.filter((r) => String(r.classId) === remarksClassFilter);
    }
    if (remarksApprovalFilter === "approved") {
      list = list.filter((r) => r.isApproved);
    } else if (remarksApprovalFilter === "pending") {
      list = list.filter((r) => !r.isApproved);
    }
    return list;
  }, [data?.remarks, remarksClassFilter, remarksApprovalFilter]);

  // ---------------- ACTIONS ----------------
  async function handleApproveStudent(studentId: number) {
    try {
      await putJSON("/api/admin/admissions", { action: "approve_student", studentId });
      approvalsFetch.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve student.");
    }
  }

  async function handleRejectStudent(studentId: number) {
    if (!window.confirm("Reject this student admission?")) return;
    try {
      await putJSON("/api/admin/admissions", { action: "reject_student", studentId });
      approvalsFetch.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reject student.");
    }
  }

  async function handleBulkApproveStudents() {
    if (!window.confirm("Approve all pending student admissions?")) return;
    try {
      await putJSON("/api/admin/admissions", { action: "bulk_approve_students" });
      approvalsFetch.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to bulk approve students.");
    }
  }

  async function handleToggleExamStatus(examId: number, currentStatus: "active" | "inactive") {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await putJSON("/api/admin/admissions", { action: "toggle_exam_status", examId, status: newStatus });
      approvalsFetch.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update exam status.");
    }
  }

  async function handleApproveRemark(remarkId: number) {
    try {
      await putJSON("/api/admin/admissions", { action: "approve_remark", remarkId });
      approvalsFetch.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve remark.");
    }
  }

  async function handleUnapproveRemark(remarkId: number) {
    try {
      await putJSON("/api/admin/admissions", { action: "unapprove_remark", remarkId });
      approvalsFetch.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to unapprove remark.");
    }
  }

  async function handleBulkApproveRemarks() {
    if (!window.confirm("Approve all pending behavioural remarks for student report cards?")) return;
    try {
      await putJSON("/api/admin/admissions", { action: "bulk_approve_remarks" });
      approvalsFetch.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to bulk approve remarks.");
    }
  }

  function openInspectRemarkModal(r: RemarkApproval) {
    setInspectRemark(r);
    try {
      setInspectRatings(JSON.parse(r.behaviorRatings || "{}"));
    } catch {
      setInspectRatings({});
    }
    setInspectAcademicComment(r.academicComment || "");
    setInspectPrincipalComment(r.principalComment || "");
    setInspectHeadmasterName(r.headmasterName || "Head of School");
  }

  async function handleSaveAndApproveRemark(e: React.FormEvent) {
    e.preventDefault();
    if (!inspectRemark) return;
    setSavingRemark(true);
    try {
      await putJSON("/api/admin/admissions", {
        action: "save_and_approve_remark",
        studentId: inspectRemark.studentId,
        examId: inspectRemark.examId,
        behaviorRatings: JSON.stringify(inspectRatings),
        academicComment: inspectAcademicComment,
        principalComment: inspectPrincipalComment,
        academicMasterName: inspectRemark.academicMasterName,
        headmasterName: inspectHeadmasterName,
      });
      setInspectRemark(null);
      approvalsFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save and approve remarks.");
    } finally {
      setSavingRemark(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          icon="✅"
          title="Approve Admissions & Academic Work"
          subtitle="Review and approve submissions from Academic Master and Class Teachers before report publication"
        />

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon="👨‍🎓"
            label="Total Admissions"
            value={summary?.admissions.total ?? 0}
            tone="indigo"
            sub={`${summary?.admissions.pending ?? 0} pending review`}
          />
          <StatCard
            icon="⏳"
            label="Pending Admissions"
            value={summary?.admissions.pending ?? 0}
            tone={summary?.admissions.pending ? "amber" : "emerald"}
            sub={summary?.admissions.pending ? "Requires approval" : "All approved"}
          />
          <StatCard
            icon="📋"
            label="Examinations"
            value={summary?.exams.total ?? 0}
            tone="blue"
            sub={`${summary?.exams.active ?? 0} active / ${summary?.exams.inactive ?? 0} inactive`}
          />
          <StatCard
            icon="🌟"
            label="Behaviour Remarks"
            value={summary?.remarks.total ?? 0}
            tone={summary?.remarks.pending ? "amber" : "emerald"}
            sub={`${summary?.remarks.approved ?? 0} approved for reports`}
          />
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("admissions")}
              className={cls(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                activeTab === "admissions"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              👨‍🎓 Student Admissions
              {summary && summary.admissions.pending > 0 && (
                <span className="rounded-full bg-amber-400 text-slate-900 px-2 py-0.5 text-xs font-black">
                  {summary.admissions.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("exams")}
              className={cls(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                activeTab === "exams"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              📋 Manage Examinations ({summary?.exams.total ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("remarks")}
              className={cls(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                activeTab === "remarks"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              🌟 Behavioural Assessments ({summary?.remarks.total ?? 0})
              {summary && summary.remarks.pending > 0 && (
                <span className="rounded-full bg-amber-400 text-slate-900 px-2 py-0.5 text-xs font-black">
                  {summary.remarks.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("timetable")}
              className={cls(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                activeTab === "timetable"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              📅 Timetable Approvals
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {approvalsFetch.loading && !data ? (
          <Loader label="Loading approvals data..." />
        ) : approvalsFetch.error ? (
          <EmptyState icon="⚠️" title="Could not load approvals data" message={approvalsFetch.error} />
        ) : !data ? null : (
          <>
            {/* ========================================================= */}
            {/* TAB 1: STUDENT ADMISSIONS                                  */}
            {/* ========================================================= */}
            {activeTab === "admissions" && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      placeholder="🔍 Search student, admission no, or guardian..."
                      className={cls(inputCls, "w-64 text-xs")}
                    />
                    <select
                      value={admissionFilter}
                      onChange={(e) => setAdmissionFilter(e.target.value)}
                      className={cls(inputCls, "w-44 text-xs font-bold")}
                    >
                      <option value="all">All Statuses ({data.students.length})</option>
                      <option value="pending">Pending Approval ({summary?.admissions.pending ?? 0})</option>
                      <option value="approved">Approved ({summary?.admissions.approved ?? 0})</option>
                      <option value="rejected">Rejected ({summary?.admissions.rejected ?? 0})</option>
                    </select>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className={cls(inputCls, "w-40 text-xs font-bold")}
                    >
                      <option value="">All Classes</option>
                      {data.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {summary && summary.admissions.pending > 0 && (
                    <button
                      onClick={handleBulkApproveStudents}
                      className={cls(btnPrimary, "text-xs font-bold")}
                    >
                      ✅ Approve All Pending ({summary.admissions.pending})
                    </button>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">#</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Adm No</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Student Name</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Class</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Gender</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Guardian / Contact</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Date Admitted</th>
                          <th className="px-3 py-2.5 text-center font-extrabold uppercase">Status</th>
                          <th className="px-3 py-2.5 text-right font-extrabold uppercase">Admin Decision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                              No student admissions match your selected filter.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((s, idx) => (
                            <tr key={s.id} className={idx % 2 ? "bg-slate-50/50 hover:bg-slate-50" : "bg-white hover:bg-slate-50"}>
                              <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">{s.admissionNo}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">{s.name}</td>
                              <td className="px-3 py-2 font-semibold text-slate-700">
                                {s.className || "Unassigned"} {s.classSection ? `(${s.classSection})` : ""}
                              </td>
                              <td className="px-3 py-2 capitalize text-slate-600">{s.gender}</td>
                              <td className="px-3 py-2 text-slate-600">
                                {s.guardianName ? (
                                  <div>
                                    <span className="font-semibold text-slate-800">{s.guardianName}</span>
                                    {s.guardianPhone && <span className="block text-[10px] text-slate-400">{s.guardianPhone}</span>}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-500">{shortDate(s.enrollmentDate || s.createdAt)}</td>
                              <td className="px-3 py-2 text-center">
                                {s.admissionStatus === "approved" ? (
                                  <Badge tone="emerald">Approved</Badge>
                                ) : s.admissionStatus === "rejected" ? (
                                  <Badge tone="rose">Rejected</Badge>
                                ) : (
                                  <Badge tone="amber">Pending Approval</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-1.5">
                                  {s.admissionStatus !== "approved" && (
                                    <button
                                      onClick={() => handleApproveStudent(s.id)}
                                      className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-xs font-bold"
                                    >
                                      ✅ Approve
                                    </button>
                                  )}
                                  {s.admissionStatus !== "rejected" && (
                                    <button
                                      onClick={() => handleRejectStudent(s.id)}
                                      className="rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 text-xs font-bold"
                                    >
                                      ❌ Reject
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: MANAGE EXAMINATIONS (Academic Master Work)          */}
            {/* ========================================================= */}
            {activeTab === "exams" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={examSearch}
                      onChange={(e) => setExamSearch(e.target.value)}
                      placeholder="🔍 Search exam name or year..."
                      className={cls(inputCls, "w-64 text-xs")}
                    />
                    <span className="text-xs text-slate-500 font-semibold">
                      {filteredExams.length} examination(s) created by Academic Master
                    </span>
                  </div>
                  <Link
                    href="/exams"
                    className={cls(btnGhost, "text-xs font-bold text-indigo-700 border-indigo-200")}
                  >
                    Open Examinations Panel ↗
                  </Link>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">#</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Exam Name</th>
                          <th className="px-3 py-2.5 text-center font-extrabold uppercase">Type</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Academic Year</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Dates</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Classes Applied</th>
                          <th className="px-3 py-2.5 text-right font-extrabold uppercase">Scores Captured</th>
                          <th className="px-3 py-2.5 text-center font-extrabold uppercase">Status</th>
                          <th className="px-3 py-2.5 text-right font-extrabold uppercase">Admin Approval</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExams.map((e, idx) => (
                          <tr key={e.id} className={idx % 2 ? "bg-slate-50/50 hover:bg-slate-50" : "bg-white hover:bg-slate-50"}>
                            <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{e.name}</td>
                            <td className="px-3 py-2 text-center">
                              <Badge tone={examTypeTone(e.examType)}>{examTypeShort(e.examType)}</Badge>
                            </td>
                            <td className="px-3 py-2 text-slate-700">{e.academicYear || "—"}</td>
                            <td className="px-3 py-2 text-slate-500">
                              {e.startDate ? `${shortDate(e.startDate)} – ${shortDate(e.endDate)}` : "Not scheduled"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {e.appliesToAllClasses ? "All classes" : e.classNames.join(", ")}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-slate-800">
                              {e.scoresCount} scores
                            </td>
                            <td className="px-3 py-2 text-center">
                              {e.status === "active" ? (
                                <Badge tone="emerald">🟢 Active (Approved)</Badge>
                              ) : (
                                <Badge tone="rose">⏸️ Inactive (Locked)</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleToggleExamStatus(e.id, e.status)}
                                className={cls(
                                  "rounded-lg px-2.5 py-1 text-xs font-bold border",
                                  e.status === "active"
                                    ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
                                )}
                              >
                                {e.status === "active" ? "⏸️ Lock Exam" : "✅ Approve & Activate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: BEHAVIOURAL ASSESSMENTS (Class Teacher Approval)    */}
            {/* ========================================================= */}
            {activeTab === "remarks" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3.5 text-xs text-violet-950 leading-relaxed">
                  <p className="font-extrabold text-[12.5px] text-violet-900 mb-1">
                    🌟 Students Behavioural & Character Assessment Approval
                  </p>
                  <p>
                    Walimu wa madarasa (Class Teachers) wanapojaza tathmini ya tabia na mwenendo wa wanafunzi (Communication, Teamwork, Discipline, n.k.),
                    Admin hapa anapitia na <b>kuziidhinisha</b> ili ziweze kuwekwa rasmi kwenye <b>Student Report Card</b> matokeo yakiwa yamewasilishwa!
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={remarksApprovalFilter}
                      onChange={(e) => setRemarksApprovalFilter(e.target.value)}
                      className={cls(inputCls, "w-44 text-xs font-bold")}
                    >
                      <option value="all">All Assessments ({data.remarks.length})</option>
                      <option value="pending">Pending Approval ({summary?.remarks.pending ?? 0})</option>
                      <option value="approved">Approved ({summary?.remarks.approved ?? 0})</option>
                    </select>
                    <select
                      value={remarksClassFilter}
                      onChange={(e) => setRemarksClassFilter(e.target.value)}
                      className={cls(inputCls, "w-40 text-xs font-bold")}
                    >
                      <option value="">All Classes</option>
                      {data.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {summary && summary.remarks.pending > 0 && (
                    <button
                      onClick={handleBulkApproveRemarks}
                      className={cls(btnPrimary, "text-xs font-bold")}
                    >
                      ✅ Approve All Pending Remarks ({summary.remarks.pending})
                    </button>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">#</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Student</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Class</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Exam</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Scores Status</th>
                          <th className="px-3 py-2.5 text-left font-extrabold uppercase">Comments &amp; Ratings</th>
                          <th className="px-3 py-2.5 text-center font-extrabold uppercase">Report Status</th>
                          <th className="px-3 py-2.5 text-right font-extrabold uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRemarks.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                              No behavioural assessments found. Class Teachers submit these from the Student Report Card section.
                            </td>
                          </tr>
                        ) : (
                          filteredRemarks.map((r, idx) => (
                            <tr key={r.id} className={idx % 2 ? "bg-slate-50/50 hover:bg-slate-50" : "bg-white hover:bg-slate-50"}>
                              <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">
                                {r.studentName}
                                <span className="block font-mono text-[10px] text-slate-400">{r.studentAdmissionNo}</span>
                              </td>
                              <td className="px-3 py-2 font-semibold text-slate-700">{r.className}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {r.examName} <Badge tone="indigo">{r.examType}</Badge>
                              </td>
                              <td className="px-3 py-2">
                                {r.hasScores ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    ✅ Scores Submitted ({r.scoresCount})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    ⏳ Scores Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 max-w-xs truncate text-slate-600">
                                {r.academicComment || r.principalComment ? (
                                  <span>{r.academicComment || r.principalComment}</span>
                                ) : (
                                  <span className="italic text-slate-400">Ratings entered</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {r.isApproved ? (
                                  <Badge tone="emerald">✅ Approved</Badge>
                                ) : (
                                  <Badge tone="amber">Pending Approval</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => openInspectRemarkModal(r)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                  >
                                    👁️ Review
                                  </button>
                                  {r.isApproved ? (
                                    <button
                                      onClick={() => handleUnapproveRemark(r.id)}
                                      className="rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 text-xs font-bold"
                                    >
                                      Revoke
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleApproveRemark(r.id)}
                                      className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-2 py-1 text-xs font-bold"
                                    >
                                      Approve
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: TIMETABLE REVIEW & APPROVAL                        */}
            {/* ========================================================= */}
            {activeTab === "timetable" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">📅 General Teaching Timetable Approval</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Verify the school master schedule prepared by the Academic Master before issuing prints to staff and noticeboards.
                      </p>
                    </div>
                    <Link
                      href="/timetable"
                      className={cls(btnPrimary, "text-xs font-bold")}
                    >
                      Open Master Timetable ↗
                    </Link>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-bold uppercase text-slate-400">Total Classes</p>
                      <p className="mt-1 text-xl font-black text-slate-800">{data.classes.length}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-bold uppercase text-slate-400">Days / Periods</p>
                      <p className="mt-1 text-xl font-black text-slate-800">5 Days × 9 Periods</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-bold uppercase text-slate-400">Status</p>
                      <p className="mt-1 text-sm font-black text-emerald-600 flex items-center gap-1">
                        <span>●</span> Active on Master View
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-bold uppercase text-slate-400">Print Ready</p>
                      <p className="mt-1 text-sm font-black text-indigo-700">A3 Poster / A4 Clean</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* MODAL: INSPECT / EDIT BEHAVIOURAL REMARKS                 */}
        {/* ========================================================= */}
        {inspectRemark && (
          <Modal
            open={!!inspectRemark}
            onClose={() => setInspectRemark(null)}
            title={`Review & Approve Behavioural Assessment: ${inspectRemark.studentName}`}
            wide
          >
            <form onSubmit={handleSaveAndApproveRemark} className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex justify-between font-semibold text-slate-700">
                <span>Class: <b>{inspectRemark.className}</b></span>
                <span>Exam: <b>{inspectRemark.examName} ({inspectRemark.examType})</b></span>
                <span>Scores: <b>{inspectRemark.hasScores ? `${inspectRemark.scoresCount} scores submitted` : "Pending"}</b></span>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                  Behaviour &amp; Character Criteria Ratings (A to F)
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DEFAULT_BEHAVIOR_CRITERIA.map((crit) => (
                    <div key={crit} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-white">
                      <span className="text-xs font-medium text-slate-800">{crit}</span>
                      <select
                        value={inspectRatings[crit] ?? ""}
                        onChange={(e) => setInspectRatings({ ...inspectRatings, [crit]: e.target.value })}
                        className={cls(inputCls, "w-24 text-xs font-bold")}
                      >
                        <option value="">—</option>
                        {["A", "B", "C", "D", "F"].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <Field label="Academic Comment">
                <textarea
                  rows={2}
                  value={inspectAcademicComment}
                  onChange={(e) => setInspectAcademicComment(e.target.value)}
                  className={inputCls}
                  placeholder="Academic performance evaluation comment..."
                />
              </Field>

              <Field label="Head of School / Administration Remark">
                <textarea
                  rows={2}
                  value={inspectPrincipalComment}
                  onChange={(e) => setInspectPrincipalComment(e.target.value)}
                  className={inputCls}
                  placeholder="Head of school official sign-off remark..."
                />
              </Field>

              <Field label="Head of School Name">
                <input
                  type="text"
                  value={inspectHeadmasterName}
                  onChange={(e) => setInspectHeadmasterName(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInspectRemark(null)}
                  className={btnGhost}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRemark}
                  className={btnPrimary}
                >
                  {savingRemark ? "Saving..." : "✅ Save & Approve for Report Card"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
