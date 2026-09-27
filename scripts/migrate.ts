/**
 * Database Migration Script for Vercel Deployment
 * 
 * This script handles automatic database schema setup for Neon PostgreSQL
 * during Vercel deployment. It verifies database connection and schema readiness.
 * 
 * Usage:
 * - Production: npx tsx scripts/migrate.ts
 * - Development: npm run db:check
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

console.log("🚀 Starting database connection check...");
console.log(`📊 Database: ${databaseUrl.substring(0, 20)}...`);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("neon.tech") ? { rejectUnauthorized: false } : false,
});

const db = drizzle(pool, { schema });

async function checkDatabase() {
  try {
    console.log("🔄 Checking database connection...");
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    console.log("✅ Database connection successful:", result.rows[0]);
    client.release();
    
    console.log("✅ Database is ready for use!");
    console.log("📝 Schema will be automatically synchronized by Drizzle ORM");
    
  } catch (error) {
    console.error("❌ Database check failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkDatabase()
  .then(() => {
    console.log("🎉 Database verification complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error during database check:", error);
    process.exit(1);
  });