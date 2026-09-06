import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPermissions, users } from "@/db/schema";
import { createPasswordHash, getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const values: Partial<typeof users.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) values.name = body.name.trim();
  if (typeof body.email === "string" && body.email.trim())
    values.email = body.email.trim().toLowerCase();
  if (typeof body.password === "string" && body.password.length >= 4)
    values.password = await createPasswordHash(body.password);
  if (body.role === "admin" || body.role === "member") values.role = body.role;
  if (typeof body.active === "boolean") values.active = body.active;

  if (Object.keys(values).length > 0) {
    const [updated] = await db.update(users).set(values).where(eq(users.id, num)).returning();
    if (!updated) return Response.json({ error: "User not found." }, { status: 404 });
  }

  // Update permissions if provided
  if (Array.isArray(body.permissions)) {
    await db.delete(userPermissions).where(eq(userPermissions.userId, num));
    if (body.permissions.length > 0) {
      await db.insert(userPermissions).values(
        body.permissions.map((p: string) => ({ userId: num, permission: p })),
      );
    }
  }

  // Fetch updated user
  const [u] = await db.select().from(users).where(eq(users.id, num));
  const perms = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, num));

  return Response.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    permissions: u.role === "admin" ? ["*"] : perms.map((p) => p.permission),
    createdAt: u.createdAt,
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  // Prevent deleting yourself
  if (user!.id === num) {
    return Response.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, num));
  return Response.json({ ok: true });
}
