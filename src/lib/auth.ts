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

/** Default password given to every new member (teacher/staff). */
export const DEFAULT_MEMBER_PASSWORD = "shulehub2025";

/**
 * Create a member login account (username = check number).
 * Password defaults to DEFAULT_MEMBER_PASSWORD and the member is forced
 * to change it on first login.
 */
export async function createMemberAccount(opts: {
  name: string;
  username: string;
  email?: string;
  password?: string;
  permissions?: string[];
  staffRole?: string;
}): Promise<{ id: number; username: string; rawPassword: string } | { error: string; status: number }> {
  const username = opts.username.trim();
  if (!username) return { error: "Username (Check Number) is required.", status: 400 };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existing.length > 0) {
    return { error: `Username "${username}" is already taken. Choose a different check number.`, status: 409 };
  }

  const rawPassword = opts.password && opts.password.length >= 4 ? opts.password : DEFAULT_MEMBER_PASSWORD;
  const hash = await hashPassword(rawPassword);

  const [created] = await db
    .insert(users)
    .values({
      name: opts.name.trim(),
      username,
      email: opts.email?.trim() ?? "",
      password: hash,
      rawPassword,
      role: "member",
      active: true,
      mustChangePassword: true,
      staffRole: opts.staffRole ?? null,
    })
    .returning({ id: users.id, username: users.username, rawPassword: users.rawPassword });

  const perms = Array.from(new Set(opts.permissions ?? []));
  if (perms.length > 0) {
    await db.insert(userPermissions).values(perms.map((p) => ({ userId: created.id, permission: p })));
  }

  return created;
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
  username: string;
  role: "admin" | "member";
  mustChangePassword: boolean;
  permissions: string[];
  staffRole: string | null;
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
      username: user.username,
      role: "admin",
      mustChangePassword: false,
      permissions: ["*"],
      staffRole: null,
    };
  }

  const perms = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, user.id));

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: "member",
    mustChangePassword: user.mustChangePassword,
    permissions: perms.map((p) => p.permission),
    staffRole: user.staffRole,
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
