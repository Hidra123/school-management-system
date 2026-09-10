"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ADMIN_SIDEBAR, MEMBER_SIDEBAR } from "@/lib/permissions";
import { cls } from "@/lib/utils";

type SidebarLink = { href: string; label: string; icon: string; group: string; badge?: string };

const GROUP_ICONS: Record<string, string> = {
  MAIN: "🏠",
  "STUDENT MANAGEMENT": "👨‍🎓",
  "STAFF MANAGEMENT": "👔",
  PARENTS: "👪",
  "USER CONTROL": "🔐",
  ADMINISTRATION: "⚙️",
  ACADEMIC: "📚",
  MONITORING: "🗓️",
  REPORTS: "📈",
  FINANCE: "💰",
  COMMUNICATION: "💬",
  "MY CLASS": "🏫",
  ACCOUNT: "🔑",
};

function Brand({ role }: { role: string }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-lg text-white shadow-lg shadow-violet-900/40 ring-1 ring-white/20">
        🎓
      </div>
      <div className="leading-tight">
        <p className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-base font-extrabold text-transparent">
          ShuleHub
        </p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-400/80">{role}</p>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== "/" && href !== "/admin" && pathname.startsWith(href)) return true;
  return false;
}

function NavItem({ link, pathname, onNavigate }: { link: SidebarLink; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, link.href);
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cls(
        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-150",
        active
          ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-950/40 ring-1 ring-white/20"
          : "text-slate-300 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <span className={cls("text-[15px] transition-transform group-hover:scale-110", active ? "opacity-100" : "opacity-80")}>
        {link.icon}
      </span>
      <span className="flex-1 whitespace-nowrap">{link.label}</span>
      {link.badge && (
        <span
          className={cls(
            "rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
            link.badge === "NEW" ? "bg-emerald-400/90 text-emerald-950" : "bg-rose-500/90 text-white",
          )}
        >
          {link.badge}
        </span>
      )}
      {active && !link.badge && <span className="h-1.5 w-1.5 rounded-full bg-white/90" />}
    </Link>
  );
}

function GroupSection({
  group,
  items,
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  group: string;
  items: SidebarLink[];
  pathname: string;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const hasActive = items.some((l) => isActive(pathname, l.href));
  return (
    <div className="mt-1.5">
      <button
        onClick={onToggle}
        className={cls(
          "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.04]",
          hasActive && !open && "text-indigo-300",
        )}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[13px] ring-1 ring-white/10">
          {GROUP_ICONS[group] ?? "📁"}
        </span>
        <span
          className={cls(
            "flex-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em]",
            hasActive ? "text-indigo-200" : "text-slate-400",
          )}
        >
          {group}
        </span>
        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-black text-slate-400 ring-1 ring-white/10">
          {items.length}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cls("shrink-0 text-slate-500 transition-transform duration-200", open && "rotate-90")}
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div
        className={cls(
          "grid transition-all duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-[22px] mt-0.5 space-y-0.5 border-l border-white/[0.07] pl-2.5">
            {items.map((l) => (
              <NavItem key={l.href} link={l} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ locked = false }: { locked?: boolean }) {
  const pathname = usePathname();
  const { user, hasPerm, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  const grouped = useMemo(() => {
    const links: SidebarLink[] = locked
      ? [{ href: "/profile", label: "Change Password", icon: "🔑", group: "ACCOUNT", badge: "REQUIRED" }]
      : isAdmin
        ? ADMIN_SIDEBAR.map((l) => ({ ...l, badge: "badge" in l ? l.badge : undefined }))
        : MEMBER_SIDEBAR.filter((l) => hasPerm(l.perm) || l.perm === "profile.edit").map((l) => ({
            href: l.href,
            label: l.label,
            icon: l.icon,
            group: l.group,
          }));

    const groups: { group: string; items: SidebarLink[] }[] = [];
    for (const l of links) {
      const g = groups.find((x) => x.group === l.group);
      if (g) g.items.push(l);
      else groups.push({ group: l.group, items: [l] });
    }
    return groups;
  }, [locked, isAdmin, hasPerm]);

  // Open only the group(s) containing the current page — keeps long menus short.
  const containsActive = useMemo(
    () => grouped.filter((g) => g.items.some((l) => isActive(pathname, l.href))).map((g) => g.group),
    [grouped, pathname],
  );
  const [openKeys, setOpenKeys] = useState<string[] | null>(null);
  const open = new Set(openKeys ?? containsActive);

  const roleLabel = isAdmin ? "Administrator Panel" : "Member Panel";

  return (
    <>
      {/* ---------- Mobile ---------- */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur print:hidden lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand role={roleLabel} />
          <button onClick={logout} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20">
            Logout
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {grouped.flatMap((g) =>
            g.items.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cls(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    active ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow" : "bg-white/5 text-indigo-200 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <span>{l.icon}</span>
                  {l.label}
                </Link>
              );
            }),
          )}
        </nav>
      </header>

      {/* ---------- Desktop ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-950 print:hidden lg:flex">
        {/* top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-600/20 via-violet-600/5 to-transparent" />

        {/* Header */}
        <div className="relative px-5 pb-2 pt-6">
          <Brand role={roleLabel} />
          {isAdmin && (
            <p className="mt-3 flex items-center gap-2 px-1 text-[11px] font-bold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              System Online
            </p>
          )}
        </div>

        {/* Nav */}
        <nav className="relative mt-2 flex-1 overflow-y-auto px-3 pb-4">
          {!locked && openKeys === null && containsActive.length === 0 && grouped.length > 0 ? null : null}
          {grouped.map((g) => (
            <GroupSection
              key={g.group}
              group={g.group}
              items={g.items}
              pathname={pathname}
              open={open.has(g.group)}
              onToggle={() => {
                const next = new Set(open);
                if (next.has(g.group)) next.delete(g.group);
                else next.add(g.group);
                setOpenKeys(Array.from(next));
              }}
            />
          ))}
        </nav>

        {/* User info + logout */}
        <div className="relative border-t border-white/10 px-5 py-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white ring-2 ring-white/10">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{user.name}</p>
                <p className="truncate text-[11px] text-indigo-300/70">{isAdmin ? "🛡️ Admin" : "👤 Member"}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
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
