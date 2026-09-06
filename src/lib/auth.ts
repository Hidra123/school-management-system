import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPermissions, users } from "@/db/schema";
import type { PermissionKey } from "./permissions";

// Simple password hashing (no bcrypt needed — uses Web Crypto)
async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw + "shulehub_salt_2025");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(pw: string, hashed: string): Promise<boolean> {
  const check = await hashPassword(pw);
  return check === hashed;
}

export async function createPasswordHash(pw: string): Promise<string> {
  return hashPassword(pw);
}

// Session: simple signed cookie with user ID
const SESSION_NAME = "shulehub_session";
const SECRET = process.env.SESSION_SECRET ?? "shulehub_default_secret_key_2025";

function sign(val: string): string {
  // Simple HMAC-like signing using string concat (sufficient for this use case)
  const encoder = new TextEncoder();
  const data = encoder.encode(val + SECRET);
  let hash = 0;
  for (const byte of data) {
    hash = ((hash << 5) - hash + byte) | 0;
  }
  return `${val}.${hash.toString(36)}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const val = signed.slice(0, idx);
  if (sign(val) === signed) return val;
  return null;
}

export async function createSession(userId: number): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_NAME, sign(String(userId)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_NAME);
}

export async function getSessionUserId(): Promise<number | null> {
  const jar = await cookies();
  const cookie = jar.get(SESSION_NAME);
  if (!cookie?.value) return null;
  const val = unsign(cookie.value);
  if (!val) return null;
  const id = Number(val);
  return Number.isFinite(id) ? id : null;
}

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member";
  permissions: string[];
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.active) return null;

  if (user.role === "admin") {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "admin",
      permissions: ["*"], // Admin has all permissions
    };
  }

  const perms = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, user.id));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "member",
    permissions: perms.map((p) => p.permission),
  };
}

export function hasPermission(user: SessionUser | null, perm: PermissionKey): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions.includes(perm);
}

export function requireAuth(user: SessionUser | null): Response | null {
  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }
  return null;
}

export function requirePermission(user: SessionUser | null, perm: PermissionKey): Response | null {
  const authErr = requireAuth(user);
  if (authErr) return authErr;
  if (!hasPermission(user!, perm)) {
    return Response.json({ error: "You do not have permission for this action." }, { status: 403 });
  }
  return null;
}

export function requireAdmin(user: SessionUser | null): Response | null {
  const authErr = requireAuth(user);
  if (authErr) return authErr;
  if (user!.role !== "admin") {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }
  return null;
}
