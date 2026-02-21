import type {
  DayPlan,
  PantryItemInput,
  ReasonCode,
} from "../api/plan/generate/types";

// ── Public Types ──

export interface ScoringInput {
  mealsByDay: DayPlan[];
  totalCost: number;
  budget?: { snapRemaining: number; horizonDays: number };
  pantryItems?: PantryItemInput[];
  householdSize?: number;
}

export interface ScoringResult {
  costScore: number;
  nutritionScore: number;
  pantryUtilizationScore: number;
  metadataQualityScore: number;
  overallScore: number;
  improvementSuggestions: string[];
  reasonCodes: ReasonCode[];
}

// ── Constants ──

const WEIGHT_NUTRITION = 0.35;
const WEIGHT_COST = 0.30;
const WEIGHT_PANTRY = 0.20;
const WEIGHT_METADATA = 0.15;

const CALORIE_PER_PERSON_MIN = 1800;
const CALORIE_PER_PERSON_MAX = 2400;
const PROTEIN_PERCENT_MIN = 0.15;
const PROTEIN_PERCENT_MAX = 0.25;
const CALORIES_PER_GRAM_PROTEIN = 4;
const MEALS_PER_DAY = 3;

const NEUTRAL_SCORE = 50;
const SUGGESTION_THRESHOLD = 60;

// ── Helpers ──

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((s, v) => s + v, 0) / values.length);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");
}

function addReasonCode(codes: Set<ReasonCode>, code: ReasonCode): void {
  codes.add(code);
}

function stableReasonCodes(codes: Set<ReasonCode>): ReasonCode[] {
  return Array.from(codes).sort((a, b) => a.localeCompare(b));
}

// ── Cost Score ──

function computeBudgetCompliance(totalCost: number, snapRemaining: number): number {
  if (totalCost <= snapRemaining) return 100;
  const overageRatio = (totalCost - snapRemaining) / snapRemaining;
  return clamp(100 - overageRatio * 100);
}

function computeCostVariance(dayCosts: number[]): number {
  if (dayCosts.length < 2) return 100;
  const avgCost = mean(dayCosts);
  if (avgCost === 0) return 100;
  const sd = stdDev(dayCosts);
  const cv = sd / avgCost;
  // CV of 0 = perfect (100), CV >= 1 = poor (0)
  return clamp(100 * (1 - cv));
}

function computePerServingEfficiency(totalCost: number, totalDays: number): number {
  const totalServings = totalDays * MEALS_PER_DAY;
  if (totalServings === 0) return NEUTRAL_SCORE;
  const costPerMeal = totalCost / totalServings;
  // $0-2/meal = 100, $2-4 = 75-100, $4-8 = 25-75, >$8 = 0-25
  if (costPerMeal <= 2) return 100;
  if (costPerMeal <= 4) return clamp(100 - (costPerMeal - 2) * 12.5);
  if (costPerMeal <= 8) return clamp(75 - (costPerMeal - 4) * 12.5);
  return 0;
}

export function calculateCostScore(input: ScoringInput): number {
  const dayCosts = input.mealsByDay.map((d) => d.dayCost);
  const totalDays = input.mealsByDay.length;

  if (input.budget) {
    const compliance = computeBudgetCompliance(input.totalCost, input.budget.snapRemaining);
    const variance = computeCostVariance(dayCosts);
    const efficiency = computePerServingEfficiency(input.totalCost, totalDays);
    return round2(clamp(0.4 * compliance + 0.3 * variance + 0.3 * efficiency));
  }

  // No budget context: use variance + efficiency only
  const variance = computeCostVariance(dayCosts);
  const efficiency = computePerServingEfficiency(input.totalCost, totalDays);
  return round2(clamp(0.5 * variance + 0.5 * efficiency));
}

// ── Nutrition Score ──

function computeCalorieRangeScore(
  avgDailyCalories: number,
  householdSize: number,
): number {
  const minCal = CALORIE_PER_PERSON_MIN * householdSize;
  const maxCal = CALORIE_PER_PERSON_MAX * householdSize;

  if (avgDailyCalories >= minCal && avgDailyCalories <= maxCal) return 100;

  const distance =
    avgDailyCalories < minCal
      ? minCal - avgDailyCalories
      : avgDailyCalories - maxCal;
  const rangeWidth = maxCal - minCal;
  // Penalty: lose 100 points over 1 full range width of deviation
  return clamp(100 - (distance / rangeWidth) * 100);
}

