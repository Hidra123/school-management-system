"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ADMIN_SIDEBAR, MEMBER_SIDEBAR } from "@/lib/permissions";
import { cls } from "@/lib/utils";

function Brand() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg text-white shadow-md">
        🎓
      </div>
      <div className="leading-tight">
        <p className="text-base font-extrabold text-white">ShuleHub</p>
        <p className="text-[11px] font-medium text-indigo-300">
          {/* Changes based on role */}
        </p>
      </div>
    </div>
  );
}

type SidebarLink = { href: string; label: string; icon: string; group: string; badge?: string };

function GroupedNav({ links, pathname }: { links: SidebarLink[]; pathname: string }) {
  const grouped: Record<string, SidebarLink[]> = {};
  for (const l of links) {
    if (!grouped[l.group]) grouped[l.group] = [];
    grouped[l.group].push(l);
  }

  return (
    <>
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="mt-4 first:mt-0">
          <p className="mb-1.5 px-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {group}
          </p>
          {items.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && l.href !== "/admin" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cls(
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-indigo-500/20 text-white ring-1 ring-inset ring-indigo-400/30"
                    : "text-indigo-200/80 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className={cls("text-base transition", active ? "" : "opacity-80 group-hover:opacity-100")}>
                  {l.icon}
                </span>
                <span className="flex-1 whitespace-nowrap">{l.label}</span>
                {l.badge && (
                  <span className={cls(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    l.badge === "NEW" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white",
                  )}>
                    {l.badge}
                  </span>
                )}
                {active && !l.badge && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

export default function Sidebar({ locked = false }: { locked?: boolean }) {
  const pathname = usePathname();
  const { user, hasPerm, logout } = useAuth();

  const isAdmin = user?.role === "admin";
  const isAcademicMaster = user?.staffRole === "academic_master";

  // Admin sees admin sidebar, members see filtered member sidebar.
  // Academic Master gets students.map and year.manage automatically.
  // When locked (first login, default password) only the Change Password link is shown.
  const links: SidebarLink[] = locked
    ? [{ href: "/profile", label: "Change Password", icon: "🔑", group: "ACCOUNT", badge: "REQUIRED" }]
    : isAdmin
      ? ADMIN_SIDEBAR.map((l) => ({ ...l, badge: "badge" in l ? l.badge : undefined }))
      : (() => {
          const raw = MEMBER_SIDEBAR.filter(
            (l) =>
              hasPerm(l.perm) ||
              l.perm === "profile.edit" ||
              (isAcademicMaster && (l.perm === "students.map" || l.perm === "year.manage")),
          );

          if (!isAcademicMaster) {
            return raw.map((l) => ({ href: l.href, label: l.label, icon: l.icon, group: l.group }));
          }

          // Customized Academic Panel layout matching the master specifications
          const academicLinks: SidebarLink[] = [
            { href: "/", label: "Dashboard", icon: "🏠", group: "MAIN" },
            { href: "/profile", label: "Academic Profile", icon: "👤", group: "MAIN" },
            { href: "/students", label: "Student Admissions", icon: "👨‍🎓", group: "STUDENT MANAGEMENT" },
            { href: "/classes", label: "Manage Classes", icon: "🏫", group: "STUDENT MANAGEMENT" },
            { href: "/map-students", label: "Map Students", icon: "👥", group: "STUDENT MANAGEMENT" },
            { href: "/year-progression", label: "Year Progression", icon: "➔", group: "YEAR MANAGEMENT" },
            { href: "/attendance-tracking", label: "Attendance Tracking", icon: "🗓️", group: "MONITORING" },
            { href: "/subjects", label: "Manage Subjects", icon: "📚", group: "ACADEMIC" },
            { href: "/exams", label: "Manage Examinations", icon: "📋", group: "ACADEMIC" },
            { href: "/grades", label: "Submit Scores", icon: "📝", group: "ACADEMIC" },
            { href: "/grades/tracking", label: "Tracking Scores", icon: "📊", group: "ACADEMIC" },
            { href: "/timetable", label: "Manage Timetable", icon: "📅", group: "ACADEMIC" },
            { href: "/tod", label: "TOD Report", icon: "🔰", group: "ACADEMIC" },
            { href: "/messages", label: "Messages", icon: "💬", group: "COMMUNICATION" },
            { href: "/profile", label: "Change Password", icon: "🔑", group: "ACCOUNT" },
          ];

          return academicLinks;
        })();

  const roleLabel = isAdmin
    ? "Administrator Panel"
    : isAcademicMaster
      ? "Academic Panel"
      : "Member Panel";
  const statusDot = isAdmin;

  return (
    <>
      {/* Mobile */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 px-1">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg text-white shadow-md">
              🎓
            </div>
            <div className="leading-tight">
              <p className="text-base font-extrabold text-white">
                {isAcademicMaster ? "Academic Panel" : "ShuleHub"}
              </p>
              <p className="text-[11px] font-medium text-indigo-300">
                {isAcademicMaster ? "School SMS" : roleLabel}
              </p>
            </div>
          </div>
          <button onClick={logout} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20">
            Logout
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && l.href !== "/admin" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cls(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  active ? "bg-indigo-500 text-white" : "bg-white/5 text-indigo-200 hover:bg-white/10 hover:text-white",
                )}
              >
                <span>{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-950 lg:flex">
        {/* Header */}
        <div className="px-5 pb-1 pt-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg text-white shadow-md">
              🎓
            </div>
            <div className="leading-tight">
              <p className="text-base font-extrabold text-white">
                {isAcademicMaster ? "Academic Panel" : "ShuleHub"}
              </p>
              <p className="text-[11px] font-medium text-indigo-300">
                {isAcademicMaster ? "School SMS" : roleLabel}
              </p>
            </div>
          </div>
          {statusDot && (
            <p className="mt-3 flex items-center gap-2 px-1 text-xs font-semibold text-emerald-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              System Online
            </p>
          )}
        </div>

        {/* Nav */}
        <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
          <GroupedNav links={links} pathname={pathname} />
        </nav>

        {/* User info + logout */}
        <div className="border-t border-white/10 px-5 py-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-300">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{user.name}</p>
                <p className="truncate text-[11px] text-indigo-300/70">
                  {isAdmin ? "🛡️ Admin" : isAcademicMaster ? "Academic Panel" : "👤 Member"}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
