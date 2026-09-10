"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ADMIN_SIDEBAR, MEMBER_SIDEBAR } from "@/lib/permissions";
import { cls } from "@/lib/utils";

type SidebarLink = {
  href: string;
  label: string;
  icon: string;
  group: string;
  badge?: string;
  tag?: string;
};

// Chevron SVG icon with smooth rotation transition
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls(
        "transition-transform duration-200 text-slate-400 group-hover:text-white",
        open ? "rotate-90 text-indigo-400" : "rotate-0",
      )}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// Group definitions with clean icons and colors
const GROUP_CONFIG: Record<
  string,
  { icon: string; defaultOpen?: boolean; accentBg?: string; dotColor?: string }
> = {
  MAIN: { icon: "⚡", defaultOpen: true, accentBg: "from-blue-500/20 to-indigo-500/10", dotColor: "bg-blue-400" },
  "STUDENT MANAGEMENT": { icon: "👨‍🎓", defaultOpen: true, accentBg: "from-indigo-500/20 to-violet-500/10", dotColor: "bg-indigo-400" },
  "YEAR MANAGEMENT": { icon: "➔", defaultOpen: false, accentBg: "from-violet-500/20 to-purple-500/10", dotColor: "bg-violet-400" },
  "STAFF MANAGEMENT": { icon: "👥", defaultOpen: true, accentBg: "from-purple-500/20 to-pink-500/10", dotColor: "bg-purple-400" },
  ACADEMIC: { icon: "📚", defaultOpen: true, accentBg: "from-sky-500/20 to-blue-500/10", dotColor: "bg-sky-400" },
  MONITORING: { icon: "📈", defaultOpen: false, accentBg: "from-emerald-500/20 to-teal-500/10", dotColor: "bg-emerald-400" },
  "MY CLASS": { icon: "🏫", defaultOpen: false, accentBg: "from-amber-500/20 to-orange-500/10", dotColor: "bg-amber-400" },
  REPORTS: { icon: "📊", defaultOpen: false, accentBg: "from-teal-500/20 to-emerald-500/10", dotColor: "bg-teal-400" },
  FINANCE: { icon: "💰", defaultOpen: false, accentBg: "from-emerald-500/20 to-green-500/10", dotColor: "bg-emerald-400" },
  PARENTS: { icon: "👪", defaultOpen: false, accentBg: "from-rose-500/20 to-red-500/10", dotColor: "bg-rose-400" },
  "USER CONTROL": { icon: "🛡️", defaultOpen: false, accentBg: "from-rose-500/20 to-pink-500/10", dotColor: "bg-rose-400" },
  COMMUNICATION: { icon: "💬", defaultOpen: false, accentBg: "from-cyan-500/20 to-blue-500/10", dotColor: "bg-cyan-400" },
  ADMINISTRATION: { icon: "⚙️", defaultOpen: false, accentBg: "from-slate-500/20 to-zinc-500/10", dotColor: "bg-slate-400" },
  ACCOUNT: { icon: "🔑", defaultOpen: false, accentBg: "from-amber-500/20 to-yellow-500/10", dotColor: "bg-amber-400" },
};

