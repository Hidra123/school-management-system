"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cls } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/students", label: "Students", icon: "👨‍🎓" },
  { href: "/teachers", label: "Teachers", icon: "👨‍🏫" },
  { href: "/classes", label: "Classes", icon: "🏫" },
  { href: "/subjects", label: "Subjects", icon: "📚" },
  { href: "/attendance", label: "Attendance", icon: "✅" },
  { href: "/grades", label: "Grades", icon: "📝" },
  { href: "/fees", label: "Fees", icon: "💰" },
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

function NavItems({ pathname }: { pathname: string }) {
  return (
    <>
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
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile header + nav */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
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

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-950 lg:flex">
        <div className="px-5 pb-4 pt-6">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <NavItems pathname={pathname} />
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs text-indigo-300/70">ShuleHub SMS v1.0</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Built with Next.js + PostgreSQL</p>
        </div>
      </aside>
    </>
  );
}
