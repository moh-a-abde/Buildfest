import type { GeneratePlanToolOutput } from "@/app/ai/tools";
import type {
  PantryItemInput,
  ReasonCode,
  DayPlan,
  GeneratePlanResponse,
} from "@/app/api/plan/generate/types";

const VALID_REASON_CODES: ReasonCode[] = [
  "allergen_blocked",
  "allergen_safety_fallback",
  "eco_preferred",
  "better_eco_score",
  "better_nutri_score",
  "lower_nova_group",
  "lower_carbon_footprint",
  "weighted_metadata_preference",
  "metadata_unknown_eco_score",
  "metadata_unknown_nutri_score",
  "metadata_unknown_nova_group",
  "metadata_unknown_carbon_footprint",
];

const REASON_CODE_SET = new Set<string>(VALID_REASON_CODES);

function filterToReasonCodes(codes: string[] | undefined): ReasonCode[] | undefined {
  if (!codes?.length) return undefined;
  const filtered = codes.filter((c) => REASON_CODE_SET.has(c)) as ReasonCode[];
  return filtered.length > 0 ? filtered : undefined;
}

/**
 * Normalizes a plan from AI/processing output (which may have string[] reasonCodes)
 * to the strict GeneratePlanResponse shape (ReasonCode[]).
 */
export function normalizePlanForResponse(
  plan: GeneratePlanToolOutput,
  planId: string,
): GeneratePlanResponse {
  const mealsByDay: DayPlan[] = plan.mealsByDay.map((day) => ({
    dayIndex: day.dayIndex,
    dateLabel: day.dateLabel,
    meals: day.meals.map((meal) => ({
      ...meal,
      ingredients: meal.ingredients.map((ing) => ({
        ...ing,
        reasonCodes: filterToReasonCodes(ing.reasonCodes as string[] | undefined),
      })),
    })),
    dayCost: day.dayCost,
    dayCalories: day.dayCalories,
  }));

  const shoppingList = plan.shoppingList.map((item) => ({
    ...item,
    reasonCodes: filterToReasonCodes(item.reasonCodes as string[] | undefined),
  }));

  return {
    planId,
    mealsByDay,
    shoppingList,
    estimatedTotalCost: plan.estimatedTotalCost,
    nutritionSummary: plan.nutritionSummary,
    confidenceNotes: plan.confidenceNotes,
  };
}

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
