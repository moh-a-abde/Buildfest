export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  household_size: number;
  zip_code: string;
  dietary_flags: string[];
  cooking_time_level: "quick" | "moderate" | "extended";
}

export interface Budget {
  id: string;
  user_id: string;
  snap_remaining: number;
  horizon_days: number;
  created_at: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  expires_on: string | null;
}

export interface Plan {
  id: string;
  user_id: string;
  raw_plan_json: Record<string, unknown>;
  estimated_cost: number;
  nutrition_score: number;
  created_at: string;
}

export interface PlanMetrics {
  id: string;
  plan_id: string;
  cost_score: number;
  nutrition_score: number;
  pantry_utilization_score: number;
  overall_score: number;
}

export type DietaryFlag =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "dairy-free"
  | "nut-free";

export type CookingTimeLevel = "quick" | "moderate" | "extended";

export type HorizonDays = 7 | 14 | 30;
