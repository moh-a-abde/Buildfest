/**
 * Seed script for nutrition_data and price_estimates tables.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local,
 * validates seed arrays, then upserts into Supabase.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NUTRITION_SEED_DATA, PRICE_ESTIMATE_SEED_DATA } from "../src/lib/seed-data";

// ── Load env vars from .env.local ──

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
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
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ── Validation ──

interface ValidationError {
  index: number;
  food: string;
  issue: string;
}

function validate(): ValidationError[] {
  const errors: ValidationError[] = [];
  const nutritionNames = new Set<string>();
  const priceNames = new Set<string>();

  for (let i = 0; i < NUTRITION_SEED_DATA.length; i++) {
    const row = NUTRITION_SEED_DATA[i];
    const key = row.food_name.toLowerCase();

    if (nutritionNames.has(key)) {
      errors.push({ index: i, food: row.food_name, issue: "Duplicate food_name in nutrition data" });
    }
    nutritionNames.add(key);

    if (row.calories_per_100g < 0) {
      errors.push({ index: i, food: row.food_name, issue: `calories_per_100g is negative: ${row.calories_per_100g}` });
    }
    if (row.protein_per_100g < 0) {
      errors.push({ index: i, food: row.food_name, issue: `protein_per_100g is negative: ${row.protein_per_100g}` });
    }
    if (row.fiber_per_100g < 0) {
      errors.push({ index: i, food: row.food_name, issue: `fiber_per_100g is negative: ${row.fiber_per_100g}` });
    }
    if (row.sodium_per_100g < 0) {
      errors.push({ index: i, food: row.food_name, issue: `sodium_per_100g is negative: ${row.sodium_per_100g}` });
    }
    if (!row.food_name.trim()) {
      errors.push({ index: i, food: row.food_name, issue: "Empty food_name" });
    }
    if (!row.category.trim()) {
      errors.push({ index: i, food: row.food_name, issue: "Empty category" });
    }
  }

  for (let i = 0; i < PRICE_ESTIMATE_SEED_DATA.length; i++) {
    const row = PRICE_ESTIMATE_SEED_DATA[i];
    const key = row.food_name.toLowerCase();

    if (priceNames.has(key)) {
      errors.push({ index: i, food: row.food_name, issue: "Duplicate food_name in price data" });
    }
    priceNames.add(key);

    if (row.price_per_100g < 0.01 || row.price_per_100g > 50.0) {
      errors.push({ index: i, food: row.food_name, issue: `price_per_100g out of range: $${row.price_per_100g}` });
    }
  }

  // Cross-check: every nutrition entry must have a price entry
  for (const name of nutritionNames) {
    if (!priceNames.has(name)) {
      errors.push({ index: -1, food: name, issue: "Nutrition entry has no matching price entry" });
    }
  }
  for (const name of priceNames) {
    if (!nutritionNames.has(name)) {
      errors.push({ index: -1, food: name, issue: "Price entry has no matching nutrition entry" });
    }
  }

  return errors;
}

// ── Seeding ──

async function seed() {
  console.log("Validating seed data...");
  const errors = validate();

  if (errors.length > 0) {
    console.error(`\nFound ${errors.length} validation error(s):`);
    for (const e of errors) {
      console.error(`  [${e.index}] ${e.food}: ${e.issue}`);
    }
    process.exit(1);
  }

  console.log(`  ${NUTRITION_SEED_DATA.length} nutrition entries OK`);
  console.log(`  ${PRICE_ESTIMATE_SEED_DATA.length} price entries OK`);

  // Upsert nutrition data in batches
  console.log("\nUpserting nutrition_data...");
  const { data: nutritionResult, error: nutritionError } = await supabase
    .from("nutrition_data")
    .upsert(
      NUTRITION_SEED_DATA.map((row) => ({
        food_name: row.food_name,
        category: row.category,
        calories_per_100g: row.calories_per_100g,
        protein_per_100g: row.protein_per_100g,
        fiber_per_100g: row.fiber_per_100g,
        sodium_per_100g: row.sodium_per_100g,
        serving_size_g: row.serving_size_g,
        usda_ndb_no: row.usda_ndb_no,
      })),
      { onConflict: "food_name", ignoreDuplicates: false },
    );

  if (nutritionError) {
    console.error("  Failed to upsert nutrition_data:", nutritionError.message);
    process.exit(1);
  }
  console.log(`  Upserted ${NUTRITION_SEED_DATA.length} nutrition rows`);

  // Upsert price data
  console.log("\nUpserting price_estimates...");
  const { data: priceResult, error: priceError } = await supabase
    .from("price_estimates")
    .upsert(
      PRICE_ESTIMATE_SEED_DATA.map((row) => ({
        food_name: row.food_name,
        price_per_100g: row.price_per_100g,
        unit: row.unit,
        source: row.source,
        zip_code: row.zip_code,
      })),
      { onConflict: "food_name", ignoreDuplicates: false },
    );

  if (priceError) {
    console.error("  Failed to upsert price_estimates:", priceError.message);
    process.exit(1);
  }
  console.log(`  Upserted ${PRICE_ESTIMATE_SEED_DATA.length} price rows`);

  // Summary
  const categories = new Set(NUTRITION_SEED_DATA.map((r) => r.category));
  console.log("\n── Summary ──");
  console.log(`  Total foods: ${NUTRITION_SEED_DATA.length}`);
  console.log(`  Categories: ${[...categories].sort().join(", ")}`);
  console.log(`  Price source: ${PRICE_ESTIMATE_SEED_DATA[0]?.source}`);
  console.log("  Done!");
}

seed().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
