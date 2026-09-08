"use client";

import { useEffect, useState } from "react";
import { ActionButton, Modal, useActionState } from "@/components/ui";
import { cls, putJSON, useFetch } from "@/lib/utils";

type SubjectOpt = { id: number; name: string; code: string; assignedToMe: boolean; assignedToOther: string | null };
type ClassOpt = { id: number; name: string; section: string; assignedToMe: boolean; assignedToOther: string | null };

type AssignmentsData = {
  teacherId: number;
  subjects: SubjectOpt[];
  classes: ClassOpt[];
  subjectIds: number[];
  classIds: number[];
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
  const [selSubjects, setSelSubjects] = useState<Set<number>>(new Set());
  const [selClasses, setSelClasses] = useState<Set<number>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const { loading: saving, done, run } = useActionState();

  useEffect(() => {
    if (data) {
      setSelSubjects(new Set(data.subjectIds));
      setSelClasses(new Set(data.classIds));
    }
  }, [data]);

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacherId]);

  function toggleSubject(id: number) {
    setSelSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleClass(id: number) {
    setSelClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!teacherId) return;
    setSaveError(null);
    try {
      await run(async () => {
        try {
          await putJSON(`/api/teachers/${teacherId}/assignments`, {
            subjectIds: Array.from(selSubjects),
            classIds: Array.from(selClasses),
          });
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : "Failed to save.");
          throw err;
        }
      });
      onSaved();
      setTimeout(onClose, 900);
    } catch {
      /* error already shown */
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`📚 Assign Subjects & Classes — ${teacherName}`} wide>
      {loading && !data ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading...</p>
      ) : error && !data ? (
        <p className="py-10 text-center text-sm text-rose-600">{error}</p>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-slate-500">
            Select which subjects and classes <span className="font-semibold text-slate-700">{teacherName}</span> can access. They will only see these on their dashboard, students list, attendance, and score submission.
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Subjects */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-800">📖 Subjects</h3>
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2.5">
                {(data?.subjects ?? []).length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-slate-400">No subjects yet. Add some in Manage Subjects.</p>
                )}
                {(data?.subjects ?? []).map((s) => {
                  const checked = selSubjects.has(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cls(
                        "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition",
                        checked ? "bg-indigo-50 ring-1 ring-inset ring-indigo-200" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleSubject(s.id)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        {s.code && <span className="text-[11px] text-slate-400">({s.code})</span>}
                      </span>
                      {s.assignedToOther && !checked && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                          {s.assignedToOther}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Classes */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-800">🏫 Classes</h3>
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2.5">
                {(data?.classes ?? []).length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-slate-400">No classes yet. Add some in Manage Classes.</p>
                )}
                {(data?.classes ?? []).map((c) => {
                  const checked = selClasses.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className={cls(
                        "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition",
                        checked ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleClass(c.id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        {c.section && <span className="text-[11px] text-slate-400">{c.section}</span>}
                      </span>
                      {c.assignedToOther && !checked && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          also: {c.assignedToOther}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">{selSubjects.size} subject(s) · {selClasses.size} class(es) selected</p>
            <div className="flex gap-2">
              {saveError && <p className="self-center text-xs font-semibold text-rose-600">{saveError}</p>}
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <ActionButton onClick={save} loading={saving} done={done} doneText="Saved!">💾 Save Assignments</ActionButton>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
