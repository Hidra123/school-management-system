import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "../db";
import { users, userPermissions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, DEFAULT_MEMBER_PASSWORD } from "./hash";

export { hashPassword, DEFAULT_MEMBER_PASSWORD };

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = hashPassword(password);
  return hashedPassword === hash;
}

// Session management
const SESSION_COOKIE = "shulehub_session";

interface Session {
  userId: number;
  username: string;
  role: string;
  name: string;
  mustChangePassword: boolean;
}

// Create session
export function createSession(user: {
  id: number;
  username: string;
  role: string;
  name: string;
  mustChangePassword: boolean;
}): string {
  const session: Session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    mustChangePassword: user.mustChangePassword,
  };
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

// Parse session
export function parseSession(cookieValue: string | undefined): Session | null {
  if (!cookieValue) return null;
  try {
    const decoded = Buffer.from(cookieValue, "base64").toString("utf-8");
    return JSON.parse(decoded) as Session;
  } catch {
    return null;
  }
}

// Get current session from cookies (server component)
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    return parseSession(sessionCookie?.value);
  } catch {
    return null;
  }
}

// Get current user from session
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user;
}

// Check if user has permission
export async function hasPermission(userId: number, permission: string): Promise<boolean> {
  const [result] = await db
    .select()
    .from(userPermissions)
    .where(and(
      eq(userPermissions.userId, userId),
      eq(userPermissions.permission, permission)
    ))
    .limit(1);

  return !!result;
}

// Get all permissions for a user
export async function getUserPermissions(userId: number): Promise<string[]> {
  const permissions = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  return permissions.map((p) => p.permission);
}

// Check if user is admin
export async function isAdmin(userId: number): Promise<boolean> {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.role === "admin";
}

// Logout - clear session cookie
export function logout(): NextResponse {
  const response = NextResponse.redirect("/login");
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

// Get session from request (for API routes)
export function getSessionFromRequest(request: Request): Session | null {
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").reduce((acc: Record<string, string>, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {});

    return parseSession(cookies[SESSION_COOKIE]);
  } catch {
    return null;
  }
}
