"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Avatar,
  Badge,
  EmptyState,
  Loader,
  Modal,
  PageHeader,
  StatCard,
  btnDanger,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import { ROLE_PRESETS, staffRoleLabel } from "@/lib/permissions";
import { cls, postJSON, shortDate, useFetch } from "@/lib/utils";

type StaffAccount = {
  id: number;
  name: string;
  username: string;
  email: string;
  rawPassword: string;
  role: "admin" | "member";
  active: boolean;
  mustChangePassword: boolean;
  staffRole: string | null;
  createdAt: string;
  teacherId: number | null;
  teacherName: string | null;
  teacherPhone: string;
  teacherSubject: string;
  teacherQualification: string;
  permissionsCount: number;
  assignedClassesCount: number;
  assignedSubjectsCount: number;
};

type MonitorResponse = {
  staff: StaffAccount[];
  summary: {
    totalStaff: number;
    activeStaff: number;
    deactivatedStaff: number;
    mustChangePasswordCount: number;
    isAllActive: boolean;
    isAllDisabled: boolean;
  };
};

export default function MonitorDashboardsPage() {
  const monitorFetch = useFetch<MonitorResponse>("/api/admin/monitor");
  const data = monitorFetch.data;
  const staff = data?.staff ?? [];
  const summary = data?.summary;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [lockdownModalOpen, setLockdownModalOpen] = useState(false);
  const [enableAllModalOpen, setEnableAllModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // View Permissions modal
  const [inspectUser, setInspectUser] = useState<StaffAccount | null>(null);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      if (statusFilter === "active" && !s.active) return false;
      if (statusFilter === "disabled" && s.active) return false;
      if (roleFilter !== "all" && s.staffRole !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.teacherPhone.includes(q)
        );
      }
      return true;
    });
  }, [staff, statusFilter, roleFilter, search]);

  // Toggle single user
  async function toggleSingleUser(userId: number, currentActive: boolean) {
    setBusyUserId(userId);
    try {
      await postJSON("/api/admin/monitor", {
        action: "toggle_user",
        userId,
        active: !currentActive,
      });
      monitorFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle user status.");
    } finally {
      setBusyUserId(null);
    }
  }

  // Reset single user password
  async function handleResetPassword(userId: number, userName: string) {
    if (!window.confirm(`Reset password for ${userName} to default (shulehub2025)? They will be forced to change it on next login.`)) {
      return;
    }
    setBusyUserId(userId);
    try {
      await postJSON("/api/admin/monitor", {
        action: "reset_password",
        userId,
      });
      alert(`Password for ${userName} successfully reset to shulehub2025.`);
      monitorFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setBusyUserId(null);
    }
  }

  // Bulk: Disable all member accounts (Lockdown)
  async function handleDisableAll() {
    setActionLoading(true);
    try {
      await postJSON("/api/admin/monitor", { action: "disable_all" });
      setLockdownModalOpen(false);
      monitorFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to execute system lockdown.");
    } finally {
      setActionLoading(false);
    }
  }

  // Bulk: Enable all member accounts
  async function handleEnableAll() {
    setActionLoading(true);
    try {
      await postJSON("/api/admin/monitor", { action: "enable_all" });
      setEnableAllModalOpen(false);
      monitorFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to enable all accounts.");
    } finally {
      setActionLoading(false);
    }
  }

  const rolePresetList = Object.keys(ROLE_PRESETS);

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          icon="📡"
          title="Monitor Dashboards & Staff Accounts"
          subtitle="Real-time member status monitoring, individual account control, and system-wide security lockdown"
        >
          <div className="flex items-center gap-2">
            {summary?.isAllDisabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 px-3.5 py-1 text-xs font-black">
                🔴 LOCKDOWN ACTIVE — All Accounts Blocked
              </span>
            ) : summary?.deactivatedStaff && summary.deactivatedStaff > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-3.5 py-1 text-xs font-black">
                🟡 Partial Access ({summary.activeStaff}/{summary.totalStaff} Active)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-1 text-xs font-black">
                🟢 System Open — All Staff Enabled
              </span>
            )}
          </div>
        </PageHeader>

        {/* System Control Banner */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>🛡️</span> Master Access Controls (Udhibiti wa Ufikiaji)
              </h2>
              <p className="mt-1 text-xs text-slate-500 max-w-xl">
                Dhibiti uwezo wa walimu na watumishi kuingia kwenye mfumo. Unaweza kuzima au kuwasha akaunti zote kwa pamoja kwa mbofyo mmoja wakati wa dharura au likizo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setEnableAllModalOpen(true)}
                disabled={summary?.isAllActive}
                className={cls(
                  "rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-2",
                  summary?.isAllActive
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
                )}
              >
                🟢 Enable All Accounts
              </button>
              <button
                onClick={() => setLockdownModalOpen(true)}
                disabled={summary?.isAllDisabled}
                className={cls(
                  "rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-2",
                  summary?.isAllDisabled
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    : "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
                )}
              >
                🔴 System Lockdown (Disable All)
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon="👥"
            label="Total Staff Accounts"
            value={summary?.totalStaff ?? 0}
            tone="indigo"
          />
          <StatCard
            icon="🟢"
            label="Active Accounts"
            value={summary?.activeStaff ?? 0}
            tone="emerald"
            sub="Allowed to log in"
          />
          <StatCard
            icon="⛔"
            label="Deactivated"
            value={summary?.deactivatedStaff ?? 0}
            tone={summary?.deactivatedStaff ? "rose" : "slate"}
            sub={summary?.deactivatedStaff ? "Access blocked" : "None blocked"}
          />
          <StatCard
            icon="🔑"
            label="Default Password"
            value={summary?.mustChangePasswordCount ?? 0}
            tone="amber"
            sub="Must change on login"
          />
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search staff member or check number..."
              className={cls(inputCls, "w-64 text-xs")}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cls(inputCls, "w-40 text-xs font-bold")}
            >
              <option value="all">All Statuses ({staff.length})</option>
              <option value="active">Active Only ({summary?.activeStaff ?? 0})</option>
              <option value="disabled">Deactivated ({summary?.deactivatedStaff ?? 0})</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={cls(inputCls, "w-48 text-xs font-bold")}
            >
              <option value="all">All Roles</option>
              {rolePresetList.map((r) => (
                <option key={r} value={r}>
                  {staffRoleLabel(r) || r}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Showing {filteredStaff.length} of {staff.length} staff members
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {monitorFetch.loading && !data ? (
            <Loader label="Loading member accounts..." />
          ) : monitorFetch.error ? (
            <EmptyState icon="⚠️" title="Could not load staff monitoring" message={monitorFetch.error} />
          ) : filteredStaff.length === 0 ? (
            <EmptyState icon="👥" title="No staff members found" message="Try adjusting your search or filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-extrabold uppercase">#</th>
                    <th className="px-3 py-2.5 text-left font-extrabold uppercase">Staff Member</th>
                    <th className="px-3 py-2.5 text-left font-extrabold uppercase">Check No (Login)</th>
                    <th className="px-3 py-2.5 text-left font-extrabold uppercase">Staff Role</th>
                    <th className="px-3 py-2.5 text-center font-extrabold uppercase">Workload</th>
                    <th className="px-3 py-2.5 text-center font-extrabold uppercase">Permissions</th>
                    <th className="px-3 py-2.5 text-center font-extrabold uppercase">Login Status</th>
                    <th className="px-3 py-2.5 text-right font-extrabold uppercase">Account Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((s, idx) => {
                    const isBusy = busyUserId === s.id;

                    return (
                      <tr key={s.id} className={cls("hover:bg-slate-50", !s.active && "bg-rose-50/40")}>
                        <td className="px-3 py-2.5 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.name} tone={s.active ? "indigo" : "slate"} />
                            <div>
                              <p className="font-bold text-slate-900">{s.name}</p>
                              <p className="text-[10px] text-slate-400">{s.teacherPhone || s.email || "No contact info"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {s.username}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge tone={s.staffRole === "academic_master" ? "indigo" : "slate"}>
                            {staffRoleLabel(s.staffRole) || "Teacher"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-600">
                          {s.teacherId ? (
                            <span className="text-[11px] font-semibold">
                              {s.assignedSubjectsCount} subj · {s.assignedClassesCount} cls
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Non-teaching</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => setInspectUser(s)}
                            className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-0.5 text-xs transition"
                            title="Click to view permissions list"
                          >
                            🔑 {s.permissionsCount} perms
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {s.active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                              🟢 Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                              ⛔ Deactivated
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {s.active ? (
                              <button
                                onClick={() => toggleSingleUser(s.id, s.active)}
                                disabled={isBusy}
                                className="rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 text-xs font-bold transition disabled:opacity-50"
                                title="Block this teacher from logging in"
                              >
                                {isBusy ? "..." : "⛔ Block"}
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleSingleUser(s.id, s.active)}
                                disabled={isBusy}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold transition disabled:opacity-50"
                                title="Allow this teacher to log in"
                              >
                                {isBusy ? "..." : "✅ Enable"}
                              </button>
                            )}
                            <button
                              onClick={() => handleResetPassword(s.id, s.name)}
                              disabled={isBusy}
                              className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 text-xs font-bold transition"
                              title="Reset password to default (shulehub2025)"
                            >
                              🔄 Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: SYSTEM LOCKDOWN CONFIRMATION */}
        {lockdownModalOpen && (
          <Modal
            open={lockdownModalOpen}
            onClose={() => setLockdownModalOpen(false)}
            title="🔴 Confirm System Lockdown (Disable All Staff)"
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 leading-relaxed">
                <p className="font-extrabold text-sm mb-1 text-rose-950">⚠️ Onyo la Usalama (Security Warning)</p>
                <p>
                  Kitendo hiki kitazima mara moja akaunti zote za watumishi na walimu ({summary?.totalStaff ?? 0} akaunti).
                  Hakuna mwalimu au mtumishi atakayeweza kuingia kwenye mfumo hadi utakapowaruhusu tena.
                </p>
                <p className="mt-2 font-bold text-rose-950">
                  Akaunti yako ya Msimamizi Mkuu (Admin) itabaki hewani bila kuguswa.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLockdownModalOpen(false)}
                  className={btnGhost}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisableAll}
                  disabled={actionLoading}
                  className={btnDanger}
                >
                  {actionLoading ? "Locking down..." : "🚨 Yes, Lockdown All Accounts"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL: ENABLE ALL ACCOUNTS CONFIRMATION */}
        {enableAllModalOpen && (
          <Modal
            open={enableAllModalOpen}
            onClose={() => setEnableAllModalOpen(false)}
            title="🟢 Confirm Enable All Staff Accounts"
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 leading-relaxed">
                <p className="font-extrabold text-sm mb-1 text-emerald-950">Washa Akaunti Zote</p>
                <p>
                  Akaunti zote za watumishi ({summary?.totalStaff ?? 0} akaunti) zitawashwa mara moja na kuruhusiwa kuingia na kufanya kazi kwenye mfumo.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEnableAllModalOpen(false)}
                  className={btnGhost}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEnableAll}
                  disabled={actionLoading}
                  className={btnPrimary}
                >
                  {actionLoading ? "Enabling..." : "✅ Enable All Staff Accounts"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL: VIEW PERMISSIONS */}
        {inspectUser && (
          <Modal
            open={!!inspectUser}
            onClose={() => setInspectUser(null)}
            title={`🔑 Permissions & Profile: ${inspectUser.name}`}
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs grid grid-cols-2 gap-2">
                <div>Check Number: <b className="text-indigo-700">{inspectUser.username}</b></div>
                <div>Role: <b>{staffRoleLabel(inspectUser.staffRole) || "Teacher"}</b></div>
                <div>Status: <b>{inspectUser.active ? "🟢 Active" : "⛔ Deactivated"}</b></div>
                <div>Password: <b>{inspectUser.mustChangePassword ? "Default (Needs Change)" : "Customized"}</b></div>
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase text-slate-700 mb-2">
                  Assigned Permissions ({inspectUser.permissionsCount})
                </p>
                <p className="text-[11px] text-slate-500 mb-2">
                  Permissions are managed via <b>Manage Teachers ➔ Add Staff Member / Assignments</b>.
                </p>
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 p-2.5 bg-slate-50/50 text-xs text-slate-700 space-y-1">
                  {inspectUser.staffRole && inspectUser.staffRole in ROLE_PRESETS ? (
                    (ROLE_PRESETS[inspectUser.staffRole as keyof typeof ROLE_PRESETS].permissions as readonly string[]).map((p) => (
                      <div key={p} className="flex items-center gap-1.5 py-0.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span className="font-mono text-[11px]">{p}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">Default role preset permissions</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInspectUser(null)}
                  className={btnGhost}
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