function computeProteinBalanceScore(mealsByDay: DayPlan[]): number {
  const dailyRatios: number[] = [];

  for (const day of mealsByDay) {
    let dayCalories = 0;
    let dayProtein = 0;
    for (const meal of day.meals) {
      dayCalories += meal.calories;
      dayProtein += meal.protein;
    }
    if (dayCalories > 0) {
      dailyRatios.push((dayProtein * CALORIES_PER_GRAM_PROTEIN) / dayCalories);
    }
  }

  if (dailyRatios.length === 0) return NEUTRAL_SCORE;

  const avgRatio = mean(dailyRatios);

  if (avgRatio >= PROTEIN_PERCENT_MIN && avgRatio <= PROTEIN_PERCENT_MAX) return 100;

  const midpoint = (PROTEIN_PERCENT_MIN + PROTEIN_PERCENT_MAX) / 2;
  const halfRange = (PROTEIN_PERCENT_MAX - PROTEIN_PERCENT_MIN) / 2;
  const distance = Math.abs(avgRatio - midpoint) - halfRange;
  // Lose 100 points over 20% deviation beyond the range
  return clamp(100 - (distance / 0.20) * 100);
}

function computeVarietyScore(mealsByDay: DayPlan[]): number {
  const mealNameCounts = new Map<string, number>();

  for (const day of mealsByDay) {
    for (const meal of day.meals) {
      const key = meal.name.toLowerCase().trim();
      mealNameCounts.set(key, (mealNameCounts.get(key) ?? 0) + 1);
    }
  }

  const totalMeals = mealsByDay.length * MEALS_PER_DAY;
  let repeatPenalty = 0;

  for (const count of mealNameCounts.values()) {
    if (count > 2) {
      repeatPenalty += count - 2;
    }
  }

  if (totalMeals === 0) return NEUTRAL_SCORE;
  // Each excess repeat costs proportionally
  return clamp(100 - (repeatPenalty / totalMeals) * 200);
}

export function calculateNutritionScore(input: ScoringInput): number {
  const householdSize = input.householdSize ?? 1;
  const avgDailyCalories = mean(input.mealsByDay.map((d) => d.dayCalories));

  const calorieScore = computeCalorieRangeScore(avgDailyCalories, householdSize);
  const proteinScore = computeProteinBalanceScore(input.mealsByDay);
  const varietyScore = computeVarietyScore(input.mealsByDay);

  return round2(clamp(0.4 * calorieScore + 0.4 * proteinScore + 0.2 * varietyScore));
}

// ── Pantry Utilization Score ──

function collectPantryIngredientsUsed(mealsByDay: DayPlan[]): Set<string> {
  const used = new Set<string>();
  for (const day of mealsByDay) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        if (ing.fromPantry) {
          used.add(ing.name.toLowerCase().trim());
        }
      }
    }
  }
  return used;
}

/**
 * Fuzzy check: does any used ingredient name match this pantry item?
 * Uses bidirectional substring matching so pantry "rice" matches
 * ingredient "white rice, long grain, raw" and vice versa.
 */
function isPantryItemUsedInMeals(
  pantryName: string,
  usedIngredientNames: Set<string>,
): boolean {
  const p = pantryName.toLowerCase().trim();
  if (!p) return false;
  for (const used of usedIngredientNames) {
    if (used.includes(p) || p.includes(used)) return true;
  }
  return false;
}

function computePercentageUsed(
  pantryItems: PantryItemInput[],
  usedNames: Set<string>,
): number {
  if (pantryItems.length === 0) return 100;
  let matched = 0;
  for (const item of pantryItems) {
    if (isPantryItemUsedInMeals(item.name, usedNames)) {
      matched++;
    }
  }
  return (matched / pantryItems.length) * 100;
}

function computeNearExpiryBonus(
  pantryItems: PantryItemInput[],
  usedNames: Set<string>,
): number {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let nearExpiry = 0;
  let nearExpiryUsed = 0;

  for (const item of pantryItems) {
    if (!item.expiresOn) continue;
    const expDate = new Date(item.expiresOn);
    if (expDate <= horizon) {
      nearExpiry++;
      if (isPantryItemUsedInMeals(item.name, usedNames)) {
        nearExpiryUsed++;
      }
    }
  }

  if (nearExpiry === 0) return 100;
  return (nearExpiryUsed / nearExpiry) * 100;
}

function computeWasteReduction(
  pantryItems: PantryItemInput[],
  usedNames: Set<string>,
): number {
  if (pantryItems.length === 0) return 100;
  const unusedCount = pantryItems.filter(
    (item) => !isPantryItemUsedInMeals(item.name, usedNames),
  ).length;
  return clamp(100 - (unusedCount / pantryItems.length) * 100);
}

