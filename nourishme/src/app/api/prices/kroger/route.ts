import { NextResponse, type NextRequest } from "next/server";
import {
  searchKrogerProducts,
  isKrogerConfigured,
} from "@/lib/grocery-apis/kroger";

/**
 * GET /api/prices/kroger?term=chicken+breast&storeId=01400376
 *
 * Server-side proxy for Kroger product search. Keeps credentials hidden.
 */
export async function GET(request: NextRequest) {
  if (!isKrogerConfigured()) {
    return NextResponse.json(
      { error: "Kroger API is not configured" },
      { status: 503 },
    );
  }

  const term = request.nextUrl.searchParams.get("term");
  const storeId = request.nextUrl.searchParams.get("storeId") ?? undefined;

  if (!term || term.trim().length < 2) {
    return NextResponse.json(
      { error: "Missing or too short 'term' parameter (min 2 chars)" },
      { status: 400 },
    );
  }

  try {
    const products = await searchKrogerProducts(term.trim(), storeId);
    return NextResponse.json({ products });
  } catch (err) {
    console.error(
      "Kroger product search error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Kroger API request failed" },
      { status: 502 },
    );
  }
}
