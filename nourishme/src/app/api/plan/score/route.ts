import { NextResponse } from "next/server";
import { PlanScoreRequestSchema } from "./schemas";
import { scorePlan } from "@/app/scoring/engine";
import type { ScoringInput } from "@/app/scoring/engine";
import type { DayPlan, PantryItemInput } from "../generate/types";
import { resolveUserId, getServiceClient } from "@/lib/db";

/*
  POST /api/plan/score

  Payload (by planId — fetches plan, budget, and pantry from DB):
  {
    "planId": "550e8400-e29b-41d4-a716-446655440000"
  }

  Payload (by raw JSON — optionally include budget/pantry context):
  {
    "rawPlanJson": { "mealsByDay": [ ... ] },
    "budget": { "snapRemaining": 250, "horizonDays": 7 },
    "pantryItems": [ { "name": "rice", "quantity": 5, "unit": "lbs" } ],
    "householdSize": 4
  }
*/

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = PlanScoreRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;
    let scoringInput: ScoringInput;

    if ("planId" in data) {
      scoringInput = await buildInputFromPlanId(data.planId);
    } else {
      scoringInput = buildInputFromRawJson(
        data.rawPlanJson.mealsByDay,
        data.budget,
        data.pantryItems,
        data.householdSize,
      );
    }

    const result = scorePlan(scoringInput);

    if ("planId" in data) {
      await persistMetrics(data.planId, result);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ── Helpers ──

async function buildInputFromPlanId(planId: string): Promise<ScoringInput> {
  const supabase = getServiceClient();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("raw_plan_json, estimated_cost, user_id")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const rawPlan = plan.raw_plan_json as {
    mealsByDay?: DayPlan[];
    estimatedTotalCost?: number;
  };
  const mealsByDay: DayPlan[] = rawPlan.mealsByDay ?? [];
  const totalCost =
    rawPlan.estimatedTotalCost ??
    (plan.estimated_cost as number) ??
    mealsByDay.reduce((sum, d) => sum + d.dayCost, 0);

  const userId = plan.user_id as string;

  const [budgetRes, pantryRes, profileRes] = await Promise.all([
    supabase
      .from("budgets")
      .select("snap_remaining, horizon_days")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("pantry_items")
      .select("name, quantity, unit, expires_on, barcode, brand, off_metadata_ref")
      .eq("user_id", userId),
    supabase
      .from("profiles")
      .select("household_size")
      .eq("user_id", userId)
      .limit(1)
      .single(),
  ]);

  const budget = budgetRes.data
    ? {
        snapRemaining: budgetRes.data.snap_remaining as number,
        horizonDays: budgetRes.data.horizon_days as number,
      }
    : undefined;

  const pantryItems: PantryItemInput[] | undefined = pantryRes.data
    ? (pantryRes.data as {
        name: string;
        quantity: number;
        unit: string;
        expires_on: string | null;
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
      }[]).map((row) => ({
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        expiresOn: row.expires_on,
        barcode: row.barcode ?? null,
        brand: row.brand ?? null,
        offMetadataRef: row.off_metadata_ref ?? null,
      }))
    : undefined;

  const householdSize = profileRes.data
    ? (profileRes.data.household_size as number)
    : undefined;

  return { mealsByDay, totalCost, budget, pantryItems, householdSize };
}

function buildInputFromRawJson(
  mealsByDay: DayPlan[],
  budget?: { snapRemaining: number; horizonDays: number },
  pantryItems?: PantryItemInput[],
  householdSize?: number,
): ScoringInput {
  const totalCost = mealsByDay.reduce((sum, d) => sum + d.dayCost, 0);
  return { mealsByDay, totalCost, budget, pantryItems, householdSize };
}

async function persistMetrics(
  planId: string,
  result: {
    costScore: number;
    nutritionScore: number;
    pantryUtilizationScore: number;
    overallScore: number;
  },
): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from("plan_metrics").upsert(
    {
      plan_id: planId,
      cost_score: result.costScore,
      nutrition_score: result.nutritionScore,
      pantry_utilization_score: result.pantryUtilizationScore,
      overall_score: result.overallScore,
    },
    { onConflict: "plan_id" },
  );
}