export function calculatePantryUtilizationScore(input: ScoringInput): number {
  if (!input.pantryItems || input.pantryItems.length === 0) {
    return NEUTRAL_SCORE;
  }

  const usedNames = collectPantryIngredientsUsed(input.mealsByDay);
  const percentUsed = computePercentageUsed(input.pantryItems, usedNames);
  const expiryBonus = computeNearExpiryBonus(input.pantryItems, usedNames);
  const wasteReduction = computeWasteReduction(input.pantryItems, usedNames);

  return round2(clamp(0.5 * percentUsed + 0.25 * expiryBonus + 0.25 * wasteReduction));
}

// ── Metadata Quality Score ──

interface OffMetadataLike {
  nutri_score: string | null;
  eco_score: string | null;
  nova_group: number | null;
  carbon_footprint_kg_co2e_per_kg: number | null;
}

const GRADE_TO_SCORE: Record<string, number> = {
  a: 100,
  b: 80,
  c: 60,
  d: 35,
  e: 10,
};

function toGradeScore(value: string | null): number {
  if (!value) return NEUTRAL_SCORE;
  return GRADE_TO_SCORE[normalizeName(value)] ?? NEUTRAL_SCORE;
}

function toNovaScore(value: number | null): number {
  if (value == null) return NEUTRAL_SCORE;
  const clamped = Math.max(1, Math.min(4, value));
  return ((4 - clamped) / 3) * 100;
}

function toCarbonScore(value: number | null): number {
  if (value == null) return NEUTRAL_SCORE;
  const clamped = Math.max(0, Math.min(20, value));
  return ((20 - clamped) / 20) * 100;
}

function collectIngredientNames(mealsByDay: DayPlan[]): Set<string> {
  const names = new Set<string>();
  for (const day of mealsByDay) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        names.add(normalizeName(ingredient.name));
      }
    }
  }
  return names;
}

function matchesIngredientName(ingredientName: string, pantryName: string): boolean {
  if (!ingredientName || !pantryName) return false;
  return ingredientName.includes(pantryName) || pantryName.includes(ingredientName);
}

function metadataForIngredient(
  ingredientName: string,
  pantryItems: PantryItemInput[] | undefined,
): OffMetadataLike | undefined {
  if (!pantryItems || pantryItems.length === 0) return undefined;
  for (const item of pantryItems) {
    const pantryName = normalizeName(item.name);
    if (matchesIngredientName(ingredientName, pantryName) && item.offMetadataRef) {
      return item.offMetadataRef;
    }
  }
  return undefined;
}

function collectSubstitutionReasonCodes(mealsByDay: DayPlan[], reasonCodes: Set<ReasonCode>): void {
  for (const day of mealsByDay) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        if (ingredient.substitutionReason === "allergen-safe") {
          addReasonCode(reasonCodes, "allergen_blocked");
        }
        if (ingredient.substitutionReason === "eco-preferred") {
          addReasonCode(reasonCodes, "eco_preferred");
        }
        for (const reasonCode of ingredient.reasonCodes ?? []) {
          addReasonCode(reasonCodes, reasonCode);
        }
      }
    }
  }
}

export function calculateMetadataQualityScore(
  input: ScoringInput,
  reasonCodes: Set<ReasonCode>,
): number {
  const ingredientNames = collectIngredientNames(input.mealsByDay);
  if (ingredientNames.size === 0) {
    addReasonCode(reasonCodes, "metadata_unknown_eco_score");
    addReasonCode(reasonCodes, "metadata_unknown_nutri_score");
    addReasonCode(reasonCodes, "metadata_unknown_nova_group");
    addReasonCode(reasonCodes, "metadata_unknown_carbon_footprint");
    return NEUTRAL_SCORE;
  }

  const ecoScores: number[] = [];
  const nutriScores: number[] = [];
  const novaScores: number[] = [];
  const carbonScores: number[] = [];

  let unknownEco = false;
  let unknownNutri = false;
  let unknownNova = false;
  let unknownCarbon = false;

  for (const ingredientName of ingredientNames) {
    const metadata = metadataForIngredient(ingredientName, input.pantryItems);

    if (!metadata || metadata.eco_score == null) unknownEco = true;
    if (!metadata || metadata.nutri_score == null) unknownNutri = true;
    if (!metadata || metadata.nova_group == null) unknownNova = true;
    if (!metadata || metadata.carbon_footprint_kg_co2e_per_kg == null) unknownCarbon = true;

    ecoScores.push(toGradeScore(metadata?.eco_score ?? null));
    nutriScores.push(toGradeScore(metadata?.nutri_score ?? null));
    novaScores.push(toNovaScore(metadata?.nova_group ?? null));
    carbonScores.push(toCarbonScore(metadata?.carbon_footprint_kg_co2e_per_kg ?? null));
  }

  if (unknownEco) addReasonCode(reasonCodes, "metadata_unknown_eco_score");
  if (unknownNutri) addReasonCode(reasonCodes, "metadata_unknown_nutri_score");
  if (unknownNova) addReasonCode(reasonCodes, "metadata_unknown_nova_group");
  if (unknownCarbon) addReasonCode(reasonCodes, "metadata_unknown_carbon_footprint");

  const ecoAvg = mean(ecoScores);
  const nutriAvg = mean(nutriScores);
  const novaAvg = mean(novaScores);
  const carbonAvg = mean(carbonScores);

  if (ecoAvg >= 70) addReasonCode(reasonCodes, "better_eco_score");
  if (nutriAvg >= 70) addReasonCode(reasonCodes, "better_nutri_score");
  if (novaAvg >= 70) addReasonCode(reasonCodes, "lower_nova_group");
  if (carbonAvg >= 70) addReasonCode(reasonCodes, "lower_carbon_footprint");

  const score = 0.3 * ecoAvg + 0.25 * nutriAvg + 0.2 * novaAvg + 0.25 * carbonAvg;
  return round2(clamp(score));
}

