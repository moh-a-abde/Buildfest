/**
 * Run migration 006 to create nutrition_data and price_estimates tables.
 *
 * Usage: npx tsx scripts/migrate.ts
 *
 * Requires DATABASE_URL in .env.local (Supabase direct connection string).
 * Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)
 *
 * If DATABASE_URL is not set, this script prints the SQL to run manually
 * in Supabase Dashboard → SQL Editor.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";

const { Client } = pg;

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env.local may not exist
  }
}

loadEnv();

const migrationSql = readFileSync(
  resolve(__dirname, "..", "supabase", "migrations", "006_nutrition_and_price_tables.sql"),
  "utf-8",
);

const dbUrl = process.env.DATABASE_URL;

async function run() {
  if (!dbUrl) {
    console.error("DATABASE_URL is not set in .env.local\n");
    console.error("Add your Supabase direct connection string:");
    console.error("  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres\n");
    console.error("Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)\n");
    console.error("Alternatively, run this SQL manually in Supabase Dashboard → SQL Editor:\n");
    console.error("---");
    console.error(migrationSql);
    console.error("---");
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    await client.query(migrationSql);
    console.log("Migration 006 applied successfully.");
    console.log("Tables created: nutrition_data, price_estimates");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
