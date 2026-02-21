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

// ── Nutrition & Price Reference Data ──

export interface NutritionDataRow {
  id: string;
  food_name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fiber_per_100g: number;
  sodium_per_100g: number;
  serving_size_g: number;
  usda_ndb_no: string | null;
  created_at: string;
}

export interface PriceEstimateRow {
  id: string;
  food_name: string;
  price_per_100g: number;
  unit: string;
  source: string;
  zip_code: string | null;
  created_at: string;
}

export type NutritionSeedRow = Omit<NutritionDataRow, "id" | "created_at">;
export type PriceSeedRow = Omit<PriceEstimateRow, "id" | "created_at">;
