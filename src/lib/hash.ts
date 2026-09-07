import { createHash } from "crypto";

/**
 * Pure password helpers.
 *
 * Kept in their own module (no `next/headers` import) so that plain Node
 * scripts such as `src/db/seed.ts` can reuse them via `tsx` without pulling
 * the whole Next.js runtime in.
 */

// Hash a password using SHA-256
export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Compare a plaintext password against a stored hash
export function comparePassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Default password handed out to every new member (must be changed on login)
export const DEFAULT_MEMBER_PASSWORD = "shulehub2025";
