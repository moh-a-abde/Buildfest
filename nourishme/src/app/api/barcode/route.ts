import { NextResponse, type NextRequest } from "next/server";
import { lookupByBarcode } from "@/lib/barcode-lookup";

/**
 * GET /api/barcode?code=012345678901
 *
 * Server-side proxy to Open Food Facts. Returns product info or 404.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code || !/^\d{8,14}$/.test(code.trim())) {
    return NextResponse.json(
      { error: "Missing or invalid 'code' parameter (8-14 digit barcode)" },
      { status: 400 },
    );
  }

  const product = await lookupByBarcode(code.trim());

  if (!product) {
    return NextResponse.json(
      { error: "Product not found for this barcode" },
      { status: 404 },
    );
  }

  return NextResponse.json({ product });
}
