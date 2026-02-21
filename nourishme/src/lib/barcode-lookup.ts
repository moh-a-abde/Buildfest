/**
 * Open Food Facts barcode lookup.
 * Free API, no key needed, ~100 req/min rate limit.
 *
 * https://wiki.openfoodfacts.org/API
 */

import { getServiceClient } from "./db";
import type { OffMetadata, OffMetadataCacheRow } from "./types";

const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { product: BarcodeProduct | null; fetchedAt: number }>();

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand: string;
  nutrition: {
    calories_per_100g: number;
    protein_per_100g: number;
    fiber_per_100g: number;
    sodium_per_100g: number;
  } | null;
  imageUrl: string | null;
  offMetadata: OffMetadata | null;
}

export async function lookupByBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const cleaned = barcode.replace(/\D/g, "");
  if (cleaned.length < 8 || cleaned.length > 14) return null;

  const cached = cache.get(cleaned);
  if (cached && isFresh(cached.fetchedAt)) {
    return cached.product;
  }

  let staleDbProduct: BarcodeProduct | null = null;
  const cachedRow = await readCachedMetadata(cleaned);
  if (cachedRow) {
    const productFromDb = mapCacheRowToProduct(cachedRow);
    if (isFresh(cachedRow.last_fetched_at)) {
      cache.set(cleaned, { product: productFromDb, fetchedAt: Date.now() });
      return productFromDb;
    }
    staleDbProduct = productFromDb;
  }

  try {
    const res = await fetch(
      `${OFF_BASE}/${cleaned}.json?fields=code,product_name,product_name_en,brands,nutriments,image_front_small_url,allergens_tags,allergens_from_ingredients,nova_group,nutriscore_grade,ecoscore_grade,ecoscore_data`,
      {
        headers: { "User-Agent": "NourishMe/1.0 (hackathon project)" },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) {
      if (staleDbProduct) return staleDbProduct;
      cache.set(cleaned, { product: null, fetchedAt: Date.now() });
      return null;
    }

    const json = await res.json();

    if (json.status !== 1 || !json.product) {
      if (staleDbProduct) return staleDbProduct;
      cache.set(cleaned, { product: null, fetchedAt: Date.now() });
      return null;
    }

    const product = normalizeOffProduct(cleaned, json.product);

    await upsertCachedMetadata(product);

    cache.set(cleaned, { product, fetchedAt: Date.now() });
    return product;
  } catch (err) {
    console.error("Barcode lookup error:", err instanceof Error ? err.message : err);
    if (staleDbProduct) return staleDbProduct;
    return cached?.product ?? null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeGrade(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeAllergenFlags(product: Record<string, unknown>): string[] {
  if (Array.isArray(product.allergens_tags)) {
    return product.allergens_tags
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.split(":").pop()?.trim().toLowerCase() ?? "")
      .filter(Boolean);
  }

  if (typeof product.allergens_from_ingredients === "string") {
    return product.allergens_from_ingredients
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function normalizeNutrition(nutriments: Record<string, unknown> | null): BarcodeProduct["nutrition"] {
  if (!nutriments) return null;

  return {
    calories_per_100g: toNumber(nutriments["energy-kcal_100g"]) ?? toNumber(nutriments["energy-kcal"]) ?? 0,
    protein_per_100g: toNumber(nutriments.proteins_100g) ?? 0,
    fiber_per_100g: toNumber(nutriments.fiber_100g) ?? 0,
    // OFF stores sodium in grams; convert to mg.
    sodium_per_100g: (toNumber(nutriments.sodium_100g) ?? 0) * 1000,
  };
}

function normalizeCarbonFootprint(product: Record<string, unknown>): number | null {
  const nutriments = isRecord(product.nutriments) ? product.nutriments : null;
  const gPer100g = nutriments
    ? toNumber(nutriments["carbon-footprint-from-known-ingredients_100g"]) ??
      toNumber(nutriments["carbon-footprint-from-meat-or-fish_100g"])
    : null;
  if (gPer100g !== null) {
    // Convert g/100g to kg CO2e per kg.
    return gPer100g / 100;
  }

  const ecoscoreData = isRecord(product.ecoscore_data) ? product.ecoscore_data : null;
  const agribalyse = ecoscoreData && isRecord(ecoscoreData.agribalyse) ? ecoscoreData.agribalyse : null;
  return agribalyse ? toNumber(agribalyse.co2_total) : null;
}

function normalizeOffProduct(barcode: string, product: unknown): BarcodeProduct {
  const offProduct = isRecord(product) ? product : {};
  const nutriments = isRecord(offProduct.nutriments) ? offProduct.nutriments : null;

  const offMetadata: OffMetadata = {
    allergens: normalizeAllergenFlags(offProduct),
    nova_group: toNumber(offProduct.nova_group),
    nutri_score: normalizeGrade(offProduct.nutriscore_grade),
    eco_score: normalizeGrade(offProduct.ecoscore_grade),
    carbon_footprint_kg_co2e_per_kg: normalizeCarbonFootprint(offProduct),
  };

  return {
    barcode,
    name:
      (typeof offProduct.product_name === "string" && offProduct.product_name.trim()) ||
      (typeof offProduct.product_name_en === "string" && offProduct.product_name_en.trim()) ||
      "Unknown Product",
    brand: typeof offProduct.brands === "string" ? offProduct.brands.trim() : "",
    nutrition: normalizeNutrition(nutriments),
    imageUrl: typeof offProduct.image_front_small_url === "string" ? offProduct.image_front_small_url : null,
    offMetadata,
  };
}

function mapCacheRowToProduct(row: OffMetadataCacheRow): BarcodeProduct {
  return {
    barcode: row.barcode,
    name: row.normalized_product_name,
    brand: row.brand,
    nutrition: row.nutrition,
    imageUrl: row.image_url,
    offMetadata: {
      allergens: row.allergen_flags ?? [],
      nova_group: row.nova_group,
      nutri_score: row.nutri_score,
      eco_score: row.eco_score,
      carbon_footprint_kg_co2e_per_kg: row.carbon_footprint_kg_co2e_per_kg,
    },
  };
}

function isFresh(fetchedAt: number | string): boolean {
  const timestamp =
    typeof fetchedAt === "number"
      ? fetchedAt
      : Number.isNaN(new Date(fetchedAt).getTime())
        ? 0
        : new Date(fetchedAt).getTime();
  return Date.now() - timestamp < CACHE_TTL_MS;
}

async function readCachedMetadata(barcode: string): Promise<OffMetadataCacheRow | null> {
  try {
    const { data, error } = await getServiceClient()
      .from("off_metadata_cache")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();
    if (error || !data) return null;

    return {
      ...(data as Omit<OffMetadataCacheRow, "allergen_flags" | "nutrition">),
      allergen_flags: Array.isArray(data.allergen_flags)
        ? data.allergen_flags.filter((item: unknown): item is string => typeof item === "string")
        : [],
      nutrition: isRecord(data.nutrition)
        ? {
            calories_per_100g: toNumber(data.nutrition.calories_per_100g) ?? 0,
            protein_per_100g: toNumber(data.nutrition.protein_per_100g) ?? 0,
            fiber_per_100g: toNumber(data.nutrition.fiber_per_100g) ?? 0,
            sodium_per_100g: toNumber(data.nutrition.sodium_per_100g) ?? 0,
          }
        : null,
    };
  } catch (err) {
    console.error("Barcode DB cache read error:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function upsertCachedMetadata(product: BarcodeProduct): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    await getServiceClient().from("off_metadata_cache").upsert(
      {
        barcode: product.barcode,
        product_identity: product.barcode,
        normalized_product_name: product.name,
        brand: product.brand,
        nutrition: product.nutrition,
        image_url: product.imageUrl,
        allergen_flags: product.offMetadata?.allergens ?? [],
        nova_group: product.offMetadata?.nova_group ?? null,
        nutri_score: product.offMetadata?.nutri_score ?? null,
        eco_score: product.offMetadata?.eco_score ?? null,
        carbon_footprint_kg_co2e_per_kg: product.offMetadata?.carbon_footprint_kg_co2e_per_kg ?? null,
        source: "openfoodfacts",
        last_fetched_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "barcode", ignoreDuplicates: false },
    );
  } catch (err) {
    console.error("Barcode DB cache upsert error:", err instanceof Error ? err.message : err);
  }
}
