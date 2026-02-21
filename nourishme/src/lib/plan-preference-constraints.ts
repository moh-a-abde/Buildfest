import type { GeneratePlanToolOutput } from "@/app/ai/tools";
import type {
  ProfileInput,
  ReasonCode,
  ShoppingListItem,
} from "@/app/api/plan/generate/types";
import { getServiceClient } from "@/lib/db";

interface OffIngredientRow {
  normalized_product_name: string;
  allergen_flags: string[] | null;
  nutri_score: string | null;
  eco_score: string | null;
  nova_group: number | null;
  carbon_footprint_kg_co2e_per_kg: number | null;
}

const SOFT_OBJECTIVE_WEIGHTS = {
  ecoScore: 0.3,
  nutriScore: 0.25,
  novaGroup: 0.2,
  carbonFootprint: 0.25,
} as const;

const GRADE_TO_SCORE: Record<string, number> = {
  a: 100,
  b: 80,
  c: 60,
  d: 35,
  e: 10,
};

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

const VALID_REASON_CODES = new Set<ReasonCode>([
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
]);

function toReasonCodes(codes: string[] | undefined): ReasonCode[] {
  if (!codes?.length) return [];
  return codes.filter((c): c is ReasonCode => VALID_REASON_CODES.has(c as ReasonCode));
}

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

const SOFT_OBJECTIVE_FALLBACK_CANDIDATES = [
  "lentils",
  "beans",
  "rice",
  "frozen mixed vegetables",
  "olive oil",
  "oat milk",
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
    .select(
      "normalized_product_name, allergen_flags, nutri_score, eco_score, nova_group, carbon_footprint_kg_co2e_per_kg",
    )
    .in("normalized_product_name", normalized);

  const map = new Map<string, OffIngredientRow>();
  for (const row of (data ?? []) as OffIngredientRow[]) {
    map.set(normalizeName(row.normalized_product_name), row);
  }
  return map;
}

function toGradeScore(value: string | null): number {
  if (!value) return 50;
  return GRADE_TO_SCORE[normalizeName(value)] ?? 50;
}

function toNovaScore(value: number | null): number {
  if (!value) return 50;
  const clamped = Math.max(1, Math.min(4, value));
  return ((4 - clamped) / 3) * 100;
}

function toCarbonScore(value: number | null): number {
  if (value == null) return 50;
  // Use 0-20 kg CO2e/kg as practical scoring range and clamp.
  const clamped = Math.max(0, Math.min(20, value));
  return ((20 - clamped) / 20) * 100;
}

function computeSoftObjectiveScore(row?: OffIngredientRow): number {
  if (!row) return 50;
  const ecoScore = toGradeScore(row.eco_score);
  const nutriScore = toGradeScore(row.nutri_score);
  const novaScore = toNovaScore(row.nova_group);
  const carbonScore = toCarbonScore(row.carbon_footprint_kg_co2e_per_kg);
  return (
    SOFT_OBJECTIVE_WEIGHTS.ecoScore * ecoScore +
    SOFT_OBJECTIVE_WEIGHTS.nutriScore * nutriScore +
    SOFT_OBJECTIVE_WEIGHTS.novaGroup * novaScore +
    SOFT_OBJECTIVE_WEIGHTS.carbonFootprint * carbonScore
  );
}

function getSoftObjectiveReason(current?: OffIngredientRow, candidate?: OffIngredientRow): string {
  if (!candidate) return "";

  const reasons: string[] = [];
  if (toGradeScore(candidate.eco_score) > toGradeScore(current?.eco_score ?? null)) {
    reasons.push("better eco score");
  }
  if (toGradeScore(candidate.nutri_score) > toGradeScore(current?.nutri_score ?? null)) {
    reasons.push("better nutrition");
  }
  if (toNovaScore(candidate.nova_group) > toNovaScore(current?.nova_group ?? null)) {
    reasons.push("less processed");
  }
  if (
    toCarbonScore(candidate.carbon_footprint_kg_co2e_per_kg) >
    toCarbonScore(current?.carbon_footprint_kg_co2e_per_kg ?? null)
  ) {
    reasons.push("lower carbon footprint");
  }

  return reasons.length > 0 ? `Chosen for its ${reasons.join(", ")}.` : "";
}

