import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// The WebSocket driver (not neon-http) because it is the only one that gives us
// real transactions — importing a goal writes to three tables and must not be
// able to land half-done. See drizzle-orm/neon-http/session.js, which throws
// "No transactions support in neon-http driver".
neonConfig.webSocketConstructor = ws;

// Deliberately no throw when DATABASE_URL is missing, and deliberately not
// wrapped in a lazy proxy: `next build` imports this module to trace routes, and
// @auth/drizzle-adapter inspects the real instance to pick its dialect — a proxy
// makes it fail with "Unsupported database type (object)". The pool does not
// dial out until the first query, so an absent URL surfaces then, at runtime,
// rather than breaking the build.
const globalForDb = globalThis as unknown as { pool?: Pool };
const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

// Next.js re-evaluates modules on every hot reload in dev; without this the pool
// leaks a connection per edit until Neon starts refusing them.
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
