import { lookupPriceFuzzy, upsertPriceSource, type PriceFilter } from "./nutrition-lookup";
import { lookupKrogerPrice, isKrogerConfigured } from "./grocery-apis/kroger";
import type { GeneratePlanToolOutput } from "@/app/ai/tools";

export interface PricingContext {
  source?: "kroger" | "static";
  storeId?: string;
  zipCode?: string;
}

const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  lb: 453.59,
  lbs: 453.59,
  pound: 453.59,
  pounds: 453.59,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  cups: 240,
  cup: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  items: 100,
  item: 100,
  each: 100,
  piece: 100,
  pieces: 100,
  slice: 30,
  slices: 30,
  ml: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
};

function toGrams(quantity: number, unit: string): number {
  const factor = UNIT_TO_GRAMS[unit.toLowerCase().trim()] ?? 100;
  return quantity * factor;
}

/**
 * Multi-source price resolution: Kroger -> price_sources DB -> price_estimates.
 * Returns { price_per_100g, source } or null if nothing found.
 */
export async function resolvePrice(
  name: string,
  pricing?: PricingContext,
): Promise<{ price_per_100g: number; source: string } | null> {
  // 1. Try Kroger live API if configured and requested
  if (
    pricing?.source === "kroger" &&
    pricing.storeId &&
    isKrogerConfigured()
  ) {
    try {
      const kroger = await lookupKrogerPrice(name, pricing.storeId);
      if (kroger) {
        // Persist to price_sources for future lookups
        upsertPriceSource({
          food_name: name,
          price_per_100g: kroger.price_per_100g,
          source: "kroger",
          store_chain: "kroger",
          store_id: pricing.storeId,
          zip_code: pricing.zipCode,
        }).catch(() => {}); // fire-and-forget
        return { price_per_100g: kroger.price_per_100g, source: "kroger" };
      }
    } catch {
      // fall through to DB lookup
    }
  }

  // 2. Try price_sources / price_estimates with optional filters
  const filter: PriceFilter | undefined = pricing?.zipCode
    ? { zipCode: pricing.zipCode, storeChain: pricing.source === "kroger" ? "kroger" : undefined }
    : undefined;

  const dbHit = await lookupPriceFuzzy(name, filter);
  if (dbHit) {
    return { price_per_100g: dbHit.price_per_100g, source: dbHit.source };
  }

  return null;
}

/**
 * Estimate cost for a single ingredient.
 * Returns 0 if no price match is found.
 */
export async function calculateIngredientCost(
  name: string,
  quantity: number,
  unit: string,
  pricing?: PricingContext,
): Promise<{ cost: number; source: string }> {
  const resolved = await resolvePrice(name, pricing);
  if (!resolved) return { cost: 0, source: "none" };

  const grams = toGrams(quantity, unit);
  const cost = Math.round(grams * (resolved.price_per_100g / 100) * 100) / 100;
  return { cost, source: resolved.source };
}

/**
 * Recalculate all costs in a plan.
 * When pricing context is provided, uses the multi-source resolution pipeline.
 * Without it, falls back to static price_estimates (backward compatible).
 */
export async function recalculatePlanCosts(
  plan: GeneratePlanToolOutput,
  pricing?: PricingContext,
): Promise<{ plan: GeneratePlanToolOutput; totalCost: number }> {
  let totalCost = 0;

  for (const day of plan.mealsByDay) {
    let dayCost = 0;

    for (const meal of day.meals) {
      let mealCost = 0;

      for (const ingredient of meal.ingredients) {
        const { cost } = await calculateIngredientCost(
          ingredient.name,
          ingredient.quantity,
          ingredient.unit,
          pricing,
        );
        mealCost += cost > 0 ? cost : 0;
      }

      if (mealCost > 0) {
        meal.estimatedCost = Math.round(mealCost * 100) / 100;
      }
      dayCost += meal.estimatedCost;
    }

    day.dayCost = Math.round(dayCost * 100) / 100;
    totalCost += dayCost;
  }

  plan.estimatedTotalCost = Math.round(totalCost * 100) / 100;

  for (const item of plan.shoppingList) {
    const { cost, source } = await calculateIngredientCost(
      item.name,
      item.quantity,
      item.unit,
      pricing,
    );
    if (cost > 0) {
      item.estimatedCost = Math.round(cost * 100) / 100;
    }
    (item as Record<string, unknown>).priceSource = source !== "none" ? source : "estimate";
  }

  return { plan, totalCost: plan.estimatedTotalCost };
}
