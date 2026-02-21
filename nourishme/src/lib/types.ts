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
  allergen_exclusions: AllergenExclusion[];
  eco_priority_enabled: boolean;
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
  barcode?: string | null;
  brand?: string | null;
  off_metadata_ref?: PantryOffMetadataRef | null;
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
export type AllergenExclusion =
  | "peanuts"
  | "tree-nuts"
  | "milk"
  | "eggs"
  | "soy"
  | "wheat"
  | "fish"
  | "shellfish"
  | "sesame";

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

export interface PriceSourceRow {
  id: string;
  food_name: string;
  price_per_100g: number;
  unit: string;
  source: string;
  store_chain: string | null;
  store_id: string | null;
  zip_code: string | null;
  fetched_at: string;
  created_at: string;
}

export interface OffMetadata {
  allergens: string[];
  nova_group: number | null;
  nutri_score: string | null;
  eco_score: string | null;
  carbon_footprint_kg_co2e_per_kg: number | null;
}

export interface PantryOffMetadataRef {
  product_identity: string | null;
  normalized_product_name: string | null;
  allergen_flags: string[];
  nutri_score: string | null;
  eco_score: string | null;
  nova_group: number | null;
  carbon_footprint_kg_co2e_per_kg: number | null;
}

export interface OffMetadataCacheRow {
  id: string;
  barcode: string;
  product_identity: string | null;
  normalized_product_name: string;
  brand: string;
  nutrition: {
    calories_per_100g: number;
    protein_per_100g: number;
    fiber_per_100g: number;
    sodium_per_100g: number;
  } | null;
  image_url: string | null;
  allergen_flags: string[];
  nova_group: number | null;
  nutri_score: string | null;
  eco_score: string | null;
  carbon_footprint_kg_co2e_per_kg: number | null;
  source: string;
  last_fetched_at: string;
  created_at: string;
  updated_at: string;
}

export type NutritionSeedRow = Omit<NutritionDataRow, "id" | "created_at">;
export type PriceSeedRow = Omit<PriceEstimateRow, "id" | "created_at">;
