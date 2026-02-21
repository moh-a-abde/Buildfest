import type { CookingTimeLevel } from "./types";

interface StoredProfile {
  household_size: number;
  zip_code: string;
  dietary_flags: string[];
  cooking_time_level: CookingTimeLevel;
  allergen_exclusions?: string[];
  eco_priority_enabled?: boolean;
}

interface StoredBudget {
  snap_remaining: number;
  horizon_days: number;
}

interface StoredPantryItem {
  name: string;
  quantity: number;
  unit: string;
  expires_on?: string | null;
  barcode?: string | null;
  brand?: string | null;
  off_metadata_ref?: {
    product_identity: string | null;
    normalized_product_name: string | null;
    allergen_flags: string[];
    nutri_score: string | null;
    eco_score: string | null;
    nova_group: number | null;
    carbon_footprint_kg_co2e_per_kg: number | null;
  } | null;
}

/**
 * Assemble a payload compatible with the GeneratePlanRequest schema
 * from stored profile, budget, and pantry data.
 */
export function buildGeneratePlanPayload(
  profile: StoredProfile,
  budget: StoredBudget,
  pantryItems: StoredPantryItem[],
  additionalPreferences?: string,
) {
  function normalizeExpiresOn(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Accept date picker values (YYYY-MM-DD) and normalize to ISO datetime.
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return `${trimmed}T00:00:00.000Z`;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const householdSize = profile.household_size;
  const caloriesPerPerson = 2000;
  const adjustedCalories = caloriesPerPerson * householdSize;

  return {
    profile: {
      householdSize: profile.household_size,
      zipCode: profile.zip_code,
      dietaryFlags: profile.dietary_flags,
      cookingTimeLevel: profile.cooking_time_level,
      allergenExclusions: profile.allergen_exclusions ?? [],
      ecoPriorityEnabled: profile.eco_priority_enabled ?? false,
    },
    budget: {
      snapRemaining: budget.snap_remaining,
      horizonDays: budget.horizon_days,
    },
    pantryItems: pantryItems
      .filter(
        (item) =>
          item.name?.trim() &&
          item.unit?.trim() &&
          Number.isFinite(item.quantity) &&
          item.quantity >= 0,
      )
      .map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity,
        unit: item.unit.trim(),
        expiresOn: normalizeExpiresOn(item.expires_on),
        barcode: item.barcode ?? null,
        brand: item.brand ?? null,
        offMetadataRef: item.off_metadata_ref ?? null,
      })),
    targets: {
      caloriesPerDay: Math.max(800, Math.min(4000, adjustedCalories)),
      proteinTarget: householdSize * 50,
    },
    ...(additionalPreferences ? { additionalPreferences } : {}),
  };
}
