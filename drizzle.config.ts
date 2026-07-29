import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js loads .env.local on its own; drizzle-kit is a separate process and
// does not, so migrations would otherwise run against an undefined URL.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
