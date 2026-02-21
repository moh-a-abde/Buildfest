import { NextResponse, type NextRequest } from "next/server";
import type { SnapStore, StoresResponse } from "./types";

const ARCGIS_BASE =
  "https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/snap_retailer_location_data/FeatureServer/0/query";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RESULTS = 25;

const cache = new Map<string, { data: StoresResponse; fetchedAt: number }>();

interface ArcGISAttributes {
  Store_Name: string | null;
  Store_Street_Address: string | null;
  City: string | null;
  State: string | null;
  Zip_Code: string | null;
  Store_Type: string | null;
  Latitude: number | null;
  Longitude: number | null;
  Incentive_Program: string | null;
}

interface ArcGISFeature {
  attributes: ArcGISAttributes;
}

interface ArcGISResponse {
  features?: ArcGISFeature[];
  error?: { code: number; message: string };
}

function mapFeatureToStore(feature: ArcGISFeature): SnapStore {
  const a = feature.attributes;
  return {
    name: a.Store_Name?.trim() ?? "Unknown Store",
    address: a.Store_Street_Address?.trim() ?? "",
    city: a.City?.trim() ?? "",
    state: a.State?.trim() ?? "",
    zip: a.Zip_Code?.trim() ?? "",
    storeType: a.Store_Type?.trim() ?? "Other",
    latitude: a.Latitude ?? 0,
    longitude: a.Longitude ?? 0,
    healthyIncentives: !!a.Incentive_Program?.trim(),
  };
}

function buildFallbackResponse(zip: string): StoresResponse {
  return {
    zip,
    stores: [],
    source: "fallback",
  };
}

async function fetchStoresFromUSDA(zip: string): Promise<StoresResponse> {
  const params = new URLSearchParams({
    where: `Zip_Code='${zip}'`,
    outFields:
      "Store_Name,Store_Street_Address,City,State,Zip_Code,Store_Type,Latitude,Longitude,Incentive_Program",
    resultRecordCount: String(MAX_RESULTS),
    f: "json",
  });

  const url = `${ARCGIS_BASE}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

  if (!res.ok) {
    throw new Error(`ArcGIS responded with ${res.status}`);
  }

  const data: ArcGISResponse = await res.json();

  if (data.error) {
    throw new Error(data.error.message ?? "ArcGIS query error");
  }

  const stores = (data.features ?? []).map(mapFeatureToStore);

  return {
    zip,
    stores,
    source: "usda_api",
    cachedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip");

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: "Missing or invalid zip parameter (5-digit ZIP required)" },
      { status: 400 },
    );
  }

  const cached = cache.get(zip);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const result = await fetchStoresFromUSDA(zip);
    cache.set(zip, { data: result, fetchedAt: Date.now() });
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "SNAP store lookup failed, using fallback:",
      err instanceof Error ? err.message : err,
    );
    const fallback = buildFallbackResponse(zip);
    return NextResponse.json(fallback);
  }
}
