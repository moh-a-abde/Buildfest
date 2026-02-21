import type { DayPlan, PantryItemInput } from "../generate/types";

export interface LockedConstraints {
  weeklyBudgetCap: number;
  restrictions: string[];
  pantryItems: PantryItemInput[];
}

export interface RegenerateDayRequest {
  planId: string;
  dayIndex: number;
  lockedConstraints: LockedConstraints;
}

export interface RegenerateDayPlanMetrics {
  costScore: number;
  nutritionScore: number;
  pantryUtilizationScore: number;
  overallScore: number;
  improvementSuggestions: string[];
}

export interface RegenerateDayResponse {
  dayPlan: DayPlan;
  updatedPlanMetrics: RegenerateDayPlanMetrics;
  changesSummary: string[];
}
