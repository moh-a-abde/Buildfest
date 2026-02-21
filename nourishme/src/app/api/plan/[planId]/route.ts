import { NextResponse } from "next/server";
import { resolveUserId, getServiceClient } from "@/lib/db";
import type {
  DayPlan,
  GeneratePlanResponse,
  NutritionSummary,
  ShoppingListItem,
} from "../generate/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await context.params;

    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const supabase = getServiceClient();

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, raw_plan_json, estimated_cost, nutrition_score, created_at")
      .eq("id", planId)
      .eq("user_id", userId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan not found." },
        { status: 404 },
      );
    }

    const rawPlan = plan.raw_plan_json as {
      mealsByDay?: DayPlan[];
      shoppingList?: ShoppingListItem[];
      estimatedTotalCost?: number;
      nutritionSummary?: NutritionSummary;
      confidenceNotes?: string[];
    };

    const response: GeneratePlanResponse = {
      planId: plan.id,
      mealsByDay: rawPlan.mealsByDay ?? [],
      shoppingList: rawPlan.shoppingList ?? [],
      estimatedTotalCost:
        rawPlan.estimatedTotalCost ?? (plan.estimated_cost as number) ?? 0,
      nutritionSummary: rawPlan.nutritionSummary ?? {
        avgCaloriesPerDay: 0,
        avgProteinPerDay: 0,
        notes: [],
      },
      confidenceNotes: rawPlan.confidenceNotes ?? [],
    };

    const { data: metrics } = await supabase
      .from("plan_metrics")
      .select(
        "cost_score, nutrition_score, pantry_utilization_score, overall_score",
      )
      .eq("plan_id", planId)
      .single();

    return NextResponse.json({
      ...response,
      metrics: metrics ?? null,
      createdAt: plan.created_at ?? null,
    });
  } catch (error) {
    console.error("Fetch plan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await context.params;

    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", userId);

    if (error) {
      console.error("Delete plan error:", error);
      return NextResponse.json(
        { error: "Failed to delete plan." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete plan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
