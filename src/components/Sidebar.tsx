"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { cls } from "@/lib/utils";

const allLinks = [
  { href: "/", label: "Dashboard", icon: "📊", perm: "dashboard" },
  { href: "/students", label: "Students", icon: "👨‍🎓", perm: "students.view" },
  { href: "/teachers", label: "Teachers", icon: "👨‍🏫", perm: "teachers.view" },
  { href: "/classes", label: "Classes", icon: "🏫", perm: "classes.view" },
  { href: "/subjects", label: "Subjects", icon: "📚", perm: "subjects.view" },
  { href: "/attendance", label: "Attendance", icon: "✅", perm: "attendance.view" },
  { href: "/grades", label: "Grades", icon: "📝", perm: "grades.view" },
  { href: "/fees", label: "Fees", icon: "💰", perm: "fees.view" },
];

const adminLinks = [
  { href: "/admin", label: "Admin Panel", icon: "⚙️" },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg text-white shadow-md">
        🎓
      </div>
      <div className="leading-tight">
        <p className="text-base font-extrabold text-white">ShuleHub</p>
        <p className="text-[11px] font-medium text-indigo-300">School Management System</p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPerm, logout } = useAuth();

  // Filter links based on permissions
  const links = allLinks.filter((l) => hasPerm(l.perm));
  const isAdmin = user?.role === "admin";

  return (
    <>
      {/* Mobile */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <button
            onClick={logout}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
          >
            Logout
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {isAdmin && (
            <Link
              href="/admin"
              className={cls(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                pathname.startsWith("/admin")
                  ? "bg-amber-500 text-white"
                  : "bg-white/5 text-amber-300 hover:bg-white/10",
              )}
            >
              ⚙️ Admin
            </Link>
          )}
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cls(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-indigo-500 text-white"
                    : "bg-white/5 text-indigo-200 hover:bg-white/10 hover:text-white",
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
        <div className="px-5 pb-4 pt-6">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {/* Admin link */}
          {isAdmin &&
            adminLinks.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cls(
                    "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                    active
                      ? "bg-amber-500/20 text-amber-300 ring-1 ring-inset ring-amber-400/30"
                      : "text-amber-300/80 hover:bg-white/5 hover:text-amber-200",
                  )}
                >
                  <span className="text-lg">{l.icon}</span>
                  <span>{l.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </Link>
              );
            })}

          {isAdmin && <div className="my-2 border-t border-white/10" />}

          {/* Feature links */}
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cls(
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-indigo-500/20 text-white ring-1 ring-inset ring-indigo-400/30"
                    : "text-indigo-200/80 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className={cls("text-lg transition", active ? "" : "opacity-80 group-hover:opacity-100")}>
                  {l.icon}
                </span>
                <span className="whitespace-nowrap">{l.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />}
              </Link>
            );
          })}
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
                  {user.role === "admin" ? "🛡️ Admin" : "👤 Member"}
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
