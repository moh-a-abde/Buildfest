export interface ProfileInput {
  householdSize: number;
  zipCode: string;
  dietaryFlags: string[];
  cookingTimeLevel: "quick" | "moderate" | "extended";
  preferredCuisines?: string[];
}

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
