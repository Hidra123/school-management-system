import { sql } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

async function main() {
  console.log("🧹 Clearing old data...");
  await db.execute(
    sql`TRUNCATE TABLE user_permissions, users, attendance, fees, grades, students, subjects, teachers, classes RESTART IDENTITY CASCADE`,
  );

  console.log("🔐 Creating admin user...");
  const encoder = new TextEncoder();
  const data = encoder.encode("admin123" + "shulehub_salt_2025");
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const adminHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await db.insert(users).values({
    name: "System Admin",
    email: "admin@shulehub.com",
    password: adminHash,
    role: "admin",
    active: true,
  });

  console.log("✅ Seed completed!");
  console.log("   Admin: admin@shulehub.com / admin123");
  console.log("   No sample data — admin will add real data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
