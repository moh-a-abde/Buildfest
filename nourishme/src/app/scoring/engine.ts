import type { DayPlan, PantryItemInput } from "../api/plan/generate/types";

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
  overallScore: number;
  improvementSuggestions: string[];
}

// ── Constants ──

const WEIGHT_NUTRITION = 0.45;
const WEIGHT_COST = 0.35;
const WEIGHT_PANTRY = 0.20;

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

// ── Improvement Suggestions ──

function generateSuggestions(
  costScore: number,
  nutritionScore: number,
  pantryScore: number,
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

  return suggestions;
}

// ── Main Scoring Function ──

export function scorePlan(input: ScoringInput): ScoringResult {
  const costScore = calculateCostScore(input);
  const nutritionScore = calculateNutritionScore(input);
  const pantryUtilizationScore = calculatePantryUtilizationScore(input);

  const overallScore = round2(
    clamp(
      WEIGHT_NUTRITION * nutritionScore +
        WEIGHT_COST * costScore +
        WEIGHT_PANTRY * pantryUtilizationScore,
    ),
  );

  const improvementSuggestions = generateSuggestions(
    costScore,
    nutritionScore,
    pantryUtilizationScore,
    input,
  );

  return {
    costScore,
    nutritionScore,
    pantryUtilizationScore,
    overallScore,
    improvementSuggestions,
  };
}
