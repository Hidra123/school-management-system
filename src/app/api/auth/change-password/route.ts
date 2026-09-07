import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createPasswordHash, getSessionUserId, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword || !newPassword) {
    return Response.json({ error: "Current and new password are required." }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return Response.json({ error: "New password must be at least 6 characters." }, { status: 400 });
  }
  if (confirmPassword && newPassword !== confirmPassword) {
    return Response.json({ error: "New password and confirmation do not match." }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return Response.json({ error: "New password must be different from the current password." }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.active) return Response.json({ error: "Account not found." }, { status: 404 });

  const ok = await verifyPassword(currentPassword, user.password);
  if (!ok) return Response.json({ error: "Current password is incorrect." }, { status: 400 });

  await db
    .update(users)
    .set({
      password: await createPasswordHash(newPassword),
      // Admin can still see/remind the member of their password
      rawPassword: newPassword,
      mustChangePassword: false,
    })
    .where(eq(users.id, userId));

  return Response.json({ ok: true });
}
