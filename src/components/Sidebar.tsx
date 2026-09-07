"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { ADMIN_SIDEBAR, MEMBER_SIDEBAR, filterSidebarItems, hasAnyPermission, ROLE_PRESETS, ASSIGNMENT_ROLES } from "../lib/permissions";
import { useState, useEffect } from "react";

interface SidebarItem {
  label: string;
  href: string;
  icon: string;
  permission: string;
}

interface SidebarGroup {
  group: string;
  items: SidebarItem[];
}

export function Sidebar() {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Fetch user permissions
  useEffect(() => {
    async function fetchPermissions() {
      if (user?.id) {
        try {
          const response = await fetch(`/api/auth/permissions?userId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            setUserPermissions(data.permissions);
          }
        } catch {
          // Fallback to role-based permissions
          if (user.role && ROLE_PRESETS[user.role]) {
            setUserPermissions(ROLE_PRESETS[user.role]);
          }
        }
      }
    }

    fetchPermissions();
  }, [user?.id, user?.role]);

  // Get sidebar items based on role
  const getSidebarItems = (): SidebarGroup[] => {
    if (isAdmin) {
      return ADMIN_SIDEBAR;
    }

    // Filter member sidebar based on permissions
    return filterSidebarItems(MEMBER_SIDEBAR, userPermissions);
  };

  const sidebarItems = getSidebarItems();

  // Check if item is active
  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <aside className="w-64 bg-white shadow-md min-h-screen">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-blue-600">ShuleHub SMS</h1>
        <p className="text-sm text-gray-500">School Management System</p>
      </div>

      <nav className="p-4">
        {sidebarItems.map((group, index) => (
          <div key={index} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {group.group}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Logged in as:</p>
          <p className="font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-400">{user?.role}</p>
        </div>
      </div>
    </aside>
  );
}
