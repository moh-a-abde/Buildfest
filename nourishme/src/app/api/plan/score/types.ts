import type { DayPlan, BudgetInput, PantryItemInput } from "../generate/types";

export interface PlanScoreRequestById {
  planId: string;
}

export interface PlanScoreRequestByJson {
  rawPlanJson: {
    mealsByDay: DayPlan[];
  };
  budget?: BudgetInput;
  pantryItems?: PantryItemInput[];
  householdSize?: number;
}

export type PlanScoreRequest = PlanScoreRequestById | PlanScoreRequestByJson;

export interface PlanScoreMetrics {
  costScore: number;
  nutritionScore: number;
  pantryUtilizationScore: number;
  overallScore: number;
  improvementSuggestions: string[];
}
