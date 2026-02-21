import { NextResponse, type NextRequest } from "next/server";
import { ResourcesQuerySchema } from "./schemas";
import type { ResourcesResponse } from "./types";

/*
  GET /api/resources?zip=55401

  Returns local food resources by ZIP code.
  Currently uses static sample data; future iterations
  may integrate with a real resource database or API.
*/

const SAMPLE_RESOURCES: Record<string, ResourcesResponse> = {
  "55401": {
    zip: "55401",
    resources: [
      {
        name: "Loaves and Fishes",
        address: "1620 Elliot Ave, Minneapolis, MN 55404",
        hours: "Mon-Fri 11:30am-12:30pm",
        notes: "Free community dining, no ID required",
      },
      {
        name: "The Food Group - Fare For All",
        address: "8501 54th Ave N, New Hope, MN 55428",
        hours: "Monthly distribution events",
        notes: "Discounted grocery packages, SNAP accepted",
      },
      {
        name: "Second Harvest Heartland",
        address: "7101 Winnetka Ave N, Brooklyn Park, MN 55428",
        hours: "Varies by partner site",
        notes: "Food shelf network with 1,000+ partner sites",
      },
    ],
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const zip = searchParams.get("zip");

  const parsed = ResourcesQuerySchema.safeParse({ zip });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid zip parameter", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = SAMPLE_RESOURCES[parsed.data.zip] ?? {
    zip: parsed.data.zip,
    resources: [
      {
        name: "USDA SNAP Retailer Locator",
        address: "Search online at fns.usda.gov/snap/retailer-locator",
        notes:
          "Find SNAP-authorized stores near you by entering your ZIP code",
      },
      {
        name: "Feeding America - Find Your Local Food Bank",
        address: "Search online at feedingamerica.org/find-your-local-foodbank",
        notes: "Nationwide network of food banks and pantries",
      },
    ],
  };

  return NextResponse.json(result);
}
