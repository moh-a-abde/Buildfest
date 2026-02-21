import { z } from "zod/v4";
import {
  PantryItemInputSchema,
  DayPlanSchema,
} from "../generate/schemas";
import { PlanMetricsSchema } from "../score/schemas";

export const LockedConstraintsSchema = z.object({
  weeklyBudgetCap: z.number().min(0),
  restrictions: z.array(z.string()),
  pantryItems: z.array(PantryItemInputSchema),
});

export const RegenerateDayRequestSchema = z.object({
  planId: z.string().uuid(),
  dayIndex: z.number().int().min(0).max(29),
  lockedConstraints: LockedConstraintsSchema,
});

export const RegenerateDayResponseSchema = z.object({
  dayPlan: DayPlanSchema,
  updatedPlanMetrics: PlanMetricsSchema,
  changesSummary: z.array(z.string()),
});
