import type { GeneratePlanToolOutput } from "@/app/ai/tools";
import type { PantryItemInput } from "@/app/api/plan/generate/types";

/**
 * Recompute nutrition summary from actual meal data so displayed numbers
 * match the plan. Overwrites AI-generated values which may be inconsistent.
 */
export function recomputeNutritionSummary(
  plan: GeneratePlanToolOutput,
): GeneratePlanToolOutput {
  const days = plan.mealsByDay.length;
  if (days === 0) return plan;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFiber = 0;

  for (const day of plan.mealsByDay) {
    totalCalories += day.dayCalories;
    for (const meal of day.meals) {
      totalProtein += meal.protein;
      totalFiber += meal.fiber ?? 0;
    }
  }

  plan.nutritionSummary = {
    avgCaloriesPerDay: Math.round(totalCalories / days),
    avgProteinPerDay: Math.round(totalProtein / days),
    avgFiberPerDay: Math.round(totalFiber / days),
    notes: plan.nutritionSummary.notes,
  };

  return plan;
}

/**
 * Checks whether an ingredient name matches a pantry item name using
 * case-insensitive substring matching in both directions.
 * e.g. pantry "rice" matches ingredient "White rice, long grain, raw"
 */
function ingredientMatchesPantry(
  ingredientName: string,
  pantryName: string,
): boolean {
  const ing = ingredientName.toLowerCase().trim();
  const pan = pantryName.toLowerCase().trim();
  if (!ing || !pan) return false;
  return ing.includes(pan) || pan.includes(ing);
}

/**
 * Post-process a generated plan to ensure `fromPantry` flags are set
 * correctly by matching ingredient names against pantry items.
 *
 * The AI may not reliably set `fromPantry: true` due to naming mismatches
 * (e.g. pantry "rice" vs ingredient "White rice, long grain, raw").
 * This normalizer fixes that with substring matching.
 *
 * Mutates the plan in place and returns it for chaining.
 */
export function normalizePantryFlags(
  plan: GeneratePlanToolOutput,
  pantryItems: PantryItemInput[],
): GeneratePlanToolOutput {
  if (!pantryItems.length) return plan;

  for (const day of plan.mealsByDay) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        if (ingredient.fromPantry) continue;
        for (const pantryItem of pantryItems) {
          if (ingredientMatchesPantry(ingredient.name, pantryItem.name)) {
            ingredient.fromPantry = true;
            break;
          }
        }
      }
    }
  }

  return plan;
}
