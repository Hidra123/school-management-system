"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { EmptyState, Loader, PageHeader, btnPrimary, inputCls } from "@/components/ui";
import { cls, postJSON, useFetch, todayStr } from "@/lib/utils";

// ---------- 10 duty-report sections (SELECTION fields) ----------
const SECTIONS: { key: string; label: string; options: string[] }[] = [
  { key: "1", label: "PUNCTUALITY", options: ["All students arrived on time", "Most students arrived on time", "Some students arrived late", "Many students arrived late", "Other (type below)"] },
  { key: "2", label: "CLEANLINESS", options: ["School compound and classrooms are clean", "Fairly clean", "Needs improvement", "Other (type below)"] },
  { key: "3", label: "ACADEMICS", options: ["All lessons conducted as per timetable", "Most lessons conducted as per timetable", "Some lessons were missed", "Lessons interrupted", "Other (type below)"] },
  { key: "4", label: "DISCIPLINE", options: ["Students were well disciplined throughout the day", "Generally disciplined with minor issues", "Several disciplinary cases reported", "Other (type below)"] },
  { key: "5", label: "BREAKFAST & MEAL", options: ["Breakfast and meals served on time, students satisfied", "Meals served on time", "Delayed meal service", "Complaints about meals", "Other (type below)"] },
  { key: "6", label: "HEALTH", options: ["No health issues reported", "A few students received first aid", "Students taken to clinic", "Serious health issue occurred", "Other (type below)"] },
  { key: "7", label: "VISITORS", options: ["No visitors today", "A few visitors received", "Parents visited", "Government officials visited", "Other (type below)"] },
  { key: "8", label: "SPECIAL EVENT(S)", options: ["None", "Examination in progress", "School event held", "Special assembly", "Other (type below)"] },
  { key: "9", label: "SECURITY", options: ["School security is good, no incidents", "Minor security concern", "Security incident occurred", "Other (type below)"] },
  { key: "10", label: "SPORT AND GAMES", options: ["No sports activities today", "Sports activities conducted", "Inter-class matches held", "Sports day preparations", "Other (type below)"] },
];

type AttRow = { classId: number; className: string; rb: number; rg: number; ab: number; ag: number; sb: number; sg: number; pb: number; pg: number };
type ReportRow = {
  id: number;
  date: string;
  teacherId: number | null;
  teacherName: string;
  answers: string;
  attendanceRows: string;
  attendanceRate?: number;
  todComment: string;
  headComment: string;
  headAcknowledged: boolean;
  headmasterName?: string;
};
type TodData = {
  roster: AttRow[];
  reports: ReportRow[];
  mine: ReportRow | null;
  myTeacher?: { id: number; name: string } | null;
  teacherName?: string;
  teacherId?: number | null;
  settings?: SettingsData;
};
type SettingsData = { schoolName: string; councilName: string; motto: string; headOfSchoolName: string; logoData: string };

/** Signature format: "Hidra Ramadhani Omari" -> "H.R. Omari". */
function signatureName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1).toLowerCase();
  const last = parts[parts.length - 1]!;
  const surname = last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
  return parts.slice(0, -1).map((w) => w[0]!.toUpperCase()).join(".") + ". " + surname;
}

/** T.O.D auto-comment â€” tuned to the attendance percentage of the day. */
export function autoTodComment(pct: number, absent: number): string {
  if (pct >= 100) return `Attendance was a perfect 100% â€” every single student was present. A truly exemplary day for the whole school; my sincere appreciation goes to the students and their class teachers.`;
  if (pct >= 90) return `Attendance stood high at ${pct}%. The day ran smoothly and learning progressed well. A big thank-you to the students â€” and I encourage the ${absent} absent to aim for full attendance tomorrow.`;
  if (pct >= 80) return `The school day was generally positive, with attendance at ${pct}%. We appreciate the effort of the students who attended, and we will keep encouraging the ${absent} who missed out to attend regularly. Together we will achieve even better results in the days ahead.`;
  if (pct >= 70) return `Today was a moderate day at ${pct}% attendance. There's clear room for improvement â€” I call upon class teachers to remind students of the importance of daily attendance, and I will follow-up with the ${absent} absent tomorrow.`;
  return `Attendance was concerningly low at ${pct}%. I have raised the alarm with class teachers; ${absent} students requires urgent follow-up with parents/guardians. We must act swiftly to restore full attendance.`;
}

