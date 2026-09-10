import { dbErrorResponse } from "@/lib/apiError";
import { decideApproval, listApprovals } from "@/lib/approvals";
import { getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  try {
    return Response.json(await listApprovals());
  } catch (e) {
    return dbErrorResponse(e, "load approvals");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const id = Number(body.id);
  const action = body.action === "reject" ? "reject" : "approve";
  const note = typeof body.note === "string" ? body.note : "";
  if (!Number.isInteger(id)) return Response.json({ error: "Invalid approval id." }, { status: 400 });

  try {
    const result = await decideApproval(id, action, note);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true });
  } catch (e) {
    return dbErrorResponse(e, "decide the approval");
  }
}
