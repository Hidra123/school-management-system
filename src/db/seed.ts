/**
 * ShuleHub SMS — database seed.
 *
 * Creates ONLY the admin account (no sample data — the admin adds real data
 * through the admin panel). Safe to re-run: it resets the admin password and
 * re-grants every permission instead of failing on duplicates.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://...?sslmode=require"
 *   npx -y tsx src/db/seed.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { users, userPermissions } from "./schema";
import { hashPassword } from "../lib/hash";
import { ALL_PERMISSIONS } from "../lib/permissions";

const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "Rash@1234";

async function seed() {
  console.log("🌱 Seeding ShuleHub database...");

  const password = hashPassword(ADMIN_PASSWORD);

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, ADMIN_USERNAME))
    .limit(1);

  let adminId: number;

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        name: "Administrator",
        password,
        rawPassword: ADMIN_PASSWORD,
        role: "admin",
        active: true,
        mustChangePassword: false,
      })
      .where(eq(users.id, existing.id))
      .returning();
    adminId = updated.id;
    console.log(`♻️  Admin account refreshed (id: ${adminId})`);
  } else {
    const [created] = await db
      .insert(users)
      .values({
        name: "Administrator",
        username: ADMIN_USERNAME,
        email: "admin@shulehub.com",
        password,
        rawPassword: ADMIN_PASSWORD,
        role: "admin",
        active: true,
        mustChangePassword: false,
      })
      .returning();
    adminId = created.id;
    console.log(`✅ Admin account created (id: ${adminId})`);
  }

  // Grant every permission to the admin (idempotent).
  await db.delete(userPermissions).where(eq(userPermissions.userId, adminId));
  await db
    .insert(userPermissions)
    .values(ALL_PERMISSIONS.map((permission) => ({ userId: adminId, permission })));

  console.log(`🔑 ${ALL_PERMISSIONS.length} permissions granted to admin`);
  console.log("");
  console.log("   Login  ->  Username: Admin");
  console.log("             Password: Rash@1234");
  console.log("");
  console.log("   Default member password: shulehub2025");
  console.log("🎉 Seeding completed. No sample data was inserted.");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
