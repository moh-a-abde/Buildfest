import type { GeneratePlanToolOutput } from "@/app/ai/tools";
import type {
  ProfileInput,
  ShoppingListItem,
} from "@/app/api/plan/generate/types";
import { getServiceClient } from "@/lib/db";

interface OffIngredientRow {
  normalized_product_name: string;
  allergen_flags: string[] | null;
  carbon_footprint_kg_co2e_per_kg: number | null;
}

const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  peanuts: ["peanut", "groundnut"],
  "tree-nuts": ["almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio", "macadamia"],
  milk: ["milk", "cheese", "yogurt", "butter", "cream"],
  eggs: ["egg", "eggs"],
  soy: ["soy", "tofu", "tempeh", "edamame"],
  wheat: ["wheat", "flour", "bread", "pasta", "noodle"],
  fish: ["fish", "salmon", "tuna", "cod", "tilapia", "anchovy", "sardine"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop"],
  sesame: ["sesame", "tahini"],
};

const ALLERGEN_SAFE_REPLACEMENTS: Record<string, string> = {
  peanuts: "sunflower seeds",
  "tree-nuts": "sunflower seeds",
  milk: "oat milk",
  eggs: "chickpea flour",
  soy: "lentils",
  wheat: "rice",
  fish: "chicken thighs",
  shellfish: "chicken thighs",
  sesame: "olive oil",
};

const ECO_REPLACEMENTS: Array<{ tokens: string[]; replacement: string }> = [
  { tokens: ["beef", "steak", "ground beef"], replacement: "lentils" },
  { tokens: ["lamb"], replacement: "beans" },
  { tokens: ["pork", "bacon", "sausage"], replacement: "chicken thighs" },
  { tokens: ["shrimp", "prawn"], replacement: "beans" },
  { tokens: ["cheese"], replacement: "beans" },
  { tokens: ["butter"], replacement: "olive oil" },
];

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");
}

async function fetchOffRowsForIngredients(ingredientNames: string[]): Promise<Map<string, OffIngredientRow>> {
  if (ingredientNames.length === 0) return new Map();

  const normalized = Array.from(new Set(ingredientNames.map(normalizeName).filter(Boolean)));
  if (normalized.length === 0) return new Map();

  const { data } = await getServiceClient()
    .from("off_metadata_cache")
    .select("normalized_product_name, allergen_flags, carbon_footprint_kg_co2e_per_kg")
    .in("normalized_product_name", normalized);

  const map = new Map<string, OffIngredientRow>();
  for (const row of (data ?? []) as OffIngredientRow[]) {
    map.set(normalizeName(row.normalized_product_name), row);
  }
  return map;
}

function detectAllergenMatch(
  ingredientName: string,
  excludedAllergens: string[],
  metadata?: OffIngredientRow,
): string | null {
  const normalizedIngredient = normalizeName(ingredientName);
  const metaFlags = (metadata?.allergen_flags ?? []).map((f) => normalizeName(f));

  for (const allergen of excludedAllergens) {
    const keywords = ALLERGEN_KEYWORDS[allergen] ?? [];
    if (keywords.some((k) => normalizedIngredient.includes(k))) return allergen;
    if (keywords.some((k) => metaFlags.some((flag) => flag.includes(k)))) return allergen;
  }
  return null;
}

function detectEcoReplacement(ingredientName: string): string | null {
  const normalized = normalizeName(ingredientName);
  const candidate = ECO_REPLACEMENTS.find((entry) =>
    entry.tokens.some((token) => normalized.includes(token)),
  );
  return candidate?.replacement ?? null;
}

function updateShoppingListFromMeals(plan: GeneratePlanToolOutput): void {
  const aggregate = new Map<string, ShoppingListItem>();

  for (const day of plan.mealsByDay) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        if (ingredient.fromPantry) continue;
        const key = `${normalizeName(ingredient.name)}::${ingredient.unit.toLowerCase()}`;
        const existing = aggregate.get(key);
        if (!existing) {
          aggregate.set(key, {
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            estimatedCost: 0,
            pantryOverlap: false,
            substitutedFrom: ingredient.substitutedFrom,
            substitutionReason: ingredient.substitutionReason,
            substitutionDetails: ingredient.substitutionDetails,
          });
        } else {
          existing.quantity += ingredient.quantity;
          if (ingredient.substitutionReason) {
            existing.substitutionReason =
              existing.substitutionReason ?? ingredient.substitutionReason;
            existing.substitutionDetails =
              existing.substitutionDetails ?? ingredient.substitutionDetails;
            existing.substitutedFrom =
              existing.substitutedFrom ?? ingredient.substitutedFrom;
          }
        }
      }
    }
  }

  plan.shoppingList = Array.from(aggregate.values());
}

export async function applyPreferenceConstraints(
  plan: GeneratePlanToolOutput,
  profile: ProfileInput,
): Promise<{ plan: GeneratePlanToolOutput; changesSummary: string[] }> {
  const excludedAllergens = profile.allergenExclusions ?? [];
  const ecoPriorityEnabled = Boolean(profile.ecoPriorityEnabled);
  const changes: string[] = [];

  if (excludedAllergens.length === 0 && !ecoPriorityEnabled) {
    return { plan, changesSummary: changes };
  }

  const ingredientNames = plan.mealsByDay.flatMap((day) =>
    day.meals.flatMap((meal) => meal.ingredients.map((ing) => ing.name)),
  );
  const offRowMap = await fetchOffRowsForIngredients(ingredientNames);

  for (const day of plan.mealsByDay) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        const normalized = normalizeName(ingredient.name);
        const row = offRowMap.get(normalized);

        const matchedAllergen = detectAllergenMatch(
          ingredient.name,
          excludedAllergens,
          row,
        );
        if (matchedAllergen) {
          const replacement =
            ALLERGEN_SAFE_REPLACEMENTS[matchedAllergen] ?? "beans";
          const original = ingredient.name;
          ingredient.name = replacement;
          ingredient.fromPantry = false;
          ingredient.substitutedFrom = original;
          ingredient.substitutionReason = "allergen-safe";
          ingredient.substitutionDetails = `Replaced due to excluded allergen: ${matchedAllergen}.`;
          changes.push(`${original} -> ${replacement} (allergen: ${matchedAllergen})`);
          continue;
        }

        if (ecoPriorityEnabled) {
          const ecoReplacement = detectEcoReplacement(ingredient.name);
          const highCarbon = (row?.carbon_footprint_kg_co2e_per_kg ?? 0) > 8;
          if (ecoReplacement && (highCarbon || !row)) {
            const original = ingredient.name;
            ingredient.name = ecoReplacement;
            ingredient.fromPantry = false;
            ingredient.substitutedFrom = original;
            ingredient.substitutionReason = "eco-preferred";
            ingredient.substitutionDetails =
              "Replaced with a lower-impact alternative based on eco preference.";
            changes.push(`${original} -> ${ecoReplacement} (eco)`);
          }
        }
      }
    }
  }

  if (changes.length > 0) {
    updateShoppingListFromMeals(plan);
  }

  return { plan, changesSummary: changes };
}
