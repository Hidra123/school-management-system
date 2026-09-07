import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { userPermissions, users } from "@/db/schema";
import { createPasswordHash, getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_PASSWORD = "shulehub2025";

export async function GET() {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const all = await db.select().from(users).orderBy(asc(users.name));
  const perms = await db.select().from(userPermissions);

  const permMap = new Map<number, string[]>();
  for (const p of perms) {
    if (!permMap.has(p.userId)) permMap.set(p.userId, []);
    permMap.get(p.userId)!.push(p.permission);
  }

  return Response.json(
    all.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      active: u.active,
      rawPassword: u.rawPassword,
      mustChangePassword: u.mustChangePassword,
      permissions: u.role === "admin" ? ["*"] : (permMap.get(u.id) ?? []),
      createdAt: u.createdAt,
    })),
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" && body.password.length >= 4 ? body.password : DEFAULT_PASSWORD;
  const role = body.role === "admin" ? "admin" : "member";
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];

  if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
  if (!username) return Response.json({ error: "Username (Check Number) is required." }, { status: 400 });

  // Check duplicate username
  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing.length > 0) {
    return Response.json({ error: "A user with this username already exists." }, { status: 409 });
  }

  const hash = await createPasswordHash(password);
  const [newUser] = await db
    .insert(users)
    .values({
      name,
      username,
      email,
      password: hash,
      rawPassword: password,
      role,
      mustChangePassword: role !== "admin",
    })
    .returning();

  if (role === "member" && permissions.length > 0) {
    await db.insert(userPermissions).values(
      permissions.map((p: string) => ({ userId: newUser.id, permission: p })),
    );
  }

  return Response.json(
    {
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      active: newUser.active,
      rawPassword: newUser.rawPassword,
      mustChangePassword: newUser.mustChangePassword,
      permissions: role === "admin" ? ["*"] : permissions,
      createdAt: newUser.createdAt,
    },
    { status: 201 },
  );
}
