/**
 * Kroger API client – OAuth2 client credentials flow + product search.
 *
 * Env vars: KROGER_CLIENT_ID, KROGER_CLIENT_SECRET
 *
 * Docs: https://developer.kroger.com/api-products/api/product-api-public
 */

const KROGER_BASE = "https://api.kroger.com/v1";
const TOKEN_URL = `${KROGER_BASE}/connect/oauth2/token`;
const PRODUCTS_URL = `${KROGER_BASE}/products`;

const PRICE_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ── Token cache ─────────────────────────────────────────────────────────

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export function isKrogerConfigured(): boolean {
  return !!(process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET);
}

export async function getKrogerAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("KROGER_CLIENT_ID and KROGER_CLIENT_SECRET must be set");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=product.compact",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kroger token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 1800) * 1000,
  };

  return cachedToken.accessToken;
}

// ── Types ───────────────────────────────────────────────────────────────

export interface KrogerProduct {
  productId: string;
  description: string;
  brand: string;
  upc: string;
  size: string;
  price: number | null;
  promoPrice: number | null;
  imageUrl: string | null;
}

export interface KrogerPriceResult {
  food_name: string;
  price_per_100g: number;
  product: KrogerProduct;
}

// ── Product search ──────────────────────────────────────────────────────

export async function searchKrogerProducts(
  term: string,
  storeId?: string,
): Promise<KrogerProduct[]> {
  const token = await getKrogerAccessToken();

  const params = new URLSearchParams({ "filter.term": term, "filter.limit": "5" });
  if (storeId) params.set("filter.locationId", storeId);

  const res = await fetch(`${PRODUCTS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Kroger product search failed (${res.status})`);
  }

  const json = await res.json();
  const items: KrogerProduct[] = [];

  for (const p of json.data ?? []) {
    const priceInfo = p.items?.[0]?.price;
    const img = p.images?.find((i: { perspective: string }) => i.perspective === "front")
      ?.sizes?.find((s: { size: string }) => s.size === "medium")?.url ?? null;

    items.push({
      productId: p.productId,
      description: p.description ?? "",
      brand: p.brand ?? "",
      upc: p.upc ?? "",
      size: p.items?.[0]?.size ?? "",
      price: priceInfo?.regular ?? null,
      promoPrice: priceInfo?.promo ?? null,
      imageUrl: img,
    });
  }

  return items;
}

// ── Price lookup with caching ───────────────────────────────────────────

const priceCache = new Map<string, { result: KrogerPriceResult; fetchedAt: number }>();

function priceCacheKey(foodName: string, storeId: string): string {
  return `${foodName.toLowerCase()}::${storeId}`;
}

/**
 * Estimate price_per_100g for a food item at a specific Kroger store.
 * Searches Kroger products, picks the best match, and converts the shelf
 * price to price_per_100g using a rough size-to-grams heuristic.
 */
export async function lookupKrogerPrice(
  foodName: string,
  storeId: string,
): Promise<KrogerPriceResult | null> {
  const key = priceCacheKey(foodName, storeId);
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const products = await searchKrogerProducts(foodName, storeId);
    const priced = products.filter((p) => p.price !== null && p.price > 0);
    if (priced.length === 0) return null;

    const best = priced[0];
    const effectivePrice = best.promoPrice ?? best.price!;
    const gramsEstimate = estimateGramsFromSize(best.size);
    const pricePer100g = gramsEstimate > 0
      ? Math.round((effectivePrice / gramsEstimate) * 100 * 100) / 100
      : Math.round((effectivePrice / 4.53) * 100) / 100; // fallback: assume ~1 lb

    const result: KrogerPriceResult = {
      food_name: foodName,
      price_per_100g: pricePer100g,
      product: best,
    };

    priceCache.set(key, { result, fetchedAt: Date.now() });
    return result;
  } catch (err) {
    console.error("Kroger price lookup error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Best-effort conversion from Kroger's size string (e.g. "16 oz", "1 lb", "32 fl oz")
 * to grams. Returns 0 if unparseable.
 */
function estimateGramsFromSize(size: string): number {
  if (!size) return 0;

  const lower = size.toLowerCase().trim();
  const numMatch = lower.match(/^([\d.]+)\s*/);
  if (!numMatch) return 0;

  const num = parseFloat(numMatch[1]);
  if (isNaN(num)) return 0;

  if (lower.includes("lb")) return num * 453.59;
  if (lower.includes("kg")) return num * 1000;
  if (lower.includes("oz") && !lower.includes("fl oz")) return num * 28.35;
  if (lower.includes("g") && !lower.includes("gal")) return num;
  if (lower.includes("fl oz")) return num * 29.57;
  if (lower.includes("gal")) return num * 3785.41;
  if (lower.includes("l") || lower.includes("liter")) return num * 1000;
  if (lower.includes("ct") || lower.includes("count")) return num * 100; // assume ~100g each

  return 0;
}
