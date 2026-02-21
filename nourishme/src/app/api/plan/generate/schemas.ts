import { z } from "zod/v4";

// ── Request Schemas ──

export const ProfileInputSchema = z.object({
  householdSize: z.number().int().min(1),
  zipCode: z.string().min(3),
  dietaryFlags: z.array(z.string()),
  cookingTimeLevel: z.enum(["quick", "moderate", "extended"]),
  allergenExclusions: z.array(z.string()).optional(),
  ecoPriorityEnabled: z.boolean().optional(),
  preferredCuisines: z.array(z.string()).optional(),
});

export const BudgetInputSchema = z.object({
  snapRemaining: z.number().min(0),
  horizonDays: z.number().int().min(1).max(30),
});

export const PantryItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  expiresOn: z
    .union([z.string().date(), z.string().datetime()])
    .nullable()
    .optional(),
  barcode: z.string().min(8).max(14).nullable().optional(),
  brand: z.string().nullable().optional(),
  offMetadataRef: z
    .object({
      product_identity: z.string().nullable(),
      normalized_product_name: z.string().nullable(),
      allergen_flags: z.array(z.string()),
      nutri_score: z.string().nullable(),
      eco_score: z.string().nullable(),
      nova_group: z.number().int().nullable(),
      carbon_footprint_kg_co2e_per_kg: z.number().nullable(),
    })
    .nullable()
    .optional(),
});

export const TargetsInputSchema = z.object({
  caloriesPerDay: z.number().min(800).max(4000),
  proteinTarget: z.number().min(0).optional(),
});

export const GeneratePlanRequestSchema = z.object({
  profile: ProfileInputSchema,
  budget: BudgetInputSchema,
  pantryItems: z.array(PantryItemInputSchema),
  targets: TargetsInputSchema,
  additionalPreferences: z.string().max(500).optional(),
});

// ── Response Schemas ──

export const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().min(0),
  unit: z.string(),
  fromPantry: z.boolean(),
  substitutedFrom: z.string().optional(),
  substitutionReason: z.enum(["allergen-safe", "eco-preferred"]).optional(),
  substitutionDetails: z.string().optional(),
});

export const MealSchema = z.object({
  id: z.string(),
  name: z.string(),
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
  ingredients: z.array(IngredientSchema),
  estimatedCost: z.number().min(0),
  calories: z.number().min(0),
  protein: z.number().min(0),
  fiber: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const DayPlanSchema = z.object({
  dayIndex: z.number().int().min(0).max(29),
  dateLabel: z.string().optional(),
  meals: z.array(MealSchema),
  dayCost: z.number().min(0),
  dayCalories: z.number().min(0),
});

export const ShoppingListItemSchema = z.object({
  name: z.string(),
  quantity: z.number().min(0),
  unit: z.string(),
  estimatedCost: z.number().min(0),
  pantryOverlap: z.boolean(),
  substitutedFrom: z.string().optional(),
  substitutionReason: z.enum(["allergen-safe", "eco-preferred"]).optional(),
  substitutionDetails: z.string().optional(),
});

export const NutritionSummarySchema = z.object({
  avgCaloriesPerDay: z.number().min(0),
  avgProteinPerDay: z.number().min(0),
  avgFiberPerDay: z.number().min(0).optional(),
  notes: z.array(z.string()),
});

export const GeneratePlanResponseSchema = z.object({
  planId: z.string().uuid(),
  mealsByDay: z.array(DayPlanSchema).min(1).max(30),
  shoppingList: z.array(ShoppingListItemSchema),
  estimatedTotalCost: z.number().min(0),
  nutritionSummary: NutritionSummarySchema,
  confidenceNotes: z.array(z.string()),
});
