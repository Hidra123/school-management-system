"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton, Modal, useActionState } from "@/components/ui";
import { cls, putJSON, useFetch } from "@/lib/utils";

type SubjectOpt = { id: number; name: string; code: string };
type ClassOpt = { id: number; name: string; section: string };
type Cell = { subjectId: number; classId: number };
type OwnerInfo = { teacherName: string; legacy: boolean };

type AssignmentsData = {
  teacherId: number;
  subjects: SubjectOpt[];
  classes: ClassOpt[];
  cells: Cell[];
  owners: Record<string, OwnerInfo>;
};

function keyOf(subjectId: number, classId: number): string {
  return `${subjectId}|${classId}`;
}

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
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const { loading: saving, done, run } = useActionState();

  useEffect(() => {
    if (data) setSel(new Set(data.cells.map((c) => keyOf(c.subjectId, c.classId))));
  }, [data]);

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacherId]);

  const subjects = useMemo(() => data?.subjects ?? [], [data]);
  const classes = useMemo(() => data?.classes ?? [], [data]);

  function toggle(subjectId: number, classId: number) {
    setSel((prev) => {
      const next = new Set(prev);
      const k = keyOf(subjectId, classId);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleRow(subjectId: number) {
    setSel((prev) => {
      const next = new Set(prev);
      const allOn = classes.every((c) => next.has(keyOf(subjectId, c.id)));
      for (const c of classes) {
        const k = keyOf(subjectId, c.id);
        if (allOn) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }

  const foreignSelected = useMemo(() => {
    if (!data) return 0;
    return Array.from(sel).filter((k) => data.owners[k] && !data.owners[k].legacy).length;
  }, [sel, data]);

  async function save() {
    if (!teacherId) return;
    setSaveError(null);
    try {
      await run(async () => {
        try {
          await putJSON(`/api/teachers/${teacherId}/assignments`, {
            cells: Array.from(sel).map((k) => {
              const [subjectId, classId] = k.split("|").map(Number);
              return { subjectId, classId };
            }),
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
      ) : subjects.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No subjects yet. Add some in Manage Subjects first.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Tick every <span className="font-semibold text-slate-700">subject × class</span> cell that{" "}
            <span className="font-semibold text-slate-700">{teacherName}</span> teaches. Other teachers&apos; cells
            are shown in amber — you cannot overwrite them here (unassign them from that teacher first). Class
            access is granted automatically from ticked cells.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-700 px-2.5 py-2 text-left">SUBJECT</th>
                  {classes.map((c) => (
                    <th key={c.id} className="border border-slate-700 px-1.5 py-2">
                      {c.name}
                      {c.section ? <span className="block text-[9px] font-normal text-indigo-300">{c.section}</span> : null}
                    </th>
                  ))}
                  <th className="border border-slate-700 px-1.5 py-2 text-center">ALL</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const rowCount = classes.filter((c) => sel.has(keyOf(s.id, c.id))).length;
                  return (
                    <tr key={s.id} className="odd:bg-white even:bg-slate-50/60">
                      <td className="border border-slate-200 px-2.5 py-2 font-bold text-slate-800">
                        {s.name}
                        {s.code ? <span className="ml-1 font-normal text-slate-400">({s.code})</span> : null}
                      </td>
                      {classes.map((c) => {
                        const k = keyOf(s.id, c.id);
                        const mine = sel.has(k);
                        const owner = data?.owners[k];
                        const blocked = !!owner && !owner.legacy;
                        return (
                          <td key={k} className="border border-slate-200 p-1 text-center">
                            <button
                              onClick={() => toggle(s.id, c.id)}
                              title={
                                blocked
                                  ? `${owner!.teacherName} teaches this cell`
                                  : owner?.legacy
                                    ? `Currently assigned to ${owner.teacherName}`
                                    : mine
                                      ? "Click to unassign"
                                      : "Click to assign"
                              }
                              className={cls(
                                "inline-flex h-9 w-full items-center justify-center rounded-lg text-[11px] font-bold transition",
                                mine
                                  ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                                  : blocked
                                    ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100"
                                    : "bg-slate-50 text-slate-300 hover:bg-indigo-50 hover:text-indigo-500",
                              )}
                            >
                              {mine ? "✓" : blocked ? <span className="max-w-full truncate px-0.5">{owner!.teacherName.split(" ")[0]}</span> : owner?.legacy ? <span className="max-w-full truncate px-0.5 opacity-60">{owner.teacherName.split(" ")[0]}*</span> : "·"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="border border-slate-200 p-1 text-center">
                        <button
                          onClick={() => toggleRow(s.id)}
                          className={cls(
                            "inline-flex h-9 w-full items-center justify-center rounded-lg text-[10px] font-bold transition",
                            rowCount === classes.length
                              ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                          )}
                        >
                          {rowCount === classes.length ? "✓ ALL" : `${rowCount}/${classes.length}`}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <p className="text-slate-500">
              {sel.size} cell{sel.size === 1 ? "" : "s"} selected · classes granted automatically
            </p>
            {foreignSelected > 0 && (
              <p className="text-amber-700">⚠️ {foreignSelected} selected cell(s) belong to other teachers and will be rejected on save.</p>
            )}
          </div>

          {saveError && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">{saveError}</p>}

          <ActionButton onClick={save} loading={saving} done={done} doneText="Saved!" fullWidth>
            💾 Save {sel.size} Assignment{sel.size === 1 ? "" : "s"}
          </ActionButton>
        </div>
      )}
    </Modal>
  );
}
