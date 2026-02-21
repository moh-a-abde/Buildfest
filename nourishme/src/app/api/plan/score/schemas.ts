import { z } from "zod/v4";
import {
  DayPlanSchema,
  BudgetInputSchema,
  PantryItemInputSchema,
} from "../generate/schemas";

export const PlanMetricsSchema = z.object({
  costScore: z.number().min(0).max(100),
  nutritionScore: z.number().min(0).max(100),
  pantryUtilizationScore: z.number().min(0).max(100),
  metadataQualityScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  improvementSuggestions: z.array(z.string()),
  reasonCodes: z.array(z.string()),
});

export const PlanScoreRequestSchema = z.union([
  z.object({ planId: z.string().uuid() }),
  z.object({
    rawPlanJson: z.object({
      mealsByDay: z.array(DayPlanSchema).min(1).max(30),
    }),
    budget: BudgetInputSchema.optional(),
    pantryItems: z.array(PantryItemInputSchema).optional(),
    householdSize: z.number().int().min(1).max(12).optional(),
  }),
]);
