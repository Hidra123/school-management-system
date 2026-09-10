"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton, Modal, inputCls, useActionState } from "@/components/ui";
import { cls, putJSON, useFetch } from "@/lib/utils";

type SubjectOpt = { id: number; name: string; code: string; assignedToMe: boolean };
type ClassOpt = { id: number; name: string; section: string; assignedToMe: boolean };

type AssignmentsData = {
  teacherId: number;
  teacherName: string;
  subjects: SubjectOpt[];
  classes: ClassOpt[];
  subjectIds: number[];
  classIds: number[];
  myPairings: string[]; // array of "subjectId-classId"
  pairingOwners: Record<string, string>; // "subjectId-classId" -> "Teacher Name"
};

/** Special class-specific subjects guidance notes */
const SPECIAL_CLASS_SUBJECTS: Record<string, string[]> = {
  "civics": ["Form 3", "Form 4"],
  "computer application": ["Form 1"],
  "computer science": ["Form 1", "Form 2"],
  "business studies": ["Form 1", "Form 2"],
};

export default function AssignSubjectsClassesModal({
  teacherId,
  teacherName,
  open,
  onClose,
  onSaved,
}: {
  teacherId: number | null;
  teacherName: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, loading, error, refresh } = useFetch<AssignmentsData>(
    open && teacherId ? `/api/teachers/${teacherId}/assignments` : null,
  );

  // Selected pairings: Set of "subjectId-classId"
  const [selectedPairings, setSelectedPairings] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("");
  const { loading: saving, done, run } = useActionState();

  useEffect(() => {
    if (data?.myPairings) {
      setSelectedPairings(new Set(data.myPairings));
    }
  }, [data]);

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacherId]);

  const classes = useMemo(() => data?.classes ?? [], [data?.classes]);
  const subjects = useMemo(() => {
    const list = data?.subjects ?? [];
    if (!filterSubject.trim()) return list;
    const q = filterSubject.toLowerCase();
    return list.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [data?.subjects, filterSubject]);

  function togglePairing(subjectId: number, classId: number) {
    const key = `${subjectId}-${classId}`;
    setSelectedPairings((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleEntireSubject(subjectId: number) {
    const allForSubject = classes.map((c) => `${subjectId}-${c.id}`);
    const allChecked = allForSubject.every((k) => selectedPairings.has(k));
    setSelectedPairings((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        allForSubject.forEach((k) => next.delete(k));
      } else {
        allForSubject.forEach((k) => next.add(k));
      }
      return next;
    });
  }

  // Count distinct subjects and classes assigned
  const summary = useMemo(() => {
    const distinctSubjects = new Set<number>();
    const distinctClasses = new Set<number>();
    selectedPairings.forEach((pair) => {
      const [sId, cId] = pair.split("-").map(Number);
      if (sId && cId) {
        distinctSubjects.add(sId);
        distinctClasses.add(cId);
      }
    });
    return {
      totalPairings: selectedPairings.size,
      subjectsCount: distinctSubjects.size,
      classesCount: distinctClasses.size,
      classIds: Array.from(distinctClasses),
      subjectIds: Array.from(distinctSubjects),
    };
  }, [selectedPairings]);

  async function save() {
    if (!teacherId) return;
    setSaveError(null);
    try {
      await run(async () => {
        try {
          await putJSON(`/api/teachers/${teacherId}/assignments`, {
            pairings: Array.from(selectedPairings),
            classIds: summary.classIds,
            subjectIds: summary.subjectIds,
          });
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : "Failed to save assignments.");
          throw err;
        }
      });
      onSaved();
      setTimeout(onClose, 900);
    } catch {
      /* error already handled */
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`📚 Assign Subjects & Classes — ${teacherName}`} wide>
      {loading && !data ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading assignments matrix...</div>
      ) : error && !data ? (
        <div className="py-12 text-center text-sm font-semibold text-rose-600">{error}</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-900 leading-relaxed">
            <p className="font-extrabold text-[12.5px] text-indigo-950 mb-1">
              ✨ Shared Subjects & Class Matrix (Uwezo wa Walimu Kushare Somo Moja)
            </p>
            <p>
              Weka alama ya vema (<span className="font-bold text-indigo-950">✓</span>) kwenye darasa mahususi ambalo <span className="font-bold underline">{teacherName}</span> anafundisha somo hilo.
              Walimu tofauti wanaweza kufundisha somo moja kwenye madarasa tofauti (k.m. Mwalimu A: Kiswahili Form 1 & 2; Mwalimu B: Kiswahili Form 3 & 4).
            </p>
          </div>

          {/* Filter subject search input */}
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              placeholder="🔍 Search subject (e.g. Kiswahili, Civics, Business)..."
              className={cls(inputCls, "max-w-xs text-xs")}
            />
            <span className="text-xs font-semibold text-slate-500">
              {summary.subjectsCount} subject(s) in {summary.classesCount} class(es) selected
            </span>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-3.5 py-2.5 text-left font-extrabold text-[11px] w-64 border-r border-slate-800">
                    Subject Name
                  </th>
                  {classes.map((c) => (
                    <th key={c.id} className="px-3 py-2.5 text-center font-extrabold text-[11px] min-w-[110px] border-r border-slate-800">
                      <div>{c.name}</div>
                      {c.section && <div className="text-[9px] font-normal text-slate-300">({c.section})</div>}
                    </th>
                  ))}
                  <th className="px-2.5 py-2.5 text-center font-extrabold text-[10px] w-20 text-slate-300">
                    All
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan={classes.length + 2} className="px-4 py-8 text-center text-slate-400">
                      No subjects match your filter.
                    </td>
                  </tr>
                ) : (
                  subjects.map((s, idx) => {
                    const rowKey = s.name.toLowerCase().trim();
                    const specialClasses = SPECIAL_CLASS_SUBJECTS[rowKey];

                    return (
                      <tr key={s.id} className={idx % 2 ? "bg-slate-50/50 hover:bg-slate-50" : "bg-white hover:bg-slate-50"}>
                        <td className="px-3.5 py-2.5 font-bold text-slate-800 border-r border-slate-100">
                          <div className="flex items-center justify-between gap-1">
                            <span>{s.name}</span>
                            {s.code && <span className="text-[10px] font-semibold text-slate-400">({s.code})</span>}
                          </div>
                          {specialClasses && (
                            <div className="text-[9.5px] font-semibold text-violet-600 mt-0.5">
                              📌 Inafundishwa: {specialClasses.join(", ")}
                            </div>
                          )}
                        </td>

                        {classes.map((c) => {
                          const pairKey = `${s.id}-${c.id}`;
                          const isAssignedToMe = selectedPairings.has(pairKey);
                          const otherTeacher = data?.pairingOwners?.[pairKey];
                          const isApplicable = !specialClasses || specialClasses.some((sc) => c.name.includes(sc));

                          return (
                            <td
                              key={c.id}
                              onClick={() => togglePairing(s.id, c.id)}
                              className={cls(
                                "px-2 py-2 text-center cursor-pointer border-r border-slate-100 transition",
                                isAssignedToMe ? "bg-indigo-50 font-bold" : "hover:bg-slate-100",
                                !isApplicable && !isAssignedToMe && "bg-slate-50/40 text-slate-300",
                              )}
                              title={
                                otherTeacher && !isAssignedToMe
                                  ? `Currently taught by: ${otherTeacher} (click to re-assign to ${teacherName})`
                                  : undefined
                              }
                            >
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <input
                                  type="checkbox"
                                  checked={isAssignedToMe}
                                  onChange={() => togglePairing(s.id, c.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                {otherTeacher && !isAssignedToMe ? (
                                  <span className="text-[8.5px] text-amber-700 font-semibold truncate max-w-[95px] bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                    {otherTeacher}
                                  </span>
                                ) : isAssignedToMe ? (
                                  <span className="text-[8.5px] text-indigo-700 font-bold">
                                    Assigned
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}

                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleEntireSubject(s.id)}
                            className="rounded px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200"
                            title="Toggle all classes for this subject"
                          >
                            All
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
            <div className="text-xs text-slate-500">
              <span className="font-bold text-slate-800">{summary.totalPairings}</span> total class-subject slots assigned to <span className="font-bold text-slate-800">{teacherName}</span>
            </div>
            <div className="flex items-center gap-2">
              {saveError && <span className="text-xs font-semibold text-rose-600">{saveError}</span>}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <ActionButton onClick={save} loading={saving} done={done} doneText="Saved!">
                💾 Save Assignments
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
