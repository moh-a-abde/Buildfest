import { tool } from "ai";
import { z } from "zod/v4";
import {
  ProfileInputSchema,
  BudgetInputSchema,
  PantryItemInputSchema,
  TargetsInputSchema,
  DayPlanSchema,
  NutritionSummarySchema,
  ShoppingListItemSchema,
} from "../api/plan/generate/schemas";

// ── Input schemas (exported for reuse by API routes) ──

export const GeneratePlanToolInputSchema = z.object({
  profile: ProfileInputSchema,
  budget: BudgetInputSchema,
  pantryItems: z.array(PantryItemInputSchema),
  targets: TargetsInputSchema,
  additionalPreferences: z.string().max(500).optional(),
});

export const ScorePlanToolInputSchema = z.object({
  mealsByDay: z.array(DayPlanSchema).min(1).max(30),
  budget: BudgetInputSchema,
  pantryItems: z.array(PantryItemInputSchema),
});

export const CritiquePlanToolInputSchema = z.object({
  mealsByDay: z.array(DayPlanSchema).min(1).max(30),
  scores: z.object({
    costScore: z.number().min(0).max(100),
    nutritionScore: z.number().min(0).max(100),
    pantryUtilizationScore: z.number().min(0).max(100),
    overallScore: z.number().min(0).max(100),
  }),
  constraints: z.object({
    dietaryFlags: z.array(z.string()),
    snapRemaining: z.number().min(0),
    horizonDays: z.number().int().min(1).max(30),
  }),
});

// ── Response schemas (for structured output validation) ──

export const GeneratePlanToolOutputSchema = z.object({
  // Keep model-facing schema permissive: some providers reject strict
  // array constraints (minItems > 1 / fixed lengths) in output_format.
  mealsByDay: z.array(
    z.object({
      dayIndex: z.number(),
      dateLabel: z.string().optional(),
      meals: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          mealType: z.enum(["breakfast", "lunch", "dinner"]),
          ingredients: z.array(
            z.object({
              name: z.string(),
              quantity: z.number(),
              unit: z.string(),
              fromPantry: z.boolean(),
              substitutedFrom: z.string().optional(),
              substitutionReason: z.enum(["allergen-safe", "eco-preferred"]).optional(),
              substitutionDetails: z.string().optional(),
              reasonCodes: z.array(z.string()).optional(),
            }),
          ),
          estimatedCost: z.number(),
          calories: z.number(),
          protein: z.number(),
          fiber: z.number().optional(),
          notes: z.string().optional(),
        }),
      ),
      dayCost: z.number(),
      dayCalories: z.number(),
    }),
  ),
  shoppingList: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      estimatedCost: z.number(),
      pantryOverlap: z.boolean(),
      substitutedFrom: z.string().optional(),
      substitutionReason: z.enum(["allergen-safe", "eco-preferred"]).optional(),
      substitutionDetails: z.string().optional(),
      reasonCodes: z.array(z.string()).optional(),
    }),
  ),
  estimatedTotalCost: z.number(),
  nutritionSummary: z.object({
    avgCaloriesPerDay: z.number(),
    avgProteinPerDay: z.number(),
    avgFiberPerDay: z.number().optional(),
    notes: z.array(z.string()),
  }),
  confidenceNotes: z.array(z.string()),
});

export const ScorePlanToolOutputSchema = z.object({
  costScore: z.number().min(0).max(100),
  nutritionScore: z.number().min(0).max(100),
  pantryUtilizationScore: z.number().min(0).max(100),
  metadataQualityScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  improvementSuggestions: z.array(z.string()),
  reasonCodes: z.array(z.string()),
});

export const CritiquePlanToolOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      area: z.enum(["cost", "nutrition", "variety", "pantry_use", "general"]),
      suggestion: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ),
  summary: z.string(),
});

// ── Tool definitions ──

export const generatePlanTool = tool({
  description:
    "Generate a budget-conscious meal plan with breakfast, lunch, and dinner " +
    "for each day. The number of days is determined by budget.horizonDays (1-30). " +
    "The plan must respect dietary restrictions, use pantry items where " +
    "possible, and stay within the SNAP budget. Return structured meal data with " +
    "ingredients, estimated costs, and nutrition info.",
  inputSchema: GeneratePlanToolInputSchema,
  execute: async (
    input: z.infer<typeof GeneratePlanToolInputSchema>,
  ): Promise<{ status: string; householdSize: number; message: string }> => {
    return {
      status: "not_implemented",
      householdSize: input.profile.householdSize,
      message:
        "Plan generation tool called successfully. " +
        "Wire up the full implementation in the generate API route (Task 9).",
    };
  },
});

export const scorePlanTool = tool({
  description:
    "Score a meal plan on three dimensions: cost efficiency (budget compliance " +
    "and per-serving value), nutrition quality (calorie targets, macro balance, variety), " +
    "and pantry utilization (percentage of pantry items used, near-expiry bonus). " +
    "Returns scores normalized to 0-100 and improvement suggestions.",
  inputSchema: ScorePlanToolInputSchema,
  execute: async (
    input: z.infer<typeof ScorePlanToolInputSchema>,
  ): Promise<{
    status: string;
    daysReceived: number;
    message: string;
  }> => {
    return {
      status: "not_implemented",
      daysReceived: input.mealsByDay.length,
      message:
        "Score plan tool called successfully. " +
        "Wire up the deterministic scoring engine (Task 10).",
    };
  },
});

export const critiquePlanTool = tool({
  description:
    "Analyze a scored meal plan and suggest concrete improvements. " +
    "Focus on the weakest scoring dimensions and provide actionable " +
    "changes like ingredient substitutions, portion adjustments, or " +
    "meal swaps that would improve the overall score.",
  inputSchema: CritiquePlanToolInputSchema,
  execute: async (
    input: z.infer<typeof CritiquePlanToolInputSchema>,
  ): Promise<{
    status: string;
    overallScore: number;
    message: string;
  }> => {
    return {
      status: "not_implemented",
      overallScore: input.scores.overallScore,
      message:
        "Critique plan tool called successfully. " +
        "Wire up the AI critique logic (Task 9/13).",
    };
  },
});

export const allTools = {
  generatePlan: generatePlanTool,
  scorePlan: scorePlanTool,
  critiquePlan: critiquePlanTool,
} as const;

// Re-export schema types for convenience
export type GeneratePlanToolInput = z.infer<typeof GeneratePlanToolInputSchema>;
export type ScorePlanToolInput = z.infer<typeof ScorePlanToolInputSchema>;
export type CritiquePlanToolInput = z.infer<typeof CritiquePlanToolInputSchema>;
export type GeneratePlanToolOutput = z.infer<
  typeof GeneratePlanToolOutputSchema
>;
export type ScorePlanToolOutput = z.infer<typeof ScorePlanToolOutputSchema>;
export type CritiquePlanToolOutput = z.infer<
  typeof CritiquePlanToolOutputSchema
>;
