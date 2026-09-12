import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSessionUser();
  const error = requireAdmin(admin);
  if (error) return error;
  const result = await db.execute(sql`
    SELECT s.id, s.user_id AS "userId", u.name, u.username, u.role, u.staff_role AS "staffRole",
      s.ip_address AS "ipAddress", s.user_agent AS "userAgent", s.created_at AS "createdAt",
      s.last_seen_at AS "lastSeenAt", s.expires_at AS "expiresAt"
    FROM user_sessions s INNER JOIN users u ON u.id = s.user_id
    WHERE s.revoked_at IS NULL AND s.expires_at > NOW()
      AND s.last_seen_at > NOW() - INTERVAL '10 minutes'
    ORDER BY s.last_seen_at DESC
  `);
  return Response.json(result.rows);
}

export async function DELETE(req: Request) {
  const admin = await getSessionUser();
  const error = requireAdmin(admin);
  if (error) return error;
  const body = await req.json().catch(() => null);
  const sessionId = Number(body?.sessionId);
  if (!Number.isInteger(sessionId)) return Response.json({ error: "A valid sessionId is required." }, { status: 400 });
  const result = await db.execute(sql`UPDATE user_sessions SET revoked_at = NOW() WHERE id = ${sessionId} AND revoked_at IS NULL RETURNING id, user_id`);
  if (result.rows.length === 0) return Response.json({ error: "Session not found." }, { status: 404 });
  const userId = (result.rows[0] as { user_id: number }).user_id;
  await db.execute(sql`INSERT INTO audit_logs (actor_user_id, action, target_user_id, details) VALUES (${admin!.id}, 'user.session_revoked', ${userId}, ${JSON.stringify({ sessionId })}::jsonb)`);
  return Response.json({ ok: true });
}
