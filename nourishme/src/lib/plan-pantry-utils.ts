import type { DayPlan, Meal } from "@/app/api/plan/generate/types";

export interface PantryItemWithExpiry {
  name: string;
  quantity: number;
  unit: string;
  expires_on: string | null;
  barcode?: string | null;
  brand?: string | null;
  off_metadata_ref?: {
    product_identity: string | null;
    normalized_product_name: string | null;
    allergen_flags: string[];
    nutri_score: string | null;
    eco_score: string | null;
    nova_group: number | null;
    carbon_footprint_kg_co2e_per_kg: number | null;
  } | null;
}

function ingredientMatchesPantry(ingredientName: string, pantryName: string): boolean {
  const ing = ingredientName.toLowerCase().trim();
  const pan = pantryName.toLowerCase().trim();
  if (!ing || !pan) return false;
  return ing.includes(pan) || pan.includes(ing);
}

export function getPantryItemsExpiringSoon(
  pantryItems: PantryItemWithExpiry[],
  withinDays = 7
): PantryItemWithExpiry[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + withinDays);

  return pantryItems.filter((item) => {
    if (!item.expires_on) return false;
    const expDate = new Date(item.expires_on);
    expDate.setHours(0, 0, 0, 0);
    return expDate <= horizon;
  });
}

export function getPantryItemsExpiringUrgent(
  pantryItems: PantryItemWithExpiry[],
  withinDays = 2
): PantryItemWithExpiry[] {
  return getPantryItemsExpiringSoon(pantryItems, withinDays);
}

export function countExpiringSoonUsedInPlan(
  pantryItems: PantryItemWithExpiry[],
  mealsByDay: DayPlan[]
): number {
  const expiringSoon = getPantryItemsExpiringSoon(pantryItems);
  const usedNames = new Set<string>();

  for (const day of mealsByDay) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        if (!ing.fromPantry) continue;
        for (const p of expiringSoon) {
          if (ingredientMatchesPantry(ing.name, p.name)) {
            usedNames.add(p.name.toLowerCase());
            break;
          }
        }
      }
    }
  }
  return usedNames.size;
}

export function getExpiringPantryItemsUsedInMeal(
  meal: Meal,
  pantryItems: PantryItemWithExpiry[]
): Array<{ name: string; expiresInDays: number }> {
  const expiringSoon = getPantryItemsExpiringSoon(pantryItems);
  const result: Array<{ name: string; expiresInDays: number }> = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const ing of meal.ingredients) {
    if (!ing.fromPantry) continue;
    for (const p of expiringSoon) {
      if (ingredientMatchesPantry(ing.name, p.name)) {
        const expDate = new Date(p.expires_on!);
        expDate.setHours(0, 0, 0, 0);
        const diffMs = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        result.push({ name: p.name, expiresInDays: Math.max(0, diffDays) });
        break;
      }
    }
  }
  return result;
}

export function getDayPantryStats(
  day: DayPlan,
  pantryItems: PantryItemWithExpiry[]
): { used: number; expiringSoon: number } {
  const usedPantryNames = new Set<string>();
  const expiringSoon = getPantryItemsExpiringSoon(pantryItems);

  for (const meal of day.meals) {
    for (const ing of meal.ingredients) {
      if (!ing.fromPantry) continue;
      for (const p of pantryItems) {
        if (ingredientMatchesPantry(ing.name, p.name)) {
          usedPantryNames.add(p.name.toLowerCase());
          break;
        }
      }
    }
  }

  let expiringSoonCount = 0;
  for (const p of expiringSoon) {
    if (usedPantryNames.has(p.name.toLowerCase())) {
      expiringSoonCount++;
    }
  }
  return { used: usedPantryNames.size, expiringSoon: expiringSoonCount };
}

export function getMealPantryUsageRatio(meal: Meal): number {
  if (meal.ingredients.length === 0) return 0;
  const fromPantry = meal.ingredients.filter((i) => i.fromPantry).length;
  return fromPantry / meal.ingredients.length;
}
