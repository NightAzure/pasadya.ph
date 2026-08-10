import { sql } from "drizzle-orm";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { db, pool } from "@/db/client";

const migrationsDir = path.join(process.cwd(), "src", "db", "migrations");

async function ensureMigrationTable() {
  await db.execute(sql`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function appliedMigrations() {
  const result = await db.execute<{ filename: string }>(sql`
    select filename from schema_migrations
  `);

  return new Set(result.rows.map((row) => row.filename));
}

async function run() {
  await ensureMigrationTable();
  const applied = await appliedMigrations();
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping ${file}`);
      continue;
    }

    const sqlText = await readFile(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();

    try {
      await client.query("begin");
      // Supabase PostGIS lives in `extensions`; local Docker usually uses `public`.
      await client.query("set local search_path to public, extensions");
      await client.query(sqlText);
      await client.query(
        "insert into schema_migrations (filename) values ($1)",
        [file],
      );
      await client.query("commit");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