/** Headmaster auto-comment â€” acknowledging on strong days, directing follow-up when low. */
export function autoHeadComment(pct: number, absent: number): string {
  if (pct >= 100) return `Outstanding â€” 100% attendance. My heartfelt congratulations to all students, teachers and the T.O.D. for an exceptional day. Keep this remarkable standard going.`;
  if (pct >= 90) return `Excellent attendance at ${pct}%. Well done to everyone involved; I acknowledge and appreciate the effort. Continue with the same commitment â€” I am proud of this progress.`;
  if (pct >= 80) return `Attendance is good at ${pct}%. I acknowledge this effort with gratitude; however, the ${absent} absent case(s) require follow-up before tomorrow. The T.O.D. report is acknowledged.`;
  if (pct >= 70) return `Noted â€” attendance at ${pct}% is reasonable but must improve. Class teachers are directed to contact the ${absent} students' homes and report back. The T.O.D. report is acknowledged.`;
  return `This is an urgent matter â€” ${pct}% attendance is unacceptable. Class teachers & discipline office must make immediate follow-up with the ${absent} absent and report within 24 hours. I expect full corrective action.`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function TodPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr());
  const dataFetch = useFetch<TodData>(`/api/tod?date=${date}`);
  const settingsFetch = useFetch<SettingsData>("/api/school-settings");
  const listFetch = useFetch<ReportRow[]>("/api/tod?mode=list");

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<AttRow[]>([]);
  const [todComment, setTodComment] = useState("");
  const [headDraft, setHeadDraft] = useState("");
  const [todAuto, setTodAuto] = useState(true);
  const [headAuto, setHeadAuto] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Load roster + prefill from existing saved report.
  useEffect(() => {
    const d = dataFetch.data;
    if (!d) return;
    const savedRows = d.mine
      ? (JSON.parse(d.mine.attendanceRows || "[]") as Array<AttRow & {
          regB?: number;
          regG?: number;
          absB?: number;
          absG?: number;
          sickB?: number;
          sickG?: number;
          permB?: number;
          permG?: number;
        }>).map((r) => ({
          ...r,
          rb: r.rb ?? r.regB ?? 0,
          rg: r.rg ?? r.regG ?? 0,
          ab: r.ab ?? r.absB ?? 0,
          ag: r.ag ?? r.absG ?? 0,
          sb: r.sb ?? r.sickB ?? 0,
          sg: r.sg ?? r.sickG ?? 0,
          pb: r.pb ?? r.permB ?? 0,
          pg: r.pg ?? r.permG ?? 0,
        }))
      : [];
    const byId = new Map(savedRows.map((r) => [r.classId, r]));
    setRows(d.roster.map((r) => ({ ...r, ...(byId.get(r.classId) ?? {}) })));
    try {
      setAnswers(d.mine ? (JSON.parse(d.mine.answers || "{}") as Record<string, string>) : {});
    } catch {
      setAnswers({});
    }
    setTodComment(d.mine?.todComment ?? "");
    setHeadDraft(d.mine?.headComment ?? "");
    setTodAuto(true);
    setHeadAuto(true);
  }, [dataFetch.data]);

  const totals = useMemo(() => {
    const t = { rb: 0, rg: 0, ab: 0, ag: 0, sb: 0, sg: 0, pb: 0, pg: 0, presentB: 0, presentG: 0, registered: 0, absent: 0 };
    for (const r of rows) {
      t.rb += r.rb; t.rg += r.rg; t.ab += r.ab; t.ag += r.ag; t.sb += r.sb; t.sg += r.sg; t.pb += r.pb; t.pg += r.pg;
    }
    t.registered = t.rb + t.rg;
    t.absent = t.ab + t.ag;
    t.presentB = t.rb - t.ab;
    t.presentG = t.rg - t.ag;
    return t;
  }, [rows]);

  const percentage = totals.registered > 0 ? Math.round((100 * (totals.presentB + totals.presentG) * 10) / totals.registered) / 10 : 0;

  // Auto-generate T.O.D / Headmaster comments from the live percentage.
  useEffect(() => {
    if (todAuto) setTodComment(autoTodComment(percentage, totals.absent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, totals.absent, todAuto]);
  useEffect(() => {
    if (headAuto) setHeadDraft(autoHeadComment(percentage, totals.absent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, totals.absent, headAuto]);

  function setCell(classId: number, field: keyof AttRow, val: string) {
    setRows((prev) => prev.map((r) => (r.classId === classId ? { ...r, [field]: Math.max(0, Math.min(999, Number(val) || 0)) } : r)));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const final: Record<string, string> = {};
      for (const s of SECTIONS) {
        const v = answers[s.key] ?? "";
        final[s.key] = v === "Other (type below)" ? (custom[s.key]?.trim() || "Other") : v;
      }
      const body = {
        date,
        teacherName: dataFetch.data?.myTeacher?.name ?? user?.name ?? "",
        teacherId: dataFetch.data?.myTeacher?.id ?? null,
        answers: JSON.stringify(final),
        attendanceRows: JSON.stringify(rows),
        attendanceRate: percentage,
        todComment: todAuto ? autoTodComment(percentage, totals.absent) : todComment,
        headComment: headAuto ? autoHeadComment(percentage, totals.absent) : headDraft,
      };

      const res = await postJSON<unknown>("/api/tod", body);
      // API returns { ok: true, report } â€” unwrap if present
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const asAny = res as any;
      const report = asAny?.report ?? asAny;

      setMsg("âœ… Duty report saved.");
      dataFetch.refresh();
      listFetch.refresh();
      return report as ReportRow;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  function openPrint(res?: ReportRow | null) {
    const mine = res ?? dataFetch.data?.mine ?? null;
    const s = settingsFetch.data ?? dataFetch.data?.settings;
    if (!mine || !s) return;
    let finalAns: Record<string, string> = {};
    let pr: AttRow[] = [];
    try {
      finalAns = JSON.parse(mine.answers || "{}") as Record<string, string>;
      pr = JSON.parse(mine.attendanceRows || "[]") as AttRow[];
    } catch {
      setMsg("Report data is invalid and cannot be printed.");
      return;
    }
    const tTot = { rb: 0, rg: 0, ab: 0, ag: 0, sb: 0, sg: 0, pb: 0, pg: 0 };
    for (const r of pr) {
      tTot.rb += r.rb; tTot.rg += r.rg; tTot.ab += r.ab; tTot.ag += r.ag; tTot.sb += r.sb; tTot.sg += r.sg; tTot.pb += r.pb; tTot.pg += r.pg;
    }
    const regTot = tTot.rb + tTot.rg;
    const presTot = regTot - (tTot.ab + tTot.ag);
    const pct = regTot > 0 ? Math.round((1000 * presTot) / regTot) / 10 : 0;
    const printedTodComment = autoTodComment(pct, tTot.ab + tTot.ag);
    const printedHeadComment = autoHeadComment(pct, tTot.ab + tTot.ag);

    const numCell = (v: number) => `<td style="border:1px solid #000;text-align:center;padding:3px 2px;font-weight:700;">${v}</td>`;
    const attRows = pr
      .map((r) => {
        const regB = r.rb, regG = r.rg, presB = regB - r.ab, presG = regG - r.ag;
        return `<tr><td style="border:1px solid #000;padding:4px 4px;font-weight:900;font-style:italic;">${esc(r.className)}</td>${numCell(regB)}${numCell(regG)}${numCell(regB + regG)}${numCell(presB)}${numCell(presG)}${numCell(presB + presG)}${numCell(r.ab)}${numCell(r.ag)}${numCell(r.ab + r.ag)}${numCell(r.sb)}${numCell(r.sg)}${numCell(r.sb + r.sg)}${numCell(r.pb)}${numCell(r.pg)}${numCell(r.pb + r.pg)}${numCell(regB + regG)}</tr>`;
      })
      .join("");
    const totRow = `<tr style="font-weight:900;"><td style="border:1px solid #000;padding:4px;">TOTAL</td>${numCell(tTot.rb)}${numCell(tTot.rg)}${numCell(tTot.rb + tTot.rg)}${numCell(tTot.rb - tTot.ab)}${numCell(tTot.rg - tTot.ag)}${numCell(presTot)}${numCell(tTot.ab)}${numCell(tTot.ag)}${numCell(tTot.ab + tTot.ag)}${numCell(tTot.sb)}${numCell(tTot.sg)}${numCell(tTot.sb + tTot.sg)}${numCell(tTot.pb)}${numCell(tTot.pg)}${numCell(tTot.pb + tTot.pg)}${numCell(regTot)}</tr>`;

    const sectionLines = SECTIONS.map(
      (sec) => `<p style="margin:7px 0;font-size:11.5px;"><span class="secnum">${sec.key}</span><b style="color:#1e1b4b;">${sec.label}</b><span style="float:right;">${esc(finalAns[sec.key] ?? "")}</span><br/><span style="display:block;border-bottom:1px dotted #000;height:8px;"></span></p>`,
    ).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Duty Report ${mine.date} - ${esc(mine.teacherName)}</title><style>
      @page { size: A4; margin: 10mm; }
      body { font-family: 'Times New Roman', Times, serif; color: #1e293b; margin: 0; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .sheet { border: 3px solid #312e81; border-radius: 6px; padding: 12mm 10mm; }
      .topline { height: 6px; background: linear-gradient(90deg,#4f46e5,#a21caf,#4f46e5); border-radius: 99px; margin-bottom: 10px; }
      .u { display:inline-block;border-bottom:1px dotted #312e81;min-width:120px;text-align:center;font-style:italic;padding:0 4px;color:#1e1b4b;}
      table.tt { border-collapse: collapse; width: 100%; font-size: 10px; }
      table.tt th, table.tt td { border:1px solid #4338ca; text-align:center; padding:3px 2px; }
      table.tt thead th { background:#312e81; color:#fff; border-color:#312e81; font-size:9px; }
      table.tt tbody tr:nth-child(even) td { background:#f5f7ff; }
      table.tt tbody tr td:nth-child(n+5):nth-child(-n+7) { background:#e9fbf0; color:#047857; }
      table.tt tbody tr td:nth-child(n+8):nth-child(-n+10) { background:#fdeaea; color:#be123c; }
      table.tt tbody tr:last-child td { background:#1e1b4b; color:#fff; }
      .toolbar{position:sticky;top:0;background:#fff;text-align:center;padding:8px;z-index:9;}
      .toolbar button{background:linear-gradient(90deg,#4f46e5 #7c3aed);background:#6d28d9;color:#fff;font-size:13px;font-weight:800;border:none;border-radius:10px;padding:8px 22px;cursor:pointer;}
      @media print{.toolbar{display:none;}}
      .sig { font-family: 'Brush Script MT','Edwardian Script ITC','Segoe Script',cursive; font-size: 21px; font-style: italic; color:#312e81; }
      .secnum { display:inline-block; background:#312e81; color:#fff; font-weight:900; font-size:9.5px; padding:1px 7px; border-radius:99px; margin-right:6px; }
      .commentbox { border:1.5px solid #c7d2fe; border-left:5px solid #059669; border-radius:8px; background:#f0fdf7; padding:8px 12px; font-size:11.5px; }
      .commentbox.hos { border-left-color:#4f46e5; background:#eef2ff; border-color:#c7d2fe; }
    </style></head><body>
      <div class="toolbar"><button onclick="window.print()">ðŸ–¨ï¸ Print / Save as PDF</button></div>
      <div class="sheet">
      <div class="topline"></div>
      <div style="text-align:center;margin-bottom:2px;">${s.logoData ? `<img src="${s.logoData}" style="height:60px;object-fit:contain;" alt="School logo"/>` : ""}</div>
      <div style="text-align:center;line-height:1.25;">
        <div style="font-size:11px;font-weight:900;letter-spacing:2px;color:#7c3aed;">${esc(s.councilName)}</div>
        <div style="font-size:19px;font-weight:900;letter-spacing:1px;color:#1e1b4b;margin-top:2px;">${esc(s.schoolName)}</div>
        <div style="display:inline-block;background:#4f46e5;color:#fff;font-size:11px;font-weight:900;letter-spacing:3px;padding:4px 22px;border-radius:99px;margin-top:6px;">TEACHER'S DUTY REPORT</div>
      </div>
      <div style="margin-top:8px;border-top:2px solid #312e81;border-bottom:2px solid #312e81;background:#eef2ff;padding:5px 6px;display:flex;justify-content:space-between;font-size:11.5px;border-radius:4px;">
        <span>TEACHER ON DUTY: <b class="u" style="min-width:180px;">${esc(mine.teacherName)}</b></span>
        <span>DATE: <b class="u" style="min-width:90px;">${mine.date}</b></span>
      </div>
      ${sectionLines}
      <p style="text-align:center;font-weight:900;font-size:11px;margin:8px 0 4px;">STUDENTS ATTENDANCE ON ${mine.date}</p>
      <table class="tt">
        <thead>
          <tr>
            <th rowspan="2">CLASS</th><th colspan="3">REGISTERED</th><th colspan="3">PRESENTS</th><th colspan="3">ABSENTS</th><th colspan="3">SICK</th><th colspan="3">PERMITTED</th><th rowspan="2" style="width:34px;">TOTAL</th>
          </tr>
          <tr><th>B</th><th>G</th><th>T</th><th>B</th><th>G</th><th>T</th><th>B</th><th>G</th><th>T</th><th>B</th><th>G</th><th>T</th><th>B</th><th>G</th><th>T</th></tr>
        </thead>
        <tbody>${attRows}${totRow}</tbody>
      </table>
      <p style="border:2px solid #4f46e5;background:#eef2ff;color:#312e81;font-weight:900;font-size:12.5px;padding:6px 10px;margin:10px 0;border-radius:6px;text-align:center;">PERCENTAGE OF ATTENDANCE: PRESENT / TOTAL Ã— 100 = <b style="color:#7c3aed;font-size:15px;">${pct}%</b></p>
      <div class="commentbox"><b style="color:#047857;">ðŸ“ T.O.D.'S COMMENT(S):</b><br/>${esc(printedTodComment)}</div>
      <p style="margin:14px 0 2px;display:flex;justify-content:space-between;"><span>NAME: <b class="u" style="min-width:170px;">${esc(mine.teacherName)}</b></span><span>SIGNATURE: <span class="sig" style="border:none;">${esc(signatureName(mine.teacherName))}</span> <b class="u" style="min-width:120px;"></b></span></p>
      <div style="border-top:2px solid #000;margin:10px 0;"></div>
      <div class="commentbox hos"><b style="color:#4338ca;">ðŸ›¡ï¸ HEADMASTER'S COMMENT(S):</b><br/>${esc(printedHeadComment)}<br/><b style="color:#047857;">âœ“ Acknowledged</b></div>
      <p style="margin:14px 0 2px;display:flex;justify-content:space-between;"><span>NAME: <b class="u" style="min-width:170px;">${esc(s.headOfSchoolName)}</b></span><span>SIGNATURE: <span class="sig">${esc(signatureName(s.headOfSchoolName))}</span> <b class="u" style="min-width:120px;"></b></span></p>
      <p style="text-align:center;font-style:italic;font-size:10.5px;margin-top:12px;">${esc(s.motto)}</p>
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print();},350);};</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
  }

  const mineRow = dataFetch.data?.mine ?? null;
  const classes_empty_suggestion = dataFetch.data && dataFetch.data.roster.length === 0;

  return (
    <AppShell permission="tod.view">
      <PageHeader icon="ðŸ”°" title="Teacher On Duty" subtitle="Daily duty report â€” selections, attendance auto-calc, and the official printable report">
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls(inputCls, "w-40")} />
          <button
            onClick={async () => {
              const saved = mineRow ?? (await save());
              openPrint(saved);
            }}
            disabled={!mineRow && !rows.length}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            ðŸ–¨ï¸ Print / Save PDF
          </button>
        </div>
      </PageHeader>

      {msg && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">{msg}</p>}

      {dataFetch.loading ? (
        <Loader label="Loading duty report..." />
      ) : dataFetch.error ? (
        <EmptyState icon="âš ï¸" title="Could not load" message={dataFetch.error} />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* LEFT â€” 10 selection sections */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">ðŸ“ Daily Sections 1-10 (Selections)</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {SECTIONS.map((sec) => {
                const v = answers[sec.key] ?? "";
                return (
                  <li key={sec.key} className="px-5 py-3">
                    <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-600">
                      {sec.key}. {sec.label}
                    </p>
                    <select
                      value={v || sec.options[0]}
                      onChange={(e) => setAnswers({ ...answers, [sec.key]: e.target.value })}
                      className={inputCls}
                    >
                      {sec.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    {v === "Other (type below)" && (
                      <input
                        value={custom[sec.key] ?? ""}
                        onChange={(e) => setCustom({ ...custom, [sec.key]: e.target.value })}
                        placeholder="Type your answerâ€¦"
                        className={cls(inputCls, "mt-2")}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-slate-100 p-5">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">T.O.D.'s Comment(s)</label>
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                âœ¨ {autoTodComment(percentage, totals.absent)}
              </p>
              <button onClick={save} disabled={saving} className={cls(btnPrimary, "mt-3 w-full")}>
                {saving ? "Saving..." : "ðŸ’¾ Save Duty Report"}
              </button>
            </div>
          </section>

          {/* RIGHT â€” Attendance + head comment + recent */}
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="bg-slate-900 px-5 py-3">
                <p className="text-sm font-bold text-white">ðŸ“Š Students Attendance on {date}</p>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[720px] border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="border border-slate-700 px-1.5 py-1.5 text-left" rowSpan={2}>CLASS</th>
                      <th className="border border-slate-700 px-1 py-1.5" colSpan={3}>REGISTERED (auto)</th>
                      <th className="border border-slate-700 bg-emerald-700 px-1 py-1.5" colSpan={3}>PRESENT (auto)</th>
                      <th className="border border-slate-700 px-1 py-1.5" colSpan={3}>ABSENTS (input)</th>
                      <th className="border border-slate-700 px-1 py-1.5" colSpan={2}>SICK</th>
                      <th className="border border-slate-700 px-1 py-1.5" colSpan={2}>PERMITTED</th>
                    </tr>
                    <tr className="bg-slate-800 text-white text-[9px]">
                      <th className="border border-slate-700 px-1 py-1">B</th><th className="border border-slate-700 px-1 py-1">G</th><th className="border border-slate-700 px-1 py-1">T</th>
                      <th className="border border-slate-700 bg-emerald-800 px-1 py-1">B</th><th className="border border-slate-700 bg-emerald-800 px-1 py-1">G</th><th className="border border-slate-700 bg-emerald-800 px-1 py-1">T</th>
                      <th className="border border-slate-700 px-1 py-1">B</th><th className="border border-slate-700 px-1 py-1">G</th><th className="border border-slate-700 px-1 py-1">T</th>
                      <th className="border border-slate-700 px-1 py-1">B</th><th className="border border-slate-700 px-1 py-1">G</th>
                      <th className="border border-slate-700 px-1 py-1">B</th><th className="border border-slate-700 px-1 py-1">G</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const regT = r.rb + r.rg;
                      const presB = Math.max(0, r.rb - r.ab);
                      const presG = Math.max(0, r.rg - r.ag);
                      return (
                        <tr key={r.classId} className="odd:bg-white even:bg-slate-50/60 text-center">
                          <td className="border border-slate-200 px-1.5 py-1 text-left font-bold italic">{r.className}</td>
                          <td className="border border-slate-200 font-bold text-slate-500">{r.rb}</td>
                          <td className="border border-slate-200 font-bold text-slate-500">{r.rg}</td>
                          <td className="border border-slate-200 font-black">{regT}</td>
                          <td className="border border-slate-200 bg-emerald-50 font-black text-emerald-700">{presB}</td>
                          <td className="border border-slate-200 bg-emerald-50 font-black text-emerald-700">{presG}</td>
                          <td className="border border-slate-200 bg-emerald-50 font-black text-emerald-700">{presB + presG}</td>
                          <td className="border border-slate-200 bg-rose-50/60 p-0.5"><input type="number" min={0} value={r.ab} onChange={(e) => setCell(r.classId, "ab", e.target.value)} className="w-11 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[11px] font-bold" /></td>
                          <td className="border border-slate-200 bg-rose-50/60 p-0.5"><input type="number" min={0} value={r.ag} onChange={(e) => setCell(r.classId, "ag", e.target.value)} className="w-11 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[11px] font-bold" /></td>
                          <td className="border border-slate-200 font-black text-rose-600">{r.ab + r.ag}</td>
                          <td className="border border-slate-200 p-0.5"><input type="number" min={0} value={r.sb} onChange={(e) => setCell(r.classId, "sb", e.target.value)} className="w-10 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[11px] font-bold" /></td>
                          <td className="border border-slate-200 p-0.5"><input type="number" min={0} value={r.sg} onChange={(e) => setCell(r.classId, "sg", e.target.value)} className="w-10 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[11px] font-bold" /></td>
                          <td className="border border-slate-200 p-0.5"><input type="number" min={0} value={r.pb} onChange={(e) => setCell(r.classId, "pb", e.target.value)} className="w-10 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[11px] font-bold" /></td>
                          <td className="border border-slate-200 p-0.5"><input type="number" min={0} value={r.pg} onChange={(e) => setCell(r.classId, "pg", e.target.value)} className="w-10 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[11px] font-bold" /></td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-900 text-center font-black text-white">
                      <td className="border border-slate-700 px-1.5 py-1.5 text-left">TOTAL</td>
                      <td className="border border-slate-700">{totals.rb}</td>
                      <td className="border border-slate-700">{totals.rg}</td>
                      <td className="border border-slate-700">{totals.registered}</td>
                      <td className="border border-slate-700 bg-emerald-600">{totals.presentB}</td>
                      <td className="border border-slate-700 bg-emerald-600">{totals.presentG}</td>
                      <td className="border border-slate-700 bg-emerald-600">{totals.presentB + totals.presentG}</td>
                      <td className="border border-slate-700 text-rose-300">{totals.ab}</td>
                      <td className="border border-slate-700 text-rose-300">{totals.ag}</td>
                      <td className="border border-slate-700 text-rose-300">{totals.absent}</td>
                      <td className="border border-slate-700">{totals.sb}</td>
                      <td className="border border-slate-700">{totals.sg}</td>
                      <td className="border border-slate-700">{totals.pb}</td>
                      <td className="border border-slate-700">{totals.pg}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-3 rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-2.5 text-center text-sm font-black text-slate-900">
                  PERCENTAGE OF ATTENDANCE: PRESENT / TOTAL Ã— 100 = {percentage}%
                </p>
              </div>
            </section>

            {/* Head comment */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="bg-slate-900 px-5 py-3">
                <p className="text-sm font-bold text-white">ðŸ›¡ï¸ Headmaster's Comment(s) â€” âœ“ Acknowledged</p>
              </div>
              <div className="p-5">
                <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
                  âœ¨ {autoHeadComment(percentage, totals.absent)}
                </p>
              </div>
            </section>

            {/* Recent reports */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="bg-slate-900 px-5 py-3">
                <p className="text-sm font-bold text-white">ðŸ—‚ï¸ Recent Duty Reports</p>
              </div>
              {(listFetch.data ?? []).length === 0 ? (
                <p className="px-5 py-6 text-center text-xs italic text-slate-400">No reports filed yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(listFetch.data ?? []).slice(0, 8).map((r) => (
                    <li key={r.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <span>
                        <b className="text-slate-900">{r.date}</b>
                        <span className="ml-2 text-xs text-slate-500">{r.teacherName}</span>
                        {r.headAcknowledged && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">âœ“ acknowledged</span>}
                      </span>
                      <button onClick={() => openPrint(r)} className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-bold text-white hover:bg-sky-700">ðŸ–¨ï¸</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
