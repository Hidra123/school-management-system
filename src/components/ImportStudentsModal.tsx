"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ActionButton, Badge, Modal, useActionState } from "@/components/ui";
import { postJSON } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };

type ParsedRow = {
  admissionNo?: string;
  firstName?: string;
  lastName?: string;
  sex?: string;
  dateOfBirth?: string;
  className?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianAddress?: string;
};

type PreviewRow = ParsedRow & { rowNum: number; issues: string[] };

type ImportResult = {
  successCount: number;
  errorCount: number;
  results: { row: number; status: "ok" | "error"; message?: string; admissionNo?: string; name?: string }[];
};

// Flexible header aliases — matches common school spreadsheet column names,
// including exactly the columns used in the user's existing Excel sheet
// (AdmNo, FirstName, LastName, Sex, DOB, Class, Parent, Phone, Address).
const HEADER_ALIASES: Record<keyof ParsedRow, string[]> = {
  admissionNo: ["admissionno", "admno", "admission no", "admission number", "adm no", "reg no", "regno"],
  firstName: ["firstname", "first name", "fname", "given name"],
  lastName: ["lastname", "last name", "lname", "surname"],
  sex: ["sex", "gender"],
  dateOfBirth: ["dob", "dateofbirth", "date of birth", "birthdate", "birth date"],
  className: ["class", "classname", "class name", "form"],
  guardianName: ["parent", "guardian", "guardianname", "guardian name", "parent name", "parent/guardian"],
  guardianPhone: ["phone", "guardianphone", "guardian phone", "parent phone", "contact", "phone number"],
  guardianAddress: ["address", "guardianaddress", "guardian address", "home address", "location"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildColumnMap(headerRow: string[]): Partial<Record<keyof ParsedRow, number>> {
  const map: Partial<Record<keyof ParsedRow, number>> = {};
  headerRow.forEach((raw, idx) => {
    const h = normalizeHeader(String(raw ?? ""));
    for (const key of Object.keys(HEADER_ALIASES) as (keyof ParsedRow)[]) {
      if (map[key] !== undefined) continue;
      if (HEADER_ALIASES[key].includes(h)) map[key] = idx;
    }
  });
  return map;
}

function excelSerialToDate(n: number): string {
  // Excel's epoch is Dec 30, 1899.
  const utcDays = Math.floor(n - 25569);
  const utcValue = utcDays * 86400;
  const d = new Date(utcValue * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    // Heuristic: plausible Excel date serials are > 20000 (~1954) and < 60000 (~2064).
    if (v > 20000 && v < 60000) return excelSerialToDate(v);
    return String(v);
  }
  return String(v).trim();
}

function validateRow(r: ParsedRow, classNames: Set<string>): string[] {
  const issues: string[] = [];
  if (!r.firstName?.trim() && !r.lastName?.trim()) issues.push("Missing name");
  const sex = (r.sex ?? "").trim().toLowerCase();
  if (!["male", "female", "m", "f", "boy", "girl"].includes(sex)) issues.push("Invalid Sex");
  if (!r.className?.trim()) issues.push("Missing Class");
  else if (!classNames.has(r.className.trim().toLowerCase())) issues.push(`Unknown class "${r.className.trim()}"`);
  return issues;
}

export default function ImportStudentsModal({
  open,
  onClose,
  onImported,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  classes: ClassRow[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { loading: importing, run } = useActionState();

  const classNameSet = new Set(classes.map((c) => c.name.trim().toLowerCase()));
  const validRows = rows.filter((r) => r.issues.length === 0);
  const invalidRows = rows.filter((r) => r.issues.length > 0);

  function reset() {
    setFileName(null);
    setRows([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function downloadTemplate() {
    const headers = ["AdmNo", "FirstName", "LastName", "Sex", "DOB", "Class", "Parent", "Phone", "Address"];
    const example = ["S6790-001", "Agatha", "John Kimaro", "Female", "2010-05-14", classes[0]?.name ?? "Form 1", "John Kimaro", "0765000000", "Rombo"];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "ShuleHub-Students-Template.xlsx");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
        if (aoa.length < 2) {
          setParseError("The file has no data rows (only a header, or is empty).");
          setRows([]);
          return;
        }
        const headerRow = (aoa[0] as unknown[]).map((v) => String(v ?? ""));
        const colMap = buildColumnMap(headerRow);
        if (colMap.firstName === undefined && colMap.lastName === undefined) {
          setParseError('Could not find a "FirstName" / "LastName" column. Please use the template.');
          setRows([]);
          return;
        }
        if (colMap.className === undefined) {
          setParseError('Could not find a "Class" column. Please use the template.');
          setRows([]);
          return;
        }

        const parsed: PreviewRow[] = [];
        for (let i = 1; i < aoa.length; i++) {
          const raw = aoa[i] as unknown[];
          if (!raw || raw.every((c) => cellToString(c) === "")) continue; // skip blank rows
          const get = (key: keyof ParsedRow) => (colMap[key] !== undefined ? cellToString(raw[colMap[key]!]) : "");
          const parsedRow: ParsedRow = {
            admissionNo: get("admissionNo"),
            firstName: get("firstName"),
            lastName: get("lastName"),
            sex: get("sex"),
            dateOfBirth: get("dateOfBirth"),
            className: get("className"),
            guardianName: get("guardianName"),
            guardianPhone: get("guardianPhone"),
            guardianAddress: get("guardianAddress"),
          };
          parsed.push({ ...parsedRow, rowNum: i, issues: validateRow(parsedRow, classNameSet) });
        }
        if (parsed.length === 0) {
          setParseError("No usable data rows were found in the file.");
        }
        setRows(parsed);
      } catch {
        setParseError("Could not read this file. Make sure it is a valid .xlsx, .xls or .csv file.");
        setRows([]);
      }
    };
    reader.onerror = () => setParseError("Failed to read the file.");
    reader.readAsBinaryString(file);
  }

  async function doImport() {
    if (validRows.length === 0) return;
    await run(async () => {
      const payload = validRows.map((r) => ({
        admissionNo: r.admissionNo,
        firstName: r.firstName,
        lastName: r.lastName,
        sex: r.sex,
        dateOfBirth: r.dateOfBirth,
        className: r.className,
        guardianName: r.guardianName,
        guardianPhone: r.guardianPhone,
        guardianAddress: r.guardianAddress,
      }));
      const result = await postJSON<ImportResult>("/api/students/bulk-import", { rows: payload });
      setImportResult(result);
      onImported();
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="📤 Import Students from Excel" wide>
      <div className="space-y-5">
        {!importResult && (
          <>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900">
              <p className="font-bold">📋 How it works</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-indigo-800">
                <li>Download the template (or use your existing sheet — column names like <code className="rounded bg-white/70 px-1">AdmNo</code>, <code className="rounded bg-white/70 px-1">FirstName</code>, <code className="rounded bg-white/70 px-1">Class</code>, <code className="rounded bg-white/70 px-1">Parent</code>, <code className="rounded bg-white/70 px-1">Phone</code> are recognized automatically).</li>
                <li>Make sure every <span className="font-semibold">Class</span> value already exists under Manage Classes (e.g. &quot;Form 1&quot;).</li>
                <li>Upload the file, review the preview, then click Import.</li>
              </ol>
              <button onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50">
                ⬇️ Download Template (.xlsx)
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Upload File (.xlsx, .xls, .csv)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {fileName && <p className="mt-1.5 text-xs text-slate-500">Selected: {fileName}</p>}
            </div>

            {parseError && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">⚠️ {parseError}</p>
            )}

            {rows.length > 0 && (
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="emerald">✅ {validRows.length} ready to import</Badge>
                  {invalidRows.length > 0 && <Badge tone="rose">⚠️ {invalidRows.length} with issues (will be skipped)</Badge>}
                </div>
                <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="px-2.5 py-2 text-left font-bold text-slate-600">#</th>
                        <th className="px-2.5 py-2 text-left font-bold text-slate-600">AdmNo</th>
                        <th className="px-2.5 py-2 text-left font-bold text-slate-600">Name</th>
                        <th className="px-2.5 py-2 text-left font-bold text-slate-600">Sex</th>
                        <th className="px-2.5 py-2 text-left font-bold text-slate-600">Class</th>
                        <th className="px-2.5 py-2 text-left font-bold text-slate-600">Parent</th>
                        <th className="px-2.5 py-2 text-left font-bold text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r) => (
                        <tr key={r.rowNum} className={r.issues.length > 0 ? "bg-rose-50/50" : "odd:bg-white even:bg-slate-50/50"}>
                          <td className="px-2.5 py-1.5 text-slate-500">{r.rowNum}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{r.admissionNo || <span className="italic text-slate-400">auto</span>}</td>
                          <td className="px-2.5 py-1.5 font-semibold text-slate-800">{[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{r.sex || "—"}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{r.className || "—"}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{r.guardianName || "—"}</td>
                          <td className="px-2.5 py-1.5">
                            {r.issues.length === 0 ? (
                              <span className="font-semibold text-emerald-600">✅ OK</span>
                            ) : (
                              <span className="font-semibold text-rose-600" title={r.issues.join("; ")}>⚠️ {r.issues.join(", ")}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={handleClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <ActionButton onClick={doImport} loading={importing} disabled={validRows.length === 0} doneText="Imported!">
                📥 Import {validRows.length > 0 ? `${validRows.length} Student${validRows.length === 1 ? "" : "s"}` : "Students"}
              </ActionButton>
            </div>
          </>
        )}

        {importResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 rounded-xl bg-emerald-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-emerald-700">{importResult.successCount}</p>
                <p className="text-xs font-semibold text-emerald-600">Imported Successfully</p>
              </div>
              <div className="flex-1 rounded-xl bg-rose-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-rose-700">{importResult.errorCount}</p>
                <p className="text-xs font-semibold text-rose-600">Failed</p>
              </div>
            </div>
            {importResult.errorCount > 0 && (
              <div className="max-h-56 overflow-auto rounded-xl border border-rose-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-rose-50">
                    <tr>
                      <th className="px-2.5 py-2 text-left font-bold text-rose-700">Row</th>
                      <th className="px-2.5 py-2 text-left font-bold text-rose-700">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {importResult.results.filter((r) => r.status === "error").map((r) => (
                      <tr key={r.row}>
                        <td className="px-2.5 py-1.5 text-slate-600">{r.row}</td>
                        <td className="px-2.5 py-1.5 text-rose-700">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={reset} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Import Another File
              </button>
              <button onClick={handleClose} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
