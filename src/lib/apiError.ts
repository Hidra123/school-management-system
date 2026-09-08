/**
 * Standard error response for unexpected server/database failures.
 * Most commonly this happens when the database schema is out of date
 * (a migration was added in code but `npx drizzle-kit push` was never run
 * against the target database) — so we surface a hint about that instead
 * of returning a bare, unhelpful 500.
 */
export function dbErrorResponse(e: unknown, action = "complete this request"): Response {
  const message = e instanceof Error ? e.message : "Unknown server error";
  return Response.json(
    {
      error: `Failed to ${action}. This usually means the database schema is out of date — run "npx drizzle-kit push" against the database and try again. (${message})`,
    },
    { status: 500 },
  );
}
