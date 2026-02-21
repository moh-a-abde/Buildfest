import { createServerSupabaseClient } from "./supabase";
import type { NutritionDataRow, PriceEstimateRow } from "./types";

function getClient() {
  return createServerSupabaseClient();
}

/**
 * Look up a single food's nutrition data by case-insensitive name.
 * Returns null if no match is found.
 */
export async function lookupNutrition(
  foodName: string,
): Promise<NutritionDataRow | null> {
  const { data, error } = await getClient()
    .from("nutrition_data")
    .select("*")
    .ilike("food_name", foodName)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as NutritionDataRow;
}

/**
 * Look up a single food's price estimate by case-insensitive name.
 * Returns null if no match is found.
 */
export async function lookupPrice(
  foodName: string,
): Promise<PriceEstimateRow | null> {
  const { data, error } = await getClient()
    .from("price_estimates")
    .select("*")
    .ilike("food_name", foodName)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as PriceEstimateRow;
}

/**
 * Fuzzy price lookup: try exact ilike first, then partial match.
 * For example, "chicken breast" will match "Chicken breast, boneless, skinless, raw".
 * Falls back to checking if the query is contained in a food_name or vice versa.
 */
export async function lookupPriceFuzzy(
  foodName: string,
): Promise<PriceEstimateRow | null> {
  const exact = await lookupPrice(foodName);
  if (exact) return exact;

  const client = getClient();

  const { data: partialMatches } = await client
    .from("price_estimates")
    .select("*")
    .ilike("food_name", `%${foodName}%`)
    .limit(5);

  if (partialMatches && partialMatches.length > 0) {
    const lower = foodName.toLowerCase();
    const best = partialMatches.reduce(
      (prev, curr) => {
        const prevName = (prev as PriceEstimateRow).food_name.toLowerCase();
        const currName = (curr as PriceEstimateRow).food_name.toLowerCase();
        const prevLen = Math.abs(prevName.length - lower.length);
        const currLen = Math.abs(currName.length - lower.length);
        return currLen < prevLen ? curr : prev;
      },
    );
    return best as PriceEstimateRow;
  }

  const words = foodName.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (words.length > 1) {
    const primary = words[0];
    const { data: wordMatches } = await client
      .from("price_estimates")
      .select("*")
      .ilike("food_name", `%${primary}%`)
      .limit(10);

    if (wordMatches && wordMatches.length > 0) {
      const scored = wordMatches.map((row) => {
        const name = (row as PriceEstimateRow).food_name.toLowerCase();
        const matchCount = words.filter((w) => name.includes(w)).length;
        return { row: row as PriceEstimateRow, matchCount };
      });
      scored.sort((a, b) => b.matchCount - a.matchCount);
      if (scored[0].matchCount > 0) {
        return scored[0].row;
      }
    }
  }

  return null;
}

export interface FoodLookupResult {
  food_name: string;
  nutrition: NutritionDataRow | null;
  price: PriceEstimateRow | null;
}

/**
 * Batch lookup: fetch nutrition + price for multiple food names in two queries.
 * Matches are case-insensitive. Unmatched items have null for the missing field.
 */
export async function lookupBatch(
  foodNames: string[],
): Promise<FoodLookupResult[]> {
  if (foodNames.length === 0) return [];

  const client = getClient();
  const lower = foodNames.map((n) => n.toLowerCase());

  const [nutritionRes, priceRes] = await Promise.all([
    client
      .from("nutrition_data")
      .select("*")
      .in("food_name", foodNames),
    client
      .from("price_estimates")
      .select("*")
      .in("food_name", foodNames),
  ]);

  const nutritionByName = new Map<string, NutritionDataRow>();
  if (nutritionRes.data) {
    for (const row of nutritionRes.data) {
      nutritionByName.set((row as NutritionDataRow).food_name.toLowerCase(), row as NutritionDataRow);
    }
  }

  const priceByName = new Map<string, PriceEstimateRow>();
  if (priceRes.data) {
    for (const row of priceRes.data) {
      priceByName.set((row as PriceEstimateRow).food_name.toLowerCase(), row as PriceEstimateRow);
    }
  }

  return foodNames.map((name, i) => ({
    food_name: name,
    nutrition: nutritionByName.get(lower[i]) ?? null,
    price: priceByName.get(lower[i]) ?? null,
  }));
}
