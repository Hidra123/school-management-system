"use client";

import { Fragment, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { EmptyState, Field, Loader, PageHeader, btnPrimary, inputCls } from "@/components/ui";
import { DAYS, EXTRA_ACTIVITIES, LESSON_PERIODS, SLOTS, periodTime, subjectCodeOf } from "@/lib/timetableConfig";
import { cls, postJSON, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type SubjectRow = { id: number; name: string; code: string; teacherId: number | null; teacherName: string | null };
type EntryRow = {
  id: number;
  classId: number;
  className: string;
  section: string;
  dayOfWeek: number;
  period: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  teacherId: number | null;
  teacherName: string | null;
};

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function delWithBody(url: string, body: unknown): Promise<void> {
  const r = await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) {
    const d = (await r.json().catch(() => null)) as { error?: string } | null;
    throw new Error(d?.error ?? "Request failed.");
  }
}

function groupKey(day: number, period: number): string {
  return `${day}|${period}`;
}

/** Unique subject-code → subject-name legend from a set of entries. */
function legendOf(entries: EntryRow[]): string {
  const map = new Map<string, string>();
  for (const e of entries) map.set(subjectCodeOf(e.subjectName, e.subjectCode), e.subjectName);
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, name]) => `${code} – ${name}`)
    .join("; ");
}

