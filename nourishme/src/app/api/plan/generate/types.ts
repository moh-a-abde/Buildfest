export interface ProfileInput {
  householdSize: number;
  zipCode: string;
  dietaryFlags: string[];
  cookingTimeLevel: "quick" | "moderate" | "extended";
  allergenExclusions?: string[];
  ecoPriorityEnabled?: boolean;
  preferredCuisines?: string[];
}

export type SubstitutionReason = "allergen-safe" | "eco-preferred";

export interface BudgetInput {
  snapRemaining: number;
  horizonDays: number;
}

export interface PantryItemInput {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  expiresOn?: string | null;
  barcode?: string | null;
  brand?: string | null;
  offMetadataRef?: PantryOffMetadataRefInput | null;
}

export interface PantryOffMetadataRefInput {
  product_identity: string | null;
  normalized_product_name: string | null;
  allergen_flags: string[];
  nutri_score: string | null;
  eco_score: string | null;
  nova_group: number | null;
  carbon_footprint_kg_co2e_per_kg: number | null;
}

export interface TargetsInput {
  caloriesPerDay: number;
  proteinTarget?: number;
}

export interface GeneratePlanRequest {
  profile: ProfileInput;
  budget: BudgetInput;
  pantryItems: PantryItemInput[];
  targets: TargetsInput;
}

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  fromPantry: boolean;
  substitutedFrom?: string;
  substitutionReason?: SubstitutionReason;
  substitutionDetails?: string;
}

export interface Meal {
  id: string;
  name: string;
  mealType: "breakfast" | "lunch" | "dinner";
  ingredients: Ingredient[];
  estimatedCost: number;
  calories: number;
  protein: number;
  fiber?: number;
  notes?: string;
}

export interface DayPlan {
  dayIndex: number;
  dateLabel?: string;
  meals: Meal[];
  dayCost: number;
  dayCalories: number;
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  pantryOverlap: boolean;
  priceSource?: string;
  substitutedFrom?: string;
  substitutionReason?: SubstitutionReason;
  substitutionDetails?: string;
}

export interface NutritionSummary {
  avgCaloriesPerDay: number;
  avgProteinPerDay: number;
  avgFiberPerDay?: number;
  notes: string[];
}

export interface GeneratePlanResponse {
  planId: string;
  mealsByDay: DayPlan[];
  shoppingList: ShoppingListItem[];
  estimatedTotalCost: number;
  nutritionSummary: NutritionSummary;
  confidenceNotes: string[];
}
