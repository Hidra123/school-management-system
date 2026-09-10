import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.username || !body?.password) {
      return Response.json({ error: "Username and password are required." }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username.trim()))
      .limit(1);

    if (!user) {
      return Response.json({ error: "Invalid username or password." }, { status: 401 });
    }

    if (!user.active) {
      return Response.json({ error: "Your account has been deactivated. Contact the admin." }, { status: 403 });
    }

    const valid = await verifyPassword(body.password, user.password);
    if (!valid) {
      return Response.json({ error: "Invalid username or password." }, { status: 401 });
    }

    // Monitor Dashboards global lock blocks every member sign-in (admin still works).
    if (user.role === "member") {
      const { systemLockState } = await import("@/lib/approvals");
      const lock = await systemLockState();
      if (lock.locked) {
        return Response.json(
          { error: lock.message.trim() || "Accounts are temporarily locked by the Administrator." },
          { status: 403 },
        );
      }
    }

    await createSession(user.id);

    return Response.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
