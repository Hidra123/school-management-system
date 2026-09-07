import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { teachers, users } from "@/db/schema";
import {
  DEFAULT_MEMBER_PASSWORD,
  createMemberAccount,
  createPasswordHash,
  getSessionUser,
  requireAdmin,
} from "@/lib/auth";
import { ROLE_PRESETS } from "@/lib/permissions";
import { teacherSelect } from "@/lib/teachers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadTeacher(id: number) {
  const [row] = await db
    .select(teacherSelect())
    .from(teachers)
    .leftJoin(users, eq(teachers.userId, users.id))
    .where(eq(teachers.id, id))
    .limit(1);
  return row ? { ...row, hasAccount: row.userId !== null } : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });
  const row = await loadTeacher(num);
  if (!row) return Response.json({ error: "Teacher not found." }, { status: 404 });
  return Response.json(row);
}

export async function PUT(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const [existing] = await db.select().from(teachers).where(eq(teachers.id, num)).limit(1);
  if (!existing) return Response.json({ error: "Teacher not found." }, { status: 404 });

  // ----- Teacher profile fields -----
  const values: Partial<typeof teachers.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) values.name = body.name.trim();
  if (typeof body.email === "string") values.email = body.email.trim();
  if (typeof body.phone === "string") values.phone = body.phone.trim();
  if (typeof body.subject === "string") values.subject = body.subject.trim();
  if (typeof body.qualification === "string") values.qualification = body.qualification.trim();
  if (body.hireDate !== undefined)
    values.hireDate = typeof body.hireDate === "string" && body.hireDate ? body.hireDate : null;

  const username = typeof body.username === "string" ? body.username.trim() : "";

  // ----- Linked login account -----
  let userId = existing.userId;
  if (userId) {
    const userValues: Partial<typeof users.$inferInsert> = {};
    if (values.name) userValues.name = values.name;
    if (values.email !== undefined) userValues.email = values.email;
    if (username) {
      const clash = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, username), ne(users.id, userId)))
        .limit(1);
      if (clash.length > 0) {
        return Response.json({ error: `Username "${username}" is already taken.` }, { status: 409 });
      }
      userValues.username = username;
    }
    if (body.resetPassword === true) {
      userValues.password = await createPasswordHash(DEFAULT_MEMBER_PASSWORD);
      userValues.rawPassword = DEFAULT_MEMBER_PASSWORD;
      userValues.mustChangePassword = true;
    } else if (typeof body.password === "string" && body.password.length >= 4) {
      userValues.password = await createPasswordHash(body.password);
      userValues.rawPassword = body.password;
      userValues.mustChangePassword = true;
    }
    if (typeof body.accountActive === "boolean") userValues.active = body.accountActive;
    if (Object.keys(userValues).length > 0) {
      await db.update(users).set(userValues).where(eq(users.id, userId));
    }
  } else if (username) {
    // Legacy teacher without an account → create one now
    const account = await createMemberAccount({
      name: values.name ?? existing.name,
      username,
      email: values.email ?? existing.email,
      permissions: [...ROLE_PRESETS.teacher.permissions],
    });
    if ("error" in account) return Response.json({ error: account.error }, { status: account.status });
    userId = account.id;
    values.userId = userId;
  }

  if (Object.keys(values).length > 0) {
    await db.update(teachers).set(values).where(eq(teachers.id, num));
  }

  const row = await loadTeacher(num);
  return Response.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const [existing] = await db.select().from(teachers).where(eq(teachers.id, num)).limit(1);
  if (!existing) return Response.json({ ok: true });

  await db.delete(teachers).where(eq(teachers.id, num));
  // Remove the linked login account as well
  if (existing.userId) {
    await db.delete(users).where(eq(users.id, existing.userId));
  }
  return Response.json({ ok: true });
}
