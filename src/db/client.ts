import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { databaseUrl } from "@/db/env";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as {
  projectZPool?: pg.Pool;
};

export const pool =
  globalForDb.projectZPool ??
  new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.projectZPool = pool;
}

export const db = drizzle(pool, { schema });

export type DbClient = typeof db;
