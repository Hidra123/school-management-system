import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.trim().toLowerCase()))
    .limit(1);

  if (!user) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!user.active) {
    return Response.json({ error: "Your account has been deactivated. Contact the admin." }, { status: 403 });
  }

  const valid = await verifyPassword(body.password, user.password);
  if (!valid) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id);

  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}