function AccordionNav({ links, pathname }: { links: SidebarLink[]; pathname: string }) {
  // Group links by their group name
  const grouped = useMemo(() => {
    const map: Record<string, SidebarLink[]> = {};
    for (const l of links) {
      if (!map[l.group]) map[l.group] = [];
      map[l.group].push(l);
    }
    return map;
  }, [links]);

  // Track accordion open/collapsed state per group
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const [group, items] of Object.entries(grouped)) {
      // Always open if current active page is inside this group, or if group defaults to open
      const hasActive = items.some(
        (l) => pathname === l.href || (l.href !== "/" && l.href !== "/admin" && pathname.startsWith(l.href)),
      );
      const conf = GROUP_CONFIG[group];
      initial[group] = hasActive || (conf?.defaultOpen ?? true);
    }
    return initial;
  });

  // Automatically expand group when navigating to a child page
  useEffect(() => {
    for (const [group, items] of Object.entries(grouped)) {
      const hasActive = items.some(
        (l) => pathname === l.href || (l.href !== "/" && l.href !== "/admin" && pathname.startsWith(l.href)),
      );
      if (hasActive) {
        setOpenGroups((prev) => ({ ...prev, [group]: true }));
      }
    }
  }, [pathname, grouped]);

  function toggleGroup(group: string) {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([group, items]) => {
        const isOpen = openGroups[group] ?? false;
        const conf = GROUP_CONFIG[group];
        const hasActiveChild = items.some(
          (l) => pathname === l.href || (l.href !== "/" && l.href !== "/admin" && pathname.startsWith(l.href)),
        );

        return (
          <div
            key={group}
            className={cls(
              "rounded-2xl transition-all duration-200 border",
              hasActiveChild
                ? "border-indigo-500/30 bg-slate-900/60 shadow-sm"
                : "border-transparent hover:border-slate-800/80 bg-slate-950/40",
            )}
          >
            {/* Accordion header button */}
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className={cls(
                "group flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 text-left text-xs font-bold transition rounded-xl select-none",
                hasActiveChild
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm opacity-90">{conf?.icon || "📁"}</span>
                <span className="truncate uppercase tracking-wider text-[11px] font-extrabold">
                  {group}
                </span>
                <span
                  className={cls(
                    "rounded-full px-1.5 py-0.2 text-[9.5px] font-extrabold",
                    hasActiveChild
                      ? "bg-indigo-500/30 text-indigo-300"
                      : "bg-slate-800/80 text-slate-500 group-hover:text-slate-400",
                  )}
                >
                  {items.length}
                </span>
              </div>
              <ChevronIcon open={isOpen} />
            </button>

            {/* Collapsible submenu items with smooth layout */}
            {isOpen && (
              <div className="pb-2 pt-0.5 px-2 space-y-1">
                {items.map((l) => {
                  const active =
                    pathname === l.href ||
                    (l.href !== "/" && l.href !== "/admin" && pathname.startsWith(l.href));

                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={cls(
                        "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition relative pl-3.5",
                        active
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-md shadow-indigo-500/20"
                          : "text-slate-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <span
                        className={cls(
                          "text-sm transition-transform duration-150",
                          active ? "scale-110" : "opacity-80 group-hover:opacity-100 group-hover:scale-105",
                        )}
                      >
                        {l.icon}
                      </span>
                      <span className="flex-1 truncate">{l.label}</span>

                      {/* Tag for TIE upcoming modules */}
                      {l.tag && (
                        <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-black uppercase">
                          {l.tag}
                        </span>
                      )}

                      {l.badge && (
                        <span
                          className={cls(
                            "rounded-full px-1.5 py-0.2 text-[9.5px] font-black uppercase",
                            l.badge === "NEW"
                              ? "bg-emerald-500 text-white"
                              : "bg-rose-500 text-white",
                          )}
                        >
                          {l.badge}
                        </span>
                      )}

                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Sidebar({ locked = false }: { locked?: boolean }) {
  const pathname = usePathname();
  const { user, hasPerm, logout } = useAuth();

  const isAdmin = user?.role === "admin";
  const isAcademicMaster = user?.staffRole === "academic_master";

  // Build navigation items
  const links: SidebarLink[] = locked
    ? [
        {
          href: "/profile",
          label: "Change Password",
          icon: "🔑",
          group: "ACCOUNT",
          badge: "REQUIRED",
        },
      ]
    : isAdmin
      ? ADMIN_SIDEBAR.map((l) => ({
          ...l,
          badge: "badge" in l ? l.badge : undefined,
        }))
      : (() => {
          if (!isAcademicMaster) {
            // Regular Teacher & Class Teacher: show their allowed permissions
            // plus Lesson Plans and Subject Log Book (marked with TIE badge for upcoming development)
            return MEMBER_SIDEBAR.filter(
              (l) =>
                hasPerm(l.perm) ||
                l.perm === "profile.edit" ||
                l.href === "/lesson-plans" ||
                l.href === "/logbook",
            ).map((l) => ({
              href: l.href,
              label: l.label,
              icon: l.icon,
              group: l.group,
              tag: l.href === "/lesson-plans" || l.href === "/logbook" ? "TIE" : undefined,
            }));
          }

          // Customized Academic Panel layout for Academic Master
          // Includes Lesson Plans and Subject Log Book marked with TIE badge
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
            { href: "/lesson-plans", label: "Lesson Plans", icon: "📖", group: "ACADEMIC", tag: "TIE" },
            { href: "/logbook", label: "Subject Log Book", icon: "📓", group: "ACADEMIC", tag: "TIE" },
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
      : "Teacher Panel";

  return (
    <>
      {/* Mobile Header */}
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
          <button
            onClick={logout}
            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
          >
            Logout
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5 scrollbar-none">
          {links.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== "/" && l.href !== "/admin" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cls(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white/5 text-indigo-200 hover:bg-white/10 hover:text-white",
                )}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
                {l.tag && (
                  <span className="rounded bg-amber-500/20 text-amber-300 text-[9px] px-1 font-extrabold">
                    {l.tag}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Desktop Sidebar with Glassmorphism & Accordion Submenus */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800/80 lg:flex shadow-2xl">
        {/* Brand Header */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-600 text-xl text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              🎓
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-base font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                <span>{isAcademicMaster ? "Academic Panel" : "ShuleHub"}</span>
              </p>
              <p className="text-[11px] font-bold text-indigo-300/80 truncate">
                {isAcademicMaster ? "School SMS · Mangi Wingia" : roleLabel}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              System Online
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
              v2.0
            </span>
          </div>
        </div>

        {/* Collapsible Accordion Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-slate-800">
          <AccordionNav links={links} pathname={pathname} />
        </nav>

        {/* User Card & Logout Footer */}
        <div className="border-t border-slate-800/80 bg-slate-950/80 px-4 py-3.5 backdrop-blur-sm">
          {user && (
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-black text-white shadow-sm ring-1 ring-white/20">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-white tracking-tight">
                  {user.name}
                </p>
                <p className="truncate text-[10px] font-bold text-indigo-300/80">
                  {isAdmin
                    ? "🛡️ Administrator"
                    : isAcademicMaster
                      ? "📘 Academic Master"
                      : "👨‍🏫 Subject Teacher"}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout of ShuleHub"
                className="rounded-xl p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
