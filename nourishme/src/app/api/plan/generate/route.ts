import { NextResponse } from "next/server";
import { GeneratePlanRequestSchema } from "./schemas";
import { generateMealPlan } from "@/app/ai/client";
import { recalculatePlanCosts, type PricingContext } from "@/lib/cost-calculator";
import { createFallbackPlan } from "@/lib/fallback-plan";
import {
  normalizePantryFlags,
  normalizePlanForResponse,
  recomputeNutritionSummary,
} from "@/lib/plan-normalizer";
import { applyPreferenceConstraints } from "@/lib/plan-preference-constraints";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveUserId, getServiceClient } from "@/lib/db";
import type { GeneratePlanToolInput } from "@/app/ai/tools";

const AI_MAX_ATTEMPTS = 2;

function buildMetadataConstraintSummary(changesSummary: string[]): string {
  if (changesSummary.length === 0) return "";

  const allergenCount = changesSummary.filter((entry) =>
    entry.includes("(allergen:"),
  ).length;
  const softObjectiveCount = changesSummary.filter((entry) =>
    entry.includes("soft objective"),
  ).length;

  const swapCount = changesSummary.length;
  const examples = changesSummary
    .slice(0, 3)
    .map((entry) => {
      const match = entry.match(/^(.+?)\s*->\s*(.+?)\s*\(/);
      return match ? `${match[1].trim()} → ${match[2].trim()}` : null;
    })
    .filter(Boolean)
    .join("; ");

  if (allergenCount > 0 && softObjectiveCount === 0) {
    return `${swapCount} ingredient${swapCount !== 1 ? "s were" : " was"} swapped to keep your plan allergen-free.${examples ? ` Examples: ${examples}.` : ""}`;
  }
  if (allergenCount > 0 && softObjectiveCount > 0) {
    return `${swapCount} ingredient${swapCount !== 1 ? "s were" : " was"} swapped (${allergenCount} for allergen safety, ${softObjectiveCount} for better eco/nutrition).${examples ? ` Examples: ${examples}.` : ""}`;
  }
  if (softObjectiveCount > 0) {
    return `${swapCount} ingredient${swapCount !== 1 ? "s were" : " was"} swapped for better eco and nutrition scores.${examples ? ` Examples: ${examples}.` : ""}`;
  }
  return `${swapCount} substitution${swapCount !== 1 ? "s" : ""} applied.${examples ? ` Examples: ${examples}.` : ""}`;
}

/*
  POST /api/plan/generate

  Example payload:
  {
    "profile": {
      "householdSize": 4,
      "zipCode": "55401",
      "dietaryFlags": ["gluten-free"],
      "cookingTimeLevel": "moderate"
    },
    "budget": {
      "snapRemaining": 250,
      "horizonDays": 7
    },
    "pantryItems": [
      { "name": "rice", "quantity": 5, "unit": "lbs" },
      { "name": "canned black beans", "quantity": 4, "unit": "items" }
    ],
    "targets": {
      "caloriesPerDay": 2000,
      "proteinTarget": 50
    }
  }
*/

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = GeneratePlanRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Sign in or use guest mode." },
        { status: 401 },
      );
    }

    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Try again later.",
          resetAt: new Date(rateCheck.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
            ),
          },
        },
      );
    }

    const constraints: GeneratePlanToolInput = {
      profile: parsed.data.profile,
      budget: parsed.data.budget,
      pantryItems: parsed.data.pantryItems,
      targets: parsed.data.targets,
      ...(parsed.data.additionalPreferences
        ? { additionalPreferences: parsed.data.additionalPreferences }
        : {}),
    };

    let rawPlan;
    let usedFallback = false;

    for (let attempt = 0; attempt < AI_MAX_ATTEMPTS; attempt++) {
      try {
        rawPlan = await generateMealPlan(constraints);
        break;
      } catch (error) {
        if (attempt === AI_MAX_ATTEMPTS - 1) {
          console.error(
            "AI plan generation failed after retries, using fallback:",
            error instanceof Error ? error.message : error,
          );
          rawPlan = createFallbackPlan(constraints);
          usedFallback = true;
        }
      }
    }

    if (!rawPlan) {
      rawPlan = createFallbackPlan(constraints);
      usedFallback = true;
    }

    const { changesSummary } = await applyPreferenceConstraints(
      rawPlan,
      constraints.profile,
    );

    normalizePantryFlags(rawPlan, constraints.pantryItems);

    const pricingCtx: PricingContext = {
      zipCode: parsed.data.profile.zipCode,
    };
    const { plan, totalCost } = await recalculatePlanCosts(rawPlan, pricingCtx);

    recomputeNutritionSummary(plan);

    if (changesSummary.length > 0) {
      plan.confidenceNotes.push(
        buildMetadataConstraintSummary(changesSummary),
      );
    }

    if (usedFallback && !plan.confidenceNotes.some((n) => n.includes("FALLBACK"))) {
      plan.confidenceNotes.push(
        "FALLBACK: AI generation was unavailable. This plan uses a deterministic template.",
      );
    }

    const supabase = getServiceClient();
    const { data: inserted, error: insertError } = await supabase
      .from("plans")
      .insert({
        user_id: userId,
        raw_plan_json: plan,
        estimated_cost: totalCost,
        nutrition_score: 0,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("Failed to persist plan:", insertError);
      return NextResponse.json(
        { error: "Failed to save plan. Please try again." },
        { status: 500 },
      );
    }

    const response = normalizePlanForResponse(plan, inserted.id);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-RateLimit-Remaining": String(rateCheck.remaining),
      },
    });
  } catch (error) {
    console.error("Plan generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