function printShell(title: string, subtitle: string, filters: string, tableHtml: string, legend: string) {
  const today = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${esc(title)}</title><style>
    @page { size: A4 landscape; margin: 9mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; }
    .hd { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #1e1b4b; padding-bottom: 10px; }
    .logo { width: 46px; height: 46px; border-radius: 10px; background: #6d28d9; color: #fff; font-size: 26px; display: inline-flex; align-items: center; justify-content: center; }
    .hd h1 { font-size: 20px; margin: 0; letter-spacing: 0.5px; }
    .hd .sub { font-size: 10px; letter-spacing: 2px; color: #444; margin-top: 2px; }
    .meta { margin-left: auto; text-align: right; font-size: 9px; color: #333; }
    .meta b { display: block; font-size: 9.5px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.5px; margin-top: 8px; }
    th, td { border: 1px solid #333; padding: 2px 2px; text-align: center; overflow: hidden; }
    th { background: #1e1b4b; color: #fff; font-size: 7.5px; }
    th .t { display: block; font-size: 6px; font-weight: normal; color: #c7d2fe; }
    td.day { background: #1e1b4b; color: #fff; font-weight: bold; font-size: 8px; writing-mode: vertical-rl; letter-spacing: 1px; }
    td.cls { font-weight: bold; background: #eef2ff; width: 12mm; }
    td.band { background: #e2e8f0; font-size: 6px; letter-spacing: 1px; color: #475569; }
    td.cell b { font-size: 8px; }
    td.cell .tn { display: block; font-size: 6px; color: #555; white-space: nowrap; }
    td.extra { background: #fef9c3; font-size: 7px; font-weight: bold; }
    .legend { margin-top: 8px; font-size: 7.5px; color: #222; }
    .footer { margin-top: 14px; display: flex; justify-content: space-between; font-size: 8.5px; }
    .footer div { border-top: 1px solid #000; width: 30%; text-align: center; padding-top: 3px; }
    .toolbar { text-align: center; margin: 10px 0; }
    .toolbar button { font-size: 13px; padding: 7px 20px; cursor: pointer; }
    @media print { .toolbar { display: none; } }
  </style></head><body>
    <div class="toolbar"><button onclick="window.print()">🖨️ Print / Save as PDF</button></div>
    <div class="hd"><span class="logo">🎓</span><div><h1>SHULEHUB SCHOOL</h1><div class="sub">${esc(subtitle)}</div></div>
      <div class="meta"><b>GENERATED: ${esc(today.toUpperCase())}</b>${esc(filters)}<br/>${esc(title)}</div></div>
    ${tableHtml}
    ${legend ? `<div class="legend"><b>Note:</b> ${esc(legend)}.</div>` : ""}
    <div class="footer"><div>Class Teacher</div><div>Academic Master</div><div>Head of School</div></div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };</script>
  </body></html>`;
  const w = window.open("", "_blank", "width=1250,height=850");
  if (!w) {
    window.print();
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
}

/** GENERAL school timetable — days as row bands, all classes in each day. */
function generalTableHtml(classes: ClassRow[], entries: EntryRow[]): string {
  const byKey = new Map<string, EntryRow>();
  for (const e of entries) byKey.set(`${e.classId}|${e.dayOfWeek}|${e.period}`, e);
  const head =
    `<tr><th style="width:9mm">DAY</th><th style="width:12mm">CLASS</th>` +
    SLOTS.map((s) => {
      if (s.kind === "lesson") return `<th>${s.n}<span class="t">${s.start} - ${s.end}</span></th>`;
      if (s.kind === "assembly") return "";
      return `<th style="width:12mm">${s.label.split(" ")[0]}<span class="t">${s.start} - ${s.end}</span></th>`;
    }).join("") +
    `</tr>`;
  let body = "";
  for (const d of DAYS) {
    classes.forEach((c, ci) => {
      const dayCell = ci === 0 ? `<td class="day" rowspan="${classes.length}">${d.label}</td>` : "";
      const clsCell = `<td class="cls">${esc(c.name)}${c.section ? ` ${esc(c.section)}` : ""}</td>`;
      const cells = SLOTS.map((s) => {
        if (s.kind === "assembly") return "";
        if (s.kind !== "lesson") return `<td class="band">${s.label.split(" ")[0]}</td>`;
        const e = byKey.get(`${c.id}|${d.num}|${s.n}`);
        if (!e) return `<td class="cell"></td>`;
        const tn = e.teacherName ? `<span class="tn">${esc(e.teacherName)}</span>` : "";
        return `<td class="cell"><b>${esc(subjectCodeOf(e.subjectName, e.subjectCode))}</b>${tn}</td>`;
      }).join("");
      body += `<tr>${dayCell}${clsCell}${cells}</tr>`;
    });
  }
  // Extra-curriculum column note row (bottom, per school wall clock).
  return `<table>${head}${body}</table>`;
}

/** One class / one teacher grid — periods as rows, days as columns. */
function gridTableHtml(
  entries: EntryRow[],
  renderCell: (e: EntryRow) => string,
): string {
  const byKey = new Map<string, EntryRow>();
  for (const e of entries) byKey.set(groupKey(e.dayOfWeek, e.period), e);
  const head = `<tr><th style="width:16mm">PERIOD</th><th style="width:22mm">TIME</th>${DAYS.map((d) => `<th>${d.label}</th>`).join("")}<th style="width:30mm">EXTRA CURRICULUM</th></tr>`;
  let body = "";
  for (const s of SLOTS) {
    if (s.kind !== "lesson") {
      const filler = s.kind === "extra" ? EXTRA_ACTIVITIES : null;
      body += `<tr><td class="band">${esc(s.label)}</td><td class="band">${s.start} - ${s.end}</td>${DAYS.map((d) => `<td class="${filler ? "extra" : "band"}">${filler ? esc(filler[d.num] ?? "") : esc(s.label.split(" ")[0])}</td>`).join("")}<td class="${s.kind === "extra" ? "extra" : "band"}">${s.kind === "extra" ? "" : esc(s.label)}</td></tr>`;
      continue;
    }
    const cells = DAYS.map((d) => {
      const e = byKey.get(groupKey(d.num, s.n as number));
      return e ? `<td class="cell"><b>${esc(subjectCodeOf(e.subjectName, e.subjectCode))}</b>${renderCell(e)}</td>` : `<td class="cell"></td>`;
    }).join("");
    body += `<tr><td class="band">${s.n}</td><td class="band">${s.start} - ${s.end}</td>${cells}<td class="extra">${esc(EXTRA_ACTIVITIES[s.n as number] ?? "")}</td></tr>`;
  }
  return `<table>${head}${body}</table>`;
}

function getEntriesByKey(entries: EntryRow[]): Map<string, EntryRow> {
  const m = new Map<string, EntryRow>();
  for (const e of entries) m.set(groupKey(e.dayOfWeek, e.period), e);
  return m;
}

export default function TimetablePage() {
  const { user, hasPerm } = useAuth();
  const manage = user?.role === "admin" || hasPerm("timetable.manage");
  const canView = user?.role === "admin" || manage || hasPerm("timetable.view");

  const [tab, setTab] = useState<string>(manage ? "builder" : "my");
  const classesFetch = useFetch<ClassRow[]>("/api/classes");
  const subjectsFetch = useFetch<SubjectRow[]>(manage ? "/api/subjects" : null);
  const classList = useMemo(() => classesFetch.data ?? [], [classesFetch.data]);
  const subjectList = useMemo(() => subjectsFetch.data ?? [], [subjectsFetch.data]);

  // ---- Builder state (Academic) ----
  const [editClassId, setEditClassId] = useState("");
  const builderUrl = manage && editClassId ? `/api/timetable?mode=class&classId=${editClassId}` : null;
  const builderFetch = useFetch<EntryRow[]>(builderUrl);
  const builderEntries = useMemo(() => builderFetch.data ?? [], [builderFetch.data]);
  const [modal, setModal] = useState<{ day: number; period: number } | null>(null);
  const [modalSubject, setModalSubject] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);

  // ---- General view (Academic) ----
  const generalFetch = useFetch<EntryRow[]>(manage && (tab === "general" || tab === "class") ? "/api/timetable?mode=general" : null);
  const generalEntries = useMemo(() => generalFetch.data ?? [], [generalFetch.data]);
  const [viewClassId, setViewClassId] = useState("");

  // ---- Teacher views ----
  const myFetch = useFetch<EntryRow[]>(!manage && tab === "my" ? "/api/timetable?mode=my" : null);
  const myEntries = useMemo(() => myFetch.data ?? [], [myFetch.data]);
  const [myClassId, setMyClassId] = useState("");
  const myClassFetch = useFetch<EntryRow[]>(!manage && tab === "cls" && myClassId ? `/api/timetable?mode=class&classId=${myClassId}` : null);
  const myClassEntries = useMemo(() => myClassFetch.data ?? [], [myClassFetch.data]);

  const editClass = useMemo(() => classList.find((c) => String(c.id) === editClassId) ?? null, [classList, editClassId]);
  const viewClass = useMemo(() => classList.find((c) => String(c.id) === viewClassId) ?? null, [classList, viewClassId]);
  const myClass = useMemo(() => classList.find((c) => String(c.id) === myClassId) ?? null, [classList, myClassId]);

  function openModal(day: number, period: number, existing: EntryRow | undefined) {
    setModal({ day, period });
    setModalSubject(existing ? String(existing.subjectId) : "");
    setModalErr(null);
  }

  async function saveCell() {
    if (!modal || !editClassId || !modalSubject) return;
    setModalBusy(true);
    setModalErr(null);
    try {
      await postJSON("/api/timetable", {
        classId: Number(editClassId),
        dayOfWeek: modal.day,
        period: modal.period,
        subjectId: Number(modalSubject),
      });
      setModal(null);
      builderFetch.refresh();
      generalFetch.refresh();
    } catch (err) {
      setModalErr(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setModalBusy(false);
    }
  }

  async function clearCell(existing: EntryRow | undefined) {
    if (!modal || !editClassId || !existing) {
      setModal(null);
      return;
    }
    setModalBusy(true);
    setModalErr(null);
    try {
      await delWithBody("/api/timetable", { id: existing.id });
      setModal(null);
      builderFetch.refresh();
      generalFetch.refresh();
    } catch (err) {
      setModalErr(err instanceof Error ? err.message : "Failed to clear.");
    } finally {
      setModalBusy(false);
    }
  }

  const builderGrid = useMemo(() => getEntriesByKey(builderEntries), [builderEntries]);
  const myGrid = useMemo(() => getEntriesByKey(myEntries), [myEntries]);
  const myClassGrid = useMemo(() => getEntriesByKey(myClassEntries), [myClassEntries]);
  const visibleViewEntries = useMemo(
    () => (viewClass ? generalEntries.filter((e) => e.classId === viewClass.id) : []),
    [generalEntries, viewClass],
  );

  const tabs = manage
    ? [
        { key: "builder", label: "🛠️ Timetable Builder", icon: "" },
        { key: "general", label: "🏫 General Timetable", icon: "" },
        { key: "class", label: "📄 Class Timetable", icon: "" },
      ]
    : [
        { key: "my", label: "👨‍🏫 My Timetable", icon: "" },
        { key: "cls", label: "🏫 My Classes", icon: "" },
      ];

  const modalExisting = modal ? builderGrid.get(groupKey(modal.day, modal.period)) : undefined;
  const modalSubjectRow = subjectList.find((s) => String(s.id) === modalSubject) ?? null;

  function cellContent(e: EntryRow): string {
    return `<span class="tn">${esc(e.className)}${e.section ? ` ${esc(e.section)}` : ""}</span>`;
  }

  return (
    <AppShell>
      <PageHeader icon="📅" title="Timetable" subtitle="Create, manage and print class timetables">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cls(
              "rounded-xl px-4 py-2 text-xs font-bold transition",
              tab === t.key ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </PageHeader>

      {!canView ? (
        <EmptyState icon="🔒" title="Access Denied" message="Your account has no Timetable permission. Ask the admin to enable it in Assignments." />
      ) : classesFetch.loading ? (
        <Loader label="Loading classes..." />
      ) : classesFetch.error ? (
        <EmptyState icon="⚠️" title="Could not load classes" message={classesFetch.error} />
      ) : tab === "builder" && manage ? (
        /* ================= BUILDER (Academic) ================= */
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Class">
              <select value={editClassId} onChange={(e) => setEditClassId(e.target.value)} className={inputCls}>
                <option value="">— Select class to build —</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` — ${c.section}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            {editClassId && (
              <button
                onClick={() => {
                  if (!viewClassId) setViewClassId(editClassId);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ↗ Preview in Class Timetable
              </button>
            )}
          </div>

          {!editClassId ? (
            <div className="mt-6">
              <EmptyState icon="🛠️" title="Pick a class" message="Choose a class above, then click any cell to assign a subject to that day & period." />
            </div>
          ) : builderFetch.loading ? (
            <div className="mt-6"><Loader label="Loading timetable..." /></div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[760px] border-collapse text-center text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-700 px-2 py-2 text-left">PERIOD</th>
                    {DAYS.map((d) => (
                      <th key={d.num} className="border border-slate-700 px-2 py-2">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map((s) =>
                    s.kind !== "lesson" ? (
                      <tr key={`${s.kind}-${s.start}`} className="bg-slate-100">
                        <td className="border border-slate-200 px-2 py-1 text-left text-[10px] font-bold text-slate-500">
                          {s.label}
                          <span className="ml-1 font-normal">{s.start} - {s.end}</span>
                        </td>
                        <td colSpan={5} className="border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {s.kind === "extra" ? DAYS.map((d) => EXTRA_ACTIVITIES[d.num]).join(" · ") : s.label}
                        </td>
                      </tr>
                    ) : (
                      <tr key={`p-${s.n}`}>
                        <td className="whitespace-nowrap border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-bold text-slate-500">
                          {s.n}
                          <span className="ml-1 font-normal">{s.start} - {s.end}</span>
                        </td>
                        {DAYS.map((d) => {
                          const e = builderGrid.get(groupKey(d.num, s.n as number));
                          return (
                            <td key={d.num} className="border border-slate-200 p-1">
                              <button
                                onClick={() => openModal(d.num, s.n as number, e)}
                                className={cls(
                                  "w-full rounded-lg px-1 py-2 text-[11px] font-bold transition",
                                  e ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-50 text-slate-300 hover:bg-indigo-50 hover:text-indigo-500",
                                )}
                                title={e ? `${e.subjectName} — ${e.teacherName ?? "unassigned"}` : "Assign subject"}
                              >
                                {e ? (
                                  <>
                                    {subjectCodeOf(e.subjectName, e.subjectCode)}
                                    <span className="mt-0.5 block text-[9px] font-normal opacity-90">{e.teacherName ?? "—"}</span>
                                  </>
                                ) : (
                                  "+"
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Editor modal */}
          {modal && editClass && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !modalBusy && setModal(null)}>
              <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm font-extrabold text-slate-900">
                  {editClass.name} · {DAYS.find((d) => d.num === modal.day)?.label} · Period {modal.period}
                  <span className="ml-1 text-xs font-normal text-slate-500">{periodTime(modal.period)}</span>
                </p>
                <Field label="Subject">
                  <select value={modalSubject} onChange={(e) => setModalSubject(e.target.value)} className={inputCls}>
                    <option value="">— Select subject —</option>
                    {subjectList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.code ? ` (${s.code})` : ""}
                        {s.teacherName ? ` — ${s.teacherName}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                {modalSubjectRow && (
                  <p className="mt-1.5 text-xs font-semibold text-slate-500">
                    Teacher: {modalSubjectRow.teacherName ?? "not assigned yet (set it via Manage Teachers)"}
                  </p>
                )}
                {modalErr && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">⚠️ {modalErr}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={saveCell} disabled={modalBusy || !modalSubject} className={btnPrimary}>
                    {modalBusy ? "Saving..." : modalExisting ? "💾 Update" : "💾 Assign"}
                  </button>
                  {modalExisting && (
                    <button onClick={() => clearCell(modalExisting)} disabled={modalBusy} className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50">
                      🗑️ Clear
                    </button>
                  )}
                  <button onClick={() => setModal(null)} disabled={modalBusy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : tab === "general" && manage ? (
        /* ================= GENERAL VIEW (Academic) ================= */
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">🏫 General School Timetable</h2>
            <button
              onClick={() => print(generalEntries)}
              disabled={generalEntries.length === 0}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-40"
            >
              🖨️ Print General Timetable
            </button>
          </div>
          {generalFetch.loading ? (
            <div className="mt-6"><Loader label="Loading general timetable..." /></div>
          ) : generalEntries.length === 0 ? (
            <div className="mt-6"><EmptyState icon="🏫" title="Nothing built yet" message="Use the Timetable Builder tab to start filling the school timetable." /></div>
          ) : (
            <GeneralGrid classes={classList} entries={generalEntries} />
          )}
        </section>
      ) : tab === "class" && manage ? (
        /* ================= CLASS TIMETABLE (Academic, sorted from general) ================= */
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Field label="Class">
              <select value={viewClassId} onChange={(e) => setViewClassId(e.target.value)} className={inputCls}>
                <option value="">— Select class —</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` — ${c.section}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            {viewClass && (
              <button
                onClick={() => printShell(
                  `CLASS TIMETABLE — ${viewClass.name}${viewClass.section ? ` ${viewClass.section}` : ""}`,
                  "CLASS WEEKLY TEACHING TIMETABLE",
                  `Class: ${viewClass.name}${viewClass.section ? ` ${viewClass.section}` : ""} · Sorted from the General Timetable`,
                  gridTableHtml(visibleViewEntries, (e) => (e.teacherName ? `<span class="tn">${esc(e.teacherName)}</span>` : "")),
                  legendOf(visibleViewEntries),
                )}
                className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                🖨️ Print Class Timetable
              </button>
            )}
          </div>
          {!viewClass ? (
            <div className="mt-6"><EmptyState icon="📄" title="Pick a class" message="The class timetable is automatically sorted out of the general timetable." /></div>
          ) : (
            <div className="mt-5">
              <CellGrid entries={visibleViewEntries} mode="classView" />
            </div>
          )}
        </section>
      ) : tab === "my" && !manage ? (
        /* ================= MY TIMETABLE (teacher) ================= */
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">👨‍🏫 My Weekly Timetable</h2>
            {myEntries.length > 0 && (
              <button
                onClick={() =>
                  printShell(
                    "MY WEEKLY TIMETABLE",
                    "TEACHER WEEKLY TEACHING SCHEDULE",
                    `Teacher: ${user?.name ?? ""}`,
                    gridTableHtml(myEntries, cellContent),
                    legendOf(myEntries),
                  )
                }
                className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                🖨️ Print
              </button>
            )}
          </div>
          {myFetch.loading ? (
            <div className="mt-6"><Loader label="Loading your timetable..." /></div>
          ) : myEntries.length === 0 ? (
            <div className="mt-6"><EmptyState icon="📅" title="No lessons on your timetable yet" message="Once the Academic Master publishes the school timetable, your assigned lessons will appear here automatically." /></div>
          ) : (
            <div className="mt-5">
              <CellGrid entries={myEntries} mode="my" />
            </div>
          )}
        </section>
      ) : (
        /* ================= MY CLASSES (teacher, read-only) ================= */
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <Field label="My Class">
            <select value={myClassId} onChange={(e) => setMyClassId(e.target.value)} className={inputCls}>
              <option value="">— Select one of your classes —</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ` — ${c.section}` : ""}
                </option>
              ))}
            </select>
          </Field>
          {!myClassId ? (
            <div className="mt-6"><EmptyState icon="🏫" title="Pick a class" message="You can only view timetables of the classes assigned to you by the admin." /></div>
          ) : myClassFetch.loading ? (
            <div className="mt-6"><Loader label="Loading class timetable..." /></div>
          ) : (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">
                  {myClass?.name} {myClass?.section}
                </p>
                <button
                  onClick={() =>
                    printShell(
                      `CLASS TIMETABLE — ${myClass?.name ?? ""}${myClass?.section ? ` ${myClass.section}` : ""}`,
                      "CLASS WEEKLY TEACHING TIMETABLE",
                      `Class: ${myClass?.name ?? ""}${myClass?.section ? ` ${myClass.section}` : ""} · Read-only`,
                      gridTableHtml(myClassEntries, (e) => (e.teacherName ? `<span class="tn">${esc(e.teacherName)}</span>` : "")),
                      legendOf(myClassEntries),
                    )
                  }
                  className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                >
                  🖨️ Print
                </button>
              </div>
              {myClassGrid.size === 0 ? (
                <EmptyState icon="📅" title="No timetable for this class yet" message="The Academic Master has not filled any lesson for this class yet." />
              ) : (
                <CellGrid entries={myClassEntries} mode="classView" />
              )}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );

  function print(entries: EntryRow[]) {
    printShell(
      "GENERAL TEACHING TIMETABLE",
      "GENERAL SCHOOL TEACHING TIME TABLE",
      "All Classes · All Teachers",
      generalTableHtml(classList, entries),
      legendOf(entries),
    );
  }
}

/** Read-only grid used by class views and "My Timetable" (periods as rows). */
function CellGrid({ entries, mode }: { entries: EntryRow[]; mode: "my" | "classView" }) {
  const grid = useMemo(() => {
    const m = new Map<string, EntryRow>();
    for (const e of entries) m.set(`${e.dayOfWeek}|${e.period}`, e);
    return m;
  }, [entries]);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[760px] border-collapse text-center text-xs">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="border border-slate-700 px-2 py-2 text-left">PERIOD</th>
            {DAYS.map((d) => (
              <th key={d.num} className="border border-slate-700 px-2 py-2">
                {d.label}
              </th>
            ))}
            <th className="border border-slate-700 px-2 py-2">EXTRA CURRICULUM</th>
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((s) =>
            s.kind !== "lesson" ? (
              <tr key={`${s.kind}-${s.start}`} className="bg-slate-100">
                <td className="border border-slate-200 px-2 py-1 text-left text-[10px] font-bold text-slate-500">
                  {s.label}
                  <span className="ml-1 font-normal">{s.start} - {s.end}</span>
                </td>
                {DAYS.map((d) => (
                  <td key={d.num} className={cls("border border-slate-200 text-[10px] font-bold", s.kind === "extra" ? "bg-amber-50 text-amber-800" : "uppercase tracking-widest text-slate-400")}>
                    {s.kind === "extra" ? EXTRA_ACTIVITIES[d.num] : ""}
                  </td>
                ))}
                <td className={cls("border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400", s.kind === "extra" && "bg-amber-50")}>
                  {s.kind !== "extra" ? s.label : ""}
                </td>
              </tr>
            ) : (
              <tr key={`p-${s.n}`}>
                <td className="whitespace-nowrap border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-bold text-slate-500">
                  {s.n}
                  <span className="ml-1 font-normal">{s.start} - {s.end}</span>
                </td>
                {DAYS.map((d) => {
                  const e = grid.get(`${d.num}|${s.n}`);
                  return (
                    <td key={d.num} className="border border-slate-200 p-1">
                      {e ? (
                        <div className="rounded-lg bg-emerald-600 px-1 py-2 font-bold text-white">
                          {subjectCodeOf(e.subjectName, e.subjectCode)}
                          <span className="mt-0.5 block text-[9px] font-normal opacity-90">
                            {mode === "my" ? `${e.className}${e.section ? ` ${e.section}` : ""}` : (e.teacherName ?? "—")}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-slate-50 px-1 py-2 text-slate-300">—</div>
                      )}
                    </td>
                  );
                })}
                <td className="border border-slate-200 bg-amber-50 text-[10px] font-bold text-amber-800" />
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

/** On-screen general grid (same shape as the printed one). */
function GeneralGrid({ classes, entries }: { classes: ClassRow[]; entries: EntryRow[] }) {
  const byKey = useMemo(() => {
    const m = new Map<string, EntryRow>();
    for (const e of entries) m.set(`${e.classId}|${e.dayOfWeek}|${e.period}`, e);
    return m;
  }, [entries]);

  if (classes.length === 0) {
    return <EmptyState icon="🏫" title="No classes yet" message="Add classes first." />;
  }

  const lessonSlots = SLOTS.filter((s) => s.kind !== "assembly");

  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1100px] border-collapse text-center text-[10px]">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="border border-slate-700 px-1.5 py-2">DAY</th>
            <th className="border border-slate-700 px-1.5 py-2">CLASS</th>
            {lessonSlots.map((s) => (
              <th key={`${s.kind}-${s.start}`} className="border border-slate-700 px-1 py-2">
                {s.kind === "lesson" ? s.n : s.label.split(" ")[0]}
                <span className="block text-[8px] font-normal text-indigo-300">{s.start}-{s.end}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d) =>
            classes.map((c, ci) => (
              <tr key={`${d.num}-${c.id}`} className="odd:bg-white even:bg-slate-50/60">
                {ci === 0 && (
                  <td rowSpan={classes.length} className="border border-slate-200 bg-slate-900 px-1.5 py-1 font-bold text-white [writing-mode:vertical-rl]">
                    {d.label}
                  </td>
                )}
                <td className="whitespace-nowrap border border-slate-200 bg-indigo-50/70 px-1.5 py-1 font-bold text-indigo-900">
                  {c.name}
                  {c.section ? ` ${c.section}` : ""}
                </td>
                {lessonSlots.map((s) => {
                  if (s.kind !== "lesson") {
                    return (
                      <td key={`${d.num}-${c.id}-${s.start}`} className="border border-slate-200 bg-slate-100 text-[8px] font-bold uppercase text-slate-400">
                        {s.kind === "extra" ? EXTRA_ACTIVITIES[d.num] : s.label.split(" ")[0]}
                      </td>
                    );
                  }
                  const e = byKey.get(`${c.id}|${d.num}|${s.n}`);
                  return (
                    <td key={`${d.num}-${c.id}-${s.n}`} className="border border-slate-200 px-1 py-1">
                      {e && (
                        <>
                          <b className="text-indigo-800">{subjectCodeOf(e.subjectName, e.subjectCode)}</b>
                          {e.teacherName && <span className="block truncate text-[8px] text-slate-500">{e.teacherName}</span>}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
