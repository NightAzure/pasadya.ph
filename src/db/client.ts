import dns from "node:dns";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { databaseUrl } from "@/db/env";
import * as schema from "@/db/schema";

// Prefer A records when both exist. Supabase direct hosts are often IPv6-only
// on free tier — use the Session pooler URL (port 5432 via *.pooler.supabase.com)
// if you still see ENETUNREACH on IPv6.
dns.setDefaultResultOrder("ipv4first");

const globalForDb = globalThis as unknown as {
  projectZPool?: pg.Pool;
};

export const pool =
  globalForDb.projectZPool ??
  new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.projectZPool = pool;
}

export const db = drizzle(pool, { schema });

export type DbClient = typeof db;