// ── Improvement Suggestions ──

function generateSuggestions(
  costScore: number,
  nutritionScore: number,
  pantryScore: number,
  metadataScore: number,
  input: ScoringInput,
): string[] {
  const suggestions: string[] = [];

  if (costScore < SUGGESTION_THRESHOLD) {
    if (input.budget && input.totalCost > input.budget.snapRemaining) {
      suggestions.push(
        "Total plan cost exceeds your SNAP budget. Consider substituting cheaper protein sources like beans or lentils.",
      );
    }
    suggestions.push(
      "Try to balance daily spending more evenly across the week to avoid high-cost days.",
    );
  }

  if (nutritionScore < SUGGESTION_THRESHOLD) {
    const avgCal = mean(input.mealsByDay.map((d) => d.dayCalories));
    const hs = input.householdSize ?? 1;
    const minCal = CALORIE_PER_PERSON_MIN * hs;
    const maxCal = CALORIE_PER_PERSON_MAX * hs;

    if (avgCal < minCal) {
      suggestions.push(
        "Daily calories are below target. Add calorie-dense staples like rice, oats, or peanut butter.",
      );
    } else if (avgCal > maxCal) {
      suggestions.push(
        "Daily calories exceed the target range. Reduce portion sizes or swap in lower-calorie vegetables.",
      );
    }

    suggestions.push(
      "Aim for more meal variety across the week to improve nutritional diversity.",
    );
  }

  if (pantryScore < SUGGESTION_THRESHOLD && input.pantryItems && input.pantryItems.length > 0) {
    suggestions.push(
      "Consider using more pantry items to reduce waste and lower grocery costs.",
    );

    const now = new Date();
    const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nearExpiry = input.pantryItems.filter((item) => {
      if (!item.expiresOn) return false;
      return new Date(item.expiresOn) <= horizon;
    });
    if (nearExpiry.length > 0) {
      suggestions.push(
        `You have ${nearExpiry.length} pantry item(s) expiring soon. Prioritize using them this week.`,
      );
    }
  }

  if (metadataScore < SUGGESTION_THRESHOLD) {
    suggestions.push(
      "Metadata coverage is limited for some ingredients. Add barcoded pantry items to improve eco and nutrition explainability.",
    );
  }

  return suggestions;
}

// ── Main Scoring Function ──

export function scorePlan(input: ScoringInput): ScoringResult {
  const costScore = calculateCostScore(input);
  const nutritionScore = calculateNutritionScore(input);
  const pantryUtilizationScore = calculatePantryUtilizationScore(input);
  const reasonCodes = new Set<ReasonCode>();
  collectSubstitutionReasonCodes(input.mealsByDay, reasonCodes);
  const metadataQualityScore = calculateMetadataQualityScore(input, reasonCodes);

  const overallScore = round2(
    clamp(
      WEIGHT_NUTRITION * nutritionScore +
        WEIGHT_COST * costScore +
        WEIGHT_PANTRY * pantryUtilizationScore +
        WEIGHT_METADATA * metadataQualityScore,
    ),
  );

  const improvementSuggestions = generateSuggestions(
    costScore,
    nutritionScore,
    pantryUtilizationScore,
    metadataQualityScore,
    input,
  );

  return {
    costScore,
    nutritionScore,
    pantryUtilizationScore,
    metadataQualityScore,
    overallScore,
    improvementSuggestions,
    reasonCodes: stableReasonCodes(reasonCodes),
  };
}