function getSoftObjectiveReasonCodes(
  current?: OffIngredientRow,
  candidate?: OffIngredientRow,
): ReasonCode[] {
  if (!candidate) return ["weighted_metadata_preference"];

  const codes = new Set<ReasonCode>();
  if (toGradeScore(candidate.eco_score) > toGradeScore(current?.eco_score ?? null)) {
    codes.add("better_eco_score");
  }
  if (toGradeScore(candidate.nutri_score) > toGradeScore(current?.nutri_score ?? null)) {
    codes.add("better_nutri_score");
  }
  if (toNovaScore(candidate.nova_group) > toNovaScore(current?.nova_group ?? null)) {
    codes.add("lower_nova_group");
  }
  if (
    toCarbonScore(candidate.carbon_footprint_kg_co2e_per_kg) >
    toCarbonScore(current?.carbon_footprint_kg_co2e_per_kg ?? null)
  ) {
    codes.add("lower_carbon_footprint");
  }

  if (candidate.eco_score == null) codes.add("metadata_unknown_eco_score");
  if (candidate.nutri_score == null) codes.add("metadata_unknown_nutri_score");
  if (candidate.nova_group == null) codes.add("metadata_unknown_nova_group");
  if (candidate.carbon_footprint_kg_co2e_per_kg == null) {
    codes.add("metadata_unknown_carbon_footprint");
  }

  if (codes.size === 0) {
    codes.add("weighted_metadata_preference");
  }
  return Array.from(codes).sort((a, b) => a.localeCompare(b));
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

function getCandidatePool(ingredientName: string, matchedAllergen: string | null): string[] {
  const allergenCandidate = matchedAllergen
    ? [ALLERGEN_SAFE_REPLACEMENTS[matchedAllergen] ?? "beans"]
    : [];
  const ecoCandidate = detectEcoReplacement(ingredientName);
  const defaults = SOFT_OBJECTIVE_FALLBACK_CANDIDATES;
  return Array.from(
    new Set(
      [ecoCandidate, ...allergenCandidate, ...defaults]
        .filter((name): name is string => Boolean(name))
        .map((value) => value.trim()),
    ),
  );
}

function resolveGuaranteedSafeReplacement(excludedAllergens: string[]): string {
  const emergencyCandidates = ["beans", "lentils", "rice", "oat milk", "olive oil"];
  for (const candidate of emergencyCandidates) {
    if (!detectAllergenMatch(candidate, excludedAllergens)) {
      return candidate;
    }
  }
  return "rice";
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
            reasonCodes: toReasonCodes(ingredient.reasonCodes as string[] | undefined),
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
            existing.reasonCodes = Array.from(
              new Set<ReasonCode>([
                ...(existing.reasonCodes ?? []),
                ...toReasonCodes(ingredient.reasonCodes as string[] | undefined),
              ]),
            ).sort((a, b) => a.localeCompare(b));
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

  const baseIngredientNames = plan.mealsByDay.flatMap((day) =>
    day.meals.flatMap((meal) => meal.ingredients.map((ing) => ing.name)),
  );

  const candidateNames = baseIngredientNames.flatMap((name) =>
    getCandidatePool(name, null),
  );
  const offRowMap = await fetchOffRowsForIngredients([
    ...baseIngredientNames,
    ...candidateNames,
  ]);

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
        const candidatePool = getCandidatePool(ingredient.name, matchedAllergen);
        const safeCandidates = candidatePool.filter((candidateName) => {
          const candidateMeta = offRowMap.get(normalizeName(candidateName));
          return !detectAllergenMatch(candidateName, excludedAllergens, candidateMeta);
        });

        if (matchedAllergen) {
          const bestSafe = safeCandidates
            .map((candidateName) => ({
              name: candidateName,
              row: offRowMap.get(normalizeName(candidateName)),
              score: computeSoftObjectiveScore(
                offRowMap.get(normalizeName(candidateName)),
              ),
            }))
            .sort((a, b) => b.score - a.score)[0];

          const replacementName =
            bestSafe?.name ?? resolveGuaranteedSafeReplacement(excludedAllergens);
          const replacementMeta = offRowMap.get(normalizeName(replacementName));
          const original = ingredient.name;
          ingredient.name = replacementName;
          ingredient.fromPantry = false;
          ingredient.substitutedFrom = original;
          ingredient.substitutionReason = "allergen-safe";
          ingredient.reasonCodes = Array.from(
            new Set<ReasonCode>([
              "allergen_blocked",
              ...getSoftObjectiveReasonCodes(row, replacementMeta),
            ]),
          ).sort((a, b) => a.localeCompare(b));
          const softReason = getSoftObjectiveReason(row, replacementMeta);
          ingredient.substitutionDetails = softReason
            ? `Swapped in instead of ${original} to avoid ${matchedAllergen}. ${softReason}`
            : `Swapped in instead of ${original} to avoid ${matchedAllergen}.`;
          const replacementScore = computeSoftObjectiveScore(replacementMeta);
          changes.push(
            `${original} -> ${replacementName} (allergen: ${matchedAllergen}; weighted soft score ${replacementScore.toFixed(1)})`,
          );
          if (detectAllergenMatch(ingredient.name, excludedAllergens, replacementMeta)) {
            ingredient.name = resolveGuaranteedSafeReplacement(excludedAllergens);
            ingredient.reasonCodes = Array.from(
              new Set<ReasonCode>([
                ...toReasonCodes(ingredient.reasonCodes as string[] | undefined),
                "allergen_safety_fallback",
              ]),
            ).sort((a, b) => a.localeCompare(b));
            ingredient.substitutionDetails =
              `Swapped in instead of ${original} to avoid ${matchedAllergen}.`;
            changes.push(`${original} -> ${ingredient.name} (allergen safety fallback)`);
          }
          continue;
        }

        if (ecoPriorityEnabled && safeCandidates.length > 0) {
          const currentScore = computeSoftObjectiveScore(row);
          const bestSafe = safeCandidates
            .map((candidateName) => ({
              name: candidateName,
              row: offRowMap.get(normalizeName(candidateName)),
              score: computeSoftObjectiveScore(
                offRowMap.get(normalizeName(candidateName)),
              ),
            }))
            .sort((a, b) => b.score - a.score)[0];

          if (bestSafe && bestSafe.name !== ingredient.name && bestSafe.score > currentScore + 8) {
            const original = ingredient.name;
            ingredient.name = bestSafe.name;
            ingredient.fromPantry = false;
            ingredient.substitutedFrom = original;
            ingredient.substitutionReason = "eco-preferred";
            ingredient.reasonCodes = Array.from(
              new Set<ReasonCode>([
                "eco_preferred",
                ...getSoftObjectiveReasonCodes(row, bestSafe.row),
              ]),
            ).sort((a, b) => a.localeCompare(b));
            const ecoReason = getSoftObjectiveReason(row, bestSafe.row);
            ingredient.substitutionDetails = ecoReason
              ? `Swapped in instead of ${original}. ${ecoReason}`
              : `Swapped in instead of ${original}.`;
            changes.push(
              `${original} -> ${bestSafe.name} (soft objective +${(bestSafe.score - currentScore).toFixed(1)})`,
            );
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
