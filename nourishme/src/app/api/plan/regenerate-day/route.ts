import { NextResponse } from "next/server";
import { RegenerateDayRequestSchema } from "./schemas";

/*
  POST /api/plan/regenerate-day

  Example payload:
  {
    "planId": "550e8400-e29b-41d4-a716-446655440000",
    "dayIndex": 2,
    "lockedConstraints": {
      "weeklyBudgetCap": 250,
      "restrictions": ["gluten-free"],
      "pantryItems": [
        { "name": "rice", "quantity": 5, "unit": "lbs" }
      ]
    }
  }
*/

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegenerateDayRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // TODO: Implement AI day regeneration (Task 13)
    return NextResponse.json(
      { message: "Day regeneration endpoint ready", input: parsed.data },
      { status: 501 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
