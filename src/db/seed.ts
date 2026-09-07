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
  const data = encoder.encode("Rash@1234" + "shulehub_salt_2025");
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const adminHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await db.insert(users).values({
    name: "System Administrator",
    username: "Admin",
    email: "",
    password: adminHash,
    rawPassword: "",
    role: "admin",
    active: true,
    mustChangePassword: false,
  });

  console.log("✅ Seed completed!");
  console.log("   Admin username: Admin");
  console.log("   Admin password: Rash@1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
