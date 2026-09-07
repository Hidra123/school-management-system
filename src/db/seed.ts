/**
 * Seed script — creates/repairs the Admin account only (no sample data).
 *
 *   npx tsx src/db/seed.ts            → ensure Admin exists (keeps all other data)
 *   npx tsx src/db/seed.ts --reset    → wipe ALL data, then create Admin
 *
 * Reads DATABASE_URL from the environment or from .env
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./index";
import { users } from "./schema";

const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "Rash@1234";

async function hash(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw + "shulehub_salt_2025");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function main() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    console.log("🧹 Clearing ALL data...");
    await db.execute(
      sql`TRUNCATE TABLE user_permissions, users, attendance, fees, grades, students, subjects, teachers, classes RESTART IDENTITY CASCADE`,
    );
  }

  const adminHash = await hash(ADMIN_PASSWORD);
  const [existing] = await db.select().from(users).where(eq(users.username, ADMIN_USERNAME)).limit(1);

  if (existing) {
    console.log("🔐 Admin exists — resetting password & ensuring admin role...");
    await db
      .update(users)
      .set({ password: adminHash, role: "admin", active: true, mustChangePassword: false })
      .where(eq(users.id, existing.id));
  } else {
    console.log("🔐 Creating admin user...");
    await db.insert(users).values({
      name: "System Administrator",
      username: ADMIN_USERNAME,
      email: "",
      password: adminHash,
      rawPassword: "",
      role: "admin",
      active: true,
      mustChangePassword: false,
    });
  }

  console.log("✅ Seed completed!");
  console.log(`   Admin username: ${ADMIN_USERNAME}`);
  console.log(`   Admin password: ${ADMIN_PASSWORD}`);
  console.log("   Default member password: shulehub2025 (must be changed on first login)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
