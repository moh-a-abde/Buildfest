import { lookupPriceFuzzy } from "./nutrition-lookup";
import type { GeneratePlanToolOutput } from "@/app/ai/tools";

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
 * Estimate cost for a single ingredient using price_estimates.
 * Returns 0 if no price match is found.
 */
export async function calculateIngredientCost(
  name: string,
  quantity: number,
  unit: string,
): Promise<number> {
  const price = await lookupPriceFuzzy(name);
  if (!price) return 0;

  const grams = toGrams(quantity, unit);
  return Math.round(grams * (price.price_per_100g / 100) * 100) / 100;
}

/**
 * Recalculate all costs in a plan using price_estimates data.
 * Overwrites estimatedCost on meals, dayCost on days, and estimatedTotalCost.
 * Falls back to the AI's original estimate when no price data is available.
 */
export async function recalculatePlanCosts(
  plan: GeneratePlanToolOutput,
): Promise<{ plan: GeneratePlanToolOutput; totalCost: number }> {
  let totalCost = 0;

  for (const day of plan.mealsByDay) {
    let dayCost = 0;

    for (const meal of day.meals) {
      let mealCost = 0;

      for (const ingredient of meal.ingredients) {
        const cost = await calculateIngredientCost(
          ingredient.name,
          ingredient.quantity,
          ingredient.unit,
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
    const cost = await calculateIngredientCost(
      item.name,
      item.quantity,
      item.unit,
    );
    if (cost > 0) {
      item.estimatedCost = Math.round(cost * 100) / 100;
    }
  }

  return { plan, totalCost: plan.estimatedTotalCost };
}
