import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, stepCountIs, type ToolSet } from "ai";
import type { ModelMessage } from "@ai-sdk/provider-utils";
import {
  GeneratePlanToolOutputSchema,
  type GeneratePlanToolInput,
  type GeneratePlanToolOutput,
} from "./tools";
import { NUTRITION_SEED_DATA } from "@/lib/seed-data";

export const model = anthropic("claude-sonnet-4-6");

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export function isRetriable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("rate limit") ||
      msg.includes("too many requests") ||
      msg.includes("timeout") ||
      msg.includes("network") ||
      msg.includes("econnreset") ||
      msg.includes("fetch failed") ||
      msg.includes("529") ||
      msg.includes("overloaded")
    );
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AgentLoopOptions {
  tools: ToolSet;
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
  maxSteps?: number;
}

/**
 * Wraps `generateText` with the configured Anthropic model, a capped step
 * loop via `stopWhen`, and exponential-backoff retry for transient failures.
 */
export async function runAgentLoop({
  tools,
  system,
  prompt,
  messages,
  maxSteps,
}: AgentLoopOptions) {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await generateText({
        model,
        tools,
        system,
        ...(messages ? { messages } : { prompt: prompt ?? "" }),
        ...(maxSteps ? { maxSteps } : {}),
        stopWhen: stepCountIs(5),
      });

      return result;
    } catch (error) {
      lastError = error;
      if (!isRetriable(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
      await delay(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw lastError;
}

const AVAILABLE_INGREDIENTS = NUTRITION_SEED_DATA.map((r) => r.food_name);
const SCORE_TARGET_CALORIES_PER_PERSON_MIN = 1800;
const SCORE_TARGET_CALORIES_PER_PERSON_MAX = 2400;
const SCORE_TARGET_PROTEIN_RATIO_MIN = 0.15;
const SCORE_TARGET_PROTEIN_RATIO_MAX = 0.25;

function buildSystemPrompt(constraints: GeneratePlanToolInput): string {
  const { profile, budget, pantryItems, targets, additionalPreferences } = constraints;

  const pantrySection =
    pantryItems.length > 0
      ? pantryItems
          .map(
            (p) =>
              `- ${p.name}: ${p.quantity} ${p.unit}${p.expiresOn ? ` (expires ${p.expiresOn})` : ""}`,
          )
          .join("\n")
      : "None";

  const dietarySection =
    profile.dietaryFlags.length > 0
      ? profile.dietaryFlags.join(", ")
      : "No restrictions";
  const allergenSection =
    (profile.allergenExclusions?.length ?? 0) > 0
      ? profile.allergenExclusions?.join(", ")
      : "None";
  const ecoPrioritySection = profile.ecoPriorityEnabled
    ? "Enabled: prefer lower-carbon ingredients when reasonable."
    : "Disabled";

  const days = budget.horizonDays;
  const maxDayIndex = days - 1;
  const scoreTargetDailyCaloriesMin = SCORE_TARGET_CALORIES_PER_PERSON_MIN * profile.householdSize;
  const scoreTargetDailyCaloriesMax = SCORE_TARGET_CALORIES_PER_PERSON_MAX * profile.householdSize;
  const breakfastMin = 400 * profile.householdSize;
  const breakfastMax = 600 * profile.householdSize;
  const lunchMin = 500 * profile.householdSize;
  const lunchMax = 700 * profile.householdSize;
  const dinnerMin = 600 * profile.householdSize;
  const dinnerMax = 800 * profile.householdSize;

  const prefsLower = (additionalPreferences ?? "").toLowerCase();
  const userWantsStrictCalorieLimit =
    /2000|calorie|calories|low.?cal|cal.?limit|strict.?cal/i.test(prefsLower);

  const calorieInstruction = userWantsStrictCalorieLimit
    ? `CRITICAL: Respect the user's stricter calorie preference, but still keep household totals near the scoring-friendly range (${scoreTargetDailyCaloriesMin}-${scoreTargetDailyCaloriesMax} kcal/day) whenever possible.`
    : `CRITICAL: Keep total household daily calories in ${scoreTargetDailyCaloriesMin}-${scoreTargetDailyCaloriesMax} kcal/day so nutrition score lands in Great.`;

  const instruction7 = userWantsStrictCalorieLimit
    ? `7. Provide realistic calorie and protein estimates per meal. Meal calories are HOUSEHOLD totals (not per-person values). Keep daily totals close to ${scoreTargetDailyCaloriesMin}-${scoreTargetDailyCaloriesMax} kcal/day and do not exceed ${targets.caloriesPerDay} kcal/day.`
    : `7. Provide realistic calorie and protein estimates per meal. Meal calories are HOUSEHOLD totals (not per-person values). Keep each day in ${scoreTargetDailyCaloriesMin}-${scoreTargetDailyCaloriesMax} kcal/day.`;

  return `You are a meal planning assistant for SNAP (food stamp) recipients. Generate a budget-conscious ${days}-day meal plan.

## Household
- Size: ${profile.householdSize} people
- ZIP: ${profile.zipCode}
- Dietary restrictions: ${dietarySection}
- Allergen exclusions (hard): ${allergenSection}
- Cooking time preference: ${profile.cookingTimeLevel} (quick=<30min, moderate=30-60min, extended=>60min)
- Eco priority: ${ecoPrioritySection}

## Budget
- SNAP remaining: $${budget.snapRemaining.toFixed(2)}
- Plan horizon: ${days} days
- Daily budget target: $${(budget.snapRemaining / days).toFixed(2)}/day

## Nutrition Targets (for the ENTIRE household of ${profile.householdSize})
- Calories per day: ${targets.caloriesPerDay} kcal total (~${Math.round(targets.caloriesPerDay / profile.householdSize)} per person). ${calorieInstruction}
- Protein per day: ${targets.proteinTarget ? `${targets.proteinTarget}g total (~${Math.round(targets.proteinTarget / profile.householdSize)}g per person)` : `${profile.householdSize * 50}g total (~50g per person)`}
- IMPORTANT: Meal calorie numbers must be HOUSEHOLD totals. Target per-meal household ranges: breakfast ${breakfastMin}-${breakfastMax} kcal, lunch ${lunchMin}-${lunchMax} kcal, dinner ${dinnerMin}-${dinnerMax} kcal.
- IMPORTANT: To score "Great" for nutrition, maintain protein calories around ${(SCORE_TARGET_PROTEIN_RATIO_MIN * 100).toFixed(0)}-${(SCORE_TARGET_PROTEIN_RATIO_MAX * 100).toFixed(0)}% of daily calories and avoid repeating the same meal name more than twice in the full ${days}-day plan.

## Current Pantry
${pantrySection}
${additionalPreferences ? `\n## Additional Preferences\nThe user requested: ${additionalPreferences}\nIncorporate these preferences into the meal plan where feasible while staying within budget.\n` : ""}
## Instructions
1. Generate exactly ${days} days (dayIndex 0-${maxDayIndex}) with 3 meals each: breakfast, lunch, dinner.
2. Each meal must have a unique id (use format "day{dayIndex}-{mealType}", e.g. "day0-breakfast").
3. Prioritize using pantry items. For EVERY ingredient that matches a Current Pantry item (even partially, e.g. pantry "rice" matches "White rice, long grain, raw"), you MUST set fromPantry=true.
4. Stay WITHIN the SNAP budget. Be frugal — prefer beans, rice, eggs, frozen vegetables, chicken thighs.
4a. HARD CONSTRAINT: Never include ingredients that contain user-excluded allergens.
4b. SOFT CONSTRAINT: If eco priority is enabled, use metadata-aware ranking as a secondary objective: prefer better Eco-Score, better Nutri-Score, lower NOVA group, and lower carbon footprint when budget and nutrition remain acceptable.
5. For each ingredient, use names from this list when possible (for accurate cost lookup):
${AVAILABLE_INGREDIENTS.join(", ")}
6. Use "g" as the unit for ingredients whenever possible. If not grams, use: kg, lb, oz, cups, tbsp, tsp, items.
${instruction7}
8. Generate a shopping list of items NOT already in the pantry.
9. Provide a nutrition summary with average daily calories, protein, and fiber (these will be recomputed from the meal data).
10. Add confidence notes about any assumptions or limitations.`;
}

/**
 * Generate a structured N-day meal plan using the AI model with Output.object.
 * The number of days is determined by constraints.budget.horizonDays.
 * Retries on transient failures with exponential backoff.
 */
export async function generateMealPlan(
  constraints: GeneratePlanToolInput,
): Promise<GeneratePlanToolOutput> {
  const systemPrompt = buildSystemPrompt(constraints);
  const days = constraints.budget.horizonDays;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt:
          `Generate the ${days}-day meal plan now. Return the complete structured plan with exactly ${days} days.`,
        output: Output.object({
          schema: GeneratePlanToolOutputSchema,
        }),
      });

      if (!result.output) {
        throw new Error("AI returned no structured output");
      }

      return result.output;
    } catch (error) {
      lastError = error;
      if (!isRetriable(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
      await delay(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw lastError;
}
