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
  logoData: string;
};

export default function AdminSettingsPage() {
  const fetcher = useFetch<SettingsData>("/api/school-settings");
  const [form, setForm] = useState<SettingsData>({ schoolName: "", councilName: "", motto: "", headOfSchoolName: "", logoData: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fetcher.data) setForm(fetcher.data);
  }, [fetcher.data]);

  function resizeLogo(file: File) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 240;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/png");
        setForm((f) => ({ ...f, logoData: data }));
        setMsg("✅ Logo loaded — click Save Settings to keep it.");
      }
      URL.revokeObjectURL(url);
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

          {/* Logo */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">🖼️ School Logo</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6">
                {form.logoData ? (
                  <img src={form.logoData} alt="School logo" className="max-h-32 object-contain" />
                ) : (
                  <p className="text-sm italic text-slate-400">No logo uploaded yet.</p>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) resizeLogo(f);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  📤 Upload Logo
                </button>
                {form.logoData && (
                  <button
                    onClick={() => setForm({ ...form, logoData: "" })}
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                  >
                    🗑️ Remove Logo
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                The logo appears at the top of the Teacher's Duty Report (and future printed documents). It is resized
                automatically to fit print headers.
              </p>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
