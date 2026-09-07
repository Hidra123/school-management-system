import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url,
    // Neon requires TLS; local postgres does not.
    ssl:
      url.includes("127.0.0.1") || url.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
  },
  verbose: true,
  strict: false,
});
