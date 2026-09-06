import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { userPermissions, users } from "@/db/schema";
import { createPasswordHash, getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
      email: u.email,
      role: u.role,
      active: u.active,
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
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "admin" ? "admin" : "member";
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];

  if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
  if (!email) return Response.json({ error: "Email is required." }, { status: 400 });
  if (password.length < 4)
    return Response.json({ error: "Password must be at least 4 characters." }, { status: 400 });

  // Check duplicate email
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return Response.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const hash = await createPasswordHash(password);
  const [newUser] = await db
    .insert(users)
    .values({ name, email, password: hash, role })
    .returning();

  // Insert permissions for members
  if (role === "member" && permissions.length > 0) {
    await db.insert(userPermissions).values(
      permissions.map((p: string) => ({ userId: newUser.id, permission: p })),
    );
  }

  return Response.json(
    {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      active: newUser.active,
      permissions: role === "admin" ? ["*"] : permissions,
      createdAt: newUser.createdAt,
    },
    { status: 201 },
  );
}
