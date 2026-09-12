import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getSessionUser();
  const error = requireAdmin(admin);
  if (error) return error;

  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 100);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 100;

  const result = await db.execute(sql`
    SELECT
      a.id,
      a.action,
      a.details,
      a.ip_address AS "ipAddress",
      a.created_at AS "createdAt",
      actor.name AS "actorName",
      actor.username AS "actorUsername",
      target.name AS "targetName",
      target.username AS "targetUsername"
    FROM audit_logs a
    LEFT JOIN users actor ON actor.id = a.actor_user_id
    LEFT JOIN users target ON target.id = a.target_user_id
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `);

  return Response.json(result.rows);
}
