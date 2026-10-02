"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { EmptyState, Field, Loader, PageHeader, btnPrimary, inputCls } from "@/components/ui";
import { putJSON, useFetch } from "@/lib/utils";

type SettingsData = {
  schoolName: string;
  councilName: string;
  motto: string;
  headOfSchoolName: string;
  logoLeftData: string;
  logoRightData: string;
};

export default function AdminSettingsPage() {
  const fetcher = useFetch<SettingsData>("/api/school-settings");
  const [form, setForm] = useState<SettingsData>({ schoolName: "", councilName: "", motto: "", headOfSchoolName: "", logoLeftData: "", logoRightData: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const leftFileRef = useRef<HTMLInputElement>(null);
  const rightFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fetcher.data) setForm(fetcher.data);
  }, [fetcher.data]);

  function resizeLogo(file: File, side: "logoLeftData" | "logoRightData") {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 240;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        setMsg("Could not process this image. Please try another file.");
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/png");
      setForm((f) => ({ ...f, [side]: data }));
      setMsg("✅ Logo loaded — click Save Settings to keep it.");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setMsg("Could not load this image. Please try another file.");
    };
    img.src = url;
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await putJSON("/api/school-settings", form);
      setMsg("✅ Settings saved — printed reports now use these values.");
      fetcher.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader icon="⚙️" title="System Settings" subtitle="School identity used on printed reports (TOD Duty Report and future documents)">
        <button onClick={save} disabled={saving} className={btnPrimary}>
          {saving ? "Saving..." : "💾 Save Settings"}
        </button>
      </PageHeader>

      {msg && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">{msg}</p>}

      {fetcher.loading ? (
        <Loader label="Loading settings..." />
      ) : fetcher.error ? (
        <EmptyState icon="⚠️" title="Could not load settings" message={fetcher.error} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* School identity */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">🏫 School Identity</p>
            </div>
            <div className="space-y-4 p-5">
              <Field label="School Name">
                <input
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  placeholder="e.g. MANGI WINGIA SECONDARY SCHOOL"
                  className={inputCls}
                />
              </Field>
              <Field label="District / Council Name">
                <input
                  value={form.councilName}
                  onChange={(e) => setForm({ ...form, councilName: e.target.value })}
                  placeholder="e.g. ROMBO DISTRICT COUNCIL"
                  className={inputCls}
                />
              </Field>
              <Field label="Motto (shown at the bottom of reports)">
                <input
                  value={form.motto}
                  onChange={(e) => setForm({ ...form, motto: e.target.value })}
                  placeholder="e.g. Honor All Build Together"
                  className={inputCls}
                />
              </Field>
              <Field label="Head of School Name (signs reports)">
                <input
                  value={form.headOfSchoolName}
                  onChange={(e) => setForm({ ...form, headOfSchoolName: e.target.value })}
                  placeholder="e.g. Saidi Rashid Mpambika"
                  className={inputCls}
                />
                <p className="mt-1 text-[11px] text-slate-400">Initials are generated automatically for the signature.</p>
              </Field>
            </div>
          </section>

          {/* Report logos */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">🖼️ Examination Report Logos</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {([
                  { side: "logoLeftData", label: "Left Logo", ref: leftFileRef },
                  { side: "logoRightData", label: "Right Logo", ref: rightFileRef },
                ] as const).map(({ side, label, ref }) => (
                  <div key={side} className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-bold text-slate-700">{label}</p>
                    <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">
                      {form[side] ? (
                        <img src={form[side]} alt={`${label} preview`} className="max-h-24 max-w-full object-contain" />
                      ) : (
                        <p className="text-sm italic text-slate-400">No logo uploaded.</p>
                      )}
                    </div>
                    <input
                      ref={ref}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) resizeLogo(file, side);
                        e.currentTarget.value = "";
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => ref.current?.click()}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
                      >
                        📤 Upload {label}
                      </button>
                      {form[side] && (
                        <button
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, [side]: "" }))}
                          className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
                        >
                          🗑️ Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Both logos appear on examination reports. The left logo is also used by the Teacher&apos;s Duty Report.
                Images are resized automatically for print.
              </p>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
