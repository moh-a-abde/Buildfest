"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  DollarSign,
  Info,
  Leaf,
  Loader2,
  Package,
  ShoppingCart,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuthHeader } from "@/components/AuthHeader";
import { GroceryList } from "@/components/GroceryList";
import type {
  GeneratePlanResponse,
  Meal,
  DayPlan,
} from "@/app/api/plan/generate/types";
import {
  getDayPantryStats,
  getExpiringPantryItemsUsedInMeal,
  getPantryItemsExpiringSoon,
  getPantryItemsExpiringUrgent,
  countExpiringSoonUsedInPlan,
  type PantryItemWithExpiry,
} from "@/lib/plan-pantry-utils";

// ── Types ──

interface PlanMetrics {
  cost_score: number;
  nutrition_score: number;
  pantry_utilization_score: number;
  overall_score: number;
}

interface PlanData extends GeneratePlanResponse {
  metrics: PlanMetrics | null;
  createdAt?: string | null;
}

// ── Constants ──

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const SNAP_ED_LEARN_MORE_URL =
  "https://snaped.fns.usda.gov/resources/nutrition-education-materials/meal-planning-shopping-and-budgeting";
const NUTRITION_TARGET_PER_PERSON_MIN = 1800;
const NUTRITION_TARGET_PER_PERSON_MAX = 2400;

// ── Helpers ──

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function scoreBadge(score: number): string {
  if (score >= 75) return "Great";
  if (score >= 50) return "OK";
  return "Low";
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getWeekRangeLabel(
  plan: PlanData,
  createdAt: string | null
): string {
  const days = plan.mealsByDay.length;
  const first = plan.mealsByDay[0];
  const last = plan.mealsByDay[days - 1];

  if (first?.dateLabel && last?.dateLabel) {
    const firstMatch = first.dateLabel.match(/(\w{3})\s+(\w{3})\s+(\d+)/);
    const lastMatch = last.dateLabel.match(/(\w{3})\s+(\w{3})\s+(\d+)/);
    if (firstMatch && lastMatch) {
      return `Week of ${firstMatch[2]} ${firstMatch[3]} – ${lastMatch[2]} ${lastMatch[3]}`;
    }
  }

  if (createdAt) {
    const start = new Date(createdAt);
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `Week of ${fmt(start)} – ${fmt(end)}`;
  }

  return `${days} days`;
}

function getNutritionHighlights(meal: Meal): string[] {
  const highlights: string[] = [];
  if (meal.protein >= 20) highlights.push("High in protein");
  if (meal.protein >= 15 && meal.protein < 20) highlights.push("Good protein");
  if ((meal.fiber ?? 0) >= 5) highlights.push("Good fiber");
  if ((meal.fiber ?? 0) >= 8) highlights.push("High in fiber");
  if (meal.calories <= 400) highlights.push("Light option");
  if (meal.calories >= 600) highlights.push("Filling");
  return highlights.length > 0 ? highlights : ["Balanced meal"];
}

function substitutionLabel(reason?: string, reasonCodes?: string[]): string | null {
  if (reasonCodes?.includes("allergen_blocked")) return "Allergen-safe swap";
  if (reasonCodes?.includes("eco_preferred")) return "Eco-preferred swap";
  if (reasonCodes?.includes("better_nutri_score")) return "Nutrition-improved swap";
  if (reasonCodes?.includes("lower_nova_group")) return "Lower processing swap";
  if (reasonCodes?.includes("lower_carbon_footprint")) return "Lower carbon swap";
  if (reasonCodes?.includes("better_eco_score")) return "Eco-score improved swap";
  if (!reason) return null;
  if (reason === "allergen-safe") return "Allergen-safe swap";
  if (reason === "eco-preferred") return "Eco-preferred swap";
  return null;
}

// ── Loading Skeleton ──

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <AuthHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-9 w-28 bg-muted rounded-md" />
            <div className="space-y-2 flex-1">
              <div className="h-7 w-56 bg-muted rounded" />
              <div className="h-4 w-36 bg-muted rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-72 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Stat Card ──

function StatCard({
  label,
  value,
  subtitle,
  score,
  icon: Icon,
  infoTooltip,
}: {
  label: string;
  value: React.ReactNode;
  subtitle: string;
  score?: number;
  icon: React.ElementType;
  infoTooltip?: string;
}) {
  return (
    <Card className={`border ${score !== undefined ? scoreColor(score) : "border-border bg-muted"}`}>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/60">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium opacity-75 flex items-center gap-1">
              {label}
              {infoTooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help">
                      <Info className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{infoTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </p>
            <p className="text-lg font-bold leading-tight">{value}</p>
            <p className="text-xs opacity-60 truncate">{subtitle}</p>
          </div>
          {score !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {scoreBadge(score)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Plan Score Cards ──

function PlanScoreCards({
  plan,
  metrics,
  budgetAmount,
  pantryItems,
  expiringSoonUsed,
  householdSize,
}: {
  plan: PlanData;
  metrics: PlanMetrics;
  budgetAmount: number | null;
  pantryItems: PantryItemWithExpiry[];
  expiringSoonUsed: number;
  householdSize: number;
}) {
  const days = plan.mealsByDay.length;
  const avgCostPerDay = days > 0 ? plan.estimatedTotalCost / days : 0;
  const avgCalPerDay =
    days > 0
      ? Math.round(
          plan.mealsByDay.reduce((s, d) => s + d.dayCalories, 0) / days
        )
      : 0;
  const avgProteinPerDay =
    days > 0
      ? Math.round(
          plan.mealsByDay.reduce(
            (s, d) => s + d.meals.reduce((ms, m) => ms + m.protein, 0),
            0
          ) / days
        )
      : 0;
  const uniquePantryNames = new Set<string>();
  for (const d of plan.mealsByDay) {
    for (const m of d.meals) {
      for (const i of m.ingredients) {
        if (i.fromPantry) uniquePantryNames.add(i.name.toLowerCase().trim());
      }
    }
  }
  const targetMinCalories = NUTRITION_TARGET_PER_PERSON_MIN * householdSize;
  const targetMaxCalories = NUTRITION_TARGET_PER_PERSON_MAX * householdSize;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
      <StatCard
        label="Budget"
        value={`${formatCurrency(avgCostPerDay)}/day · ${formatCurrency(plan.estimatedTotalCost)}${budgetAmount !== null ? ` of ${formatCurrency(budgetAmount)}` : ""}`}
        subtitle={`${budgetAmount !== null ? (plan.estimatedTotalCost <= budgetAmount ? "Under budget" : "Over budget") : "Total cost"}`}
        score={metrics.cost_score}
        icon={DollarSign}
        infoTooltip="Daily target is calculated from your SNAP balance divided by days in the benefit cycle."
      />
      <StatCard
        label="Nutrition"
        value={`${avgCalPerDay.toLocaleString()} cal/day vs ${targetMinCalories.toLocaleString()}-${targetMaxCalories.toLocaleString()} target`}
        subtitle={`${avgProteinPerDay} g protein/day for ${householdSize} people`}
        score={metrics.nutrition_score}
        icon={Leaf}
        infoTooltip={`Nutrition score combines calorie target fit (${targetMinCalories.toLocaleString()}-${targetMaxCalories.toLocaleString()} cal/day for ${householdSize}), protein-calorie balance, and meal variety.`}
      />
      <StatCard
        label="Pantry Use"
        value={
          <>
            {uniquePantryNames.size} items used ·{" "}
            <span className="text-red-600">
              {expiringSoonUsed} expiring soon
            </span>
          </>
        }
        subtitle="From your pantry"
        icon={Package}
        infoTooltip="We plan from your pantry first, a SNAP-Ed recommended way to cut waste and avoid buying duplicates."
      />
    </div>
  );
}

// ── Meal Row ──

function MealRow({
  meal,
  pantryItems,
  onClick,
}: {
  meal: Meal;
  pantryItems: PantryItemWithExpiry[];
  onClick: () => void;
}) {
  const expiring = getExpiringPantryItemsUsedInMeal(meal, pantryItems);

  const expiryTooltip =
    expiring.length > 0
      ? `Uses ${expiring.map((e) => `${e.name} (expires in ${e.expiresInDays} days)`).join(", ")}`
      : undefined;

  return (
    <button
      onClick={onClick}
      title={meal.name}
      className="group w-full rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3 text-left transition-colors hover:border-border hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {MEAL_TYPE_LABEL[meal.mealType]}
              {expiring.length > 0 && expiryTooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Clock className="h-3 w-3 text-amber-600" />
                      {expiring.length} pantry item{expiring.length > 1 ? "s" : ""} expiring soon
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{expiryTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </p>
            <p className="truncate text-base font-semibold leading-snug" title={meal.name}>
              {meal.name}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(meal.estimatedCost)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{meal.calories} cal</p>
        </div>
      </div>
      <div className="sr-only">
        {MEAL_TYPE_LABEL[meal.mealType]} {meal.name} {formatCurrency(meal.estimatedCost)}{" "}
        {meal.calories} calories
      </div>
    </button>
  );
}

// ── Day Column ──

function DayColumn({
  day,
  idx,
  plan,
  pantryItems,
  onMealClick,
  urgentExpiring,
}: {
  day: DayPlan;
  idx: number;
  plan: PlanData;
  pantryItems: PantryItemWithExpiry[];
  onMealClick: (meal: Meal) => void;
  urgentExpiring: string[];
}) {
  const label = day.dateLabel || `Day ${idx + 1}`;
  const dayLabel = label.includes("Day") ? label : `Day ${idx + 1} · ${label}`;
  const pantryStats = getDayPantryStats(day, pantryItems);

  const mealTypes = ["breakfast", "lunch", "dinner"] as const;
  const meals = mealTypes
    .map((t) => day.meals.find((m) => m.mealType === t))
    .filter(Boolean) as Meal[];

  const hasUrgentInDay = urgentExpiring.length > 0;

  return (
    <Card
      key={day.dayIndex ?? idx}
      className="overflow-hidden border-border/80 bg-muted shadow-sm flex flex-col"
    >
      {hasUrgentInDay && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
          <span className="font-semibold">Use first:</span> {urgentExpiring.join(", ")} · Try not to
          skip today&apos;s meals
        </div>
      )}
      <CardHeader className="px-4 py-3 border-b bg-transparent">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <CardTitle className="text-base font-semibold truncate">{dayLabel}</CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground tabular-nums">
              {formatCurrency(day.dayCost)}
            </span>
            <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground tabular-nums">
              {day.dayCalories.toLocaleString()} cal
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2.5 flex-1 flex flex-col">
        {meals.map((meal) => (
          <MealRow
            key={meal.id}
            meal={meal}
            pantryItems={pantryItems}
            onClick={() => onMealClick(meal)}
          />
        ))}
        <div className="mt-auto pt-3 border-t text-xs text-muted-foreground space-y-1.5">
          <p className="flex items-center justify-between gap-2">
            <span>Pantry items used</span>
            <span className="font-medium text-foreground tabular-nums">
              {pantryStats.used}
              {pantryStats.expiringSoon > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  ({pantryStats.expiringSoon} expiring soon)
                </span>
              )}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Meal Detail Drawer ──

function MealDetailDrawer({
  meal,
  plan,
  pantryItems,
  householdSize,
  open,
  onOpenChange,
}: {
  meal: Meal | null;
  plan: PlanData | null;
  pantryItems: PantryItemWithExpiry[];
  householdSize: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!meal) return null;

  const pantryUsed = meal.ingredients.filter((i) => i.fromPantry);
  const toBuy = meal.ingredients.filter((i) => !i.fromPantry);
  const expiring = getExpiringPantryItemsUsedInMeal(meal, pantryItems);
  const highlights = getNutritionHighlights(meal);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto bg-background" side="right">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-lg font-semibold leading-tight pr-8">
            {meal.name}
          </SheetTitle>
          <SheetDescription asChild>
            <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary" className="font-normal">
                {MEAL_TYPE_LABEL[meal.mealType]}
              </Badge>
              <span>{formatCurrency(meal.estimatedCost)}</span>
              <span>{meal.calories} cal</span>
            </p>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-4 pt-4 pb-6">
          {/* 1. Overview */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Overview
            </h3>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center rounded-md border border-border/70 bg-background px-2.5 py-1 text-xs">
                {householdSize} servings
              </span>
              <span className="inline-flex items-center rounded-md border border-border/70 bg-background px-2.5 py-1 text-xs">
                {meal.protein}g protein
              </span>
              {(meal.fiber ?? 0) > 0 && (
                <span className="inline-flex items-center rounded-md border border-border/70 bg-background px-2.5 py-1 text-xs">
                  {meal.fiber}g fiber
                </span>
              )}
            </div>
          </div>

          {/* 2. Budget & pantry */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Budget & pantry
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-2">
                <span className="text-sm font-medium">Cost</span>
                <span className="text-sm font-semibold">{formatCurrency(meal.estimatedCost)}</span>
              </div>
              <p className="text-xs text-muted-foreground">SNAP-eligible</p>

              {pantryUsed.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">From pantry</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pantryUsed.map((i, idx) => (
                      <div key={idx} className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground">
                          {i.name}
                        </span>
                        {substitutionLabel(i.substitutionReason, i.reasonCodes) && (
                          <Badge variant="secondary" className="text-[10px]">
                            {substitutionLabel(i.substitutionReason, i.reasonCodes)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {toBuy.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">To buy</p>
                  <div className="flex flex-wrap gap-1.5">
                    {toBuy.map((i, idx) => (
                      <div key={idx} className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md border border-border/70 bg-background px-2 py-1 text-xs">
                          {i.name}
                        </span>
                        {substitutionLabel(i.substitutionReason, i.reasonCodes) && (
                          <Badge variant="secondary" className="text-[10px]">
                            {substitutionLabel(i.substitutionReason, i.reasonCodes)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expiring.length > 0 && (
                <div className="rounded-md border border-border/70 bg-background px-3 py-2">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>
                    Uses {expiring.length} item{expiring.length > 1 ? "s" : ""} expiring in{" "}
                    {expiring.map((e) => `${e.expiresInDays} days`).join(", ")}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Nutrition highlights */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5" />
              Nutrition highlights
            </h3>
            <ul className="space-y-1.5 text-sm">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Leftovers & waste tips */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Leftovers & waste tips
            </h3>
            <p className="text-sm leading-relaxed">
              {meal.notes ||
                "Freeze extra portions within 2 days to prevent waste."}
            </p>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Content ──

function PlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [scoring, setScoring] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState<number | null>(null);
  const [profile, setProfile] = useState<{ household_size: number; zip_code: string } | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItemWithExpiry[]>([]);

  useEffect(() => {
    if (!planId) {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;

    async function loadPlan() {
      try {
        const res = await fetch(`/api/plan/${planId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to load plan (${res.status})`);
        }
        const data: PlanData = await res.json();
        if (cancelled) return;
        setPlan(data);

        if (!data.metrics) {
          setScoring(true);
          try {
            const scoreRes = await fetch("/api/plan/score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ planId }),
            });
            if (scoreRes.ok && !cancelled) {
              const metrics = await scoreRes.json();
              setPlan((prev) =>
                prev
                  ? {
                      ...prev,
                      metrics: {
                        cost_score: metrics.costScore,
                        nutrition_score: metrics.nutritionScore,
                        pantry_utilization_score:
                          metrics.pantryUtilizationScore,
                        overall_score: metrics.overallScore,
                      },
                    }
                  : prev
              );
            }
          } catch {
            /* scoring is non-critical */
          } finally {
            if (!cancelled) setScoring(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load plan"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    try {
      const raw = localStorage.getItem("nourishme_budget");
      if (raw) {
        const parsed = JSON.parse(raw);
        setBudgetAmount(
          parsed.snap_remaining ?? parsed.snapRemaining ?? null
        );
      }
    } catch {
      /* ignore */
    }

    loadPlan();
    return () => {
      cancelled = true;
    };
  }, [planId, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()).catch(() => ({})),
      fetch("/api/pantry").then((r) => r.json()).catch(() => ({})),
    ]).then(([profileRes, pantryRes]) => {
      if (profileRes.profile) {
        setProfile(profileRes.profile);
      }
      if (pantryRes?.items) {
        setPantryItems(
          pantryRes.items.map(
            (i: {
              name: string;
              quantity: number;
              unit: string;
              expires_on?: string | null;
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
            }) => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              expires_on: i.expires_on ?? null,
              barcode: i.barcode ?? null,
              brand: i.brand ?? null,
              off_metadata_ref: i.off_metadata_ref ?? null,
            }),
          )
        );
      }
    });
  }, []);

  if (!planId || loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-secondary/30">
        <AuthHeader />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="py-10 text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-lg font-semibold">Unable to Load Plan</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!plan) return <LoadingSkeleton />;

  const { metrics } = plan;
  const days = plan.mealsByDay.length;
  const householdSize = profile?.household_size ?? 2;
  const expiringSoonUsed = countExpiringSoonUsedInPlan(pantryItems, plan.mealsByDay);
  const urgentExpiring = getPantryItemsExpiringUrgent(pantryItems).map(
    (p) => p.name
  );

  const computedAvgCal =
    days > 0
      ? Math.round(
          plan.mealsByDay.reduce((s, d) => s + d.dayCalories, 0) / days
        )
      : 0;
  const computedAvgProtein =
    days > 0
      ? Math.round(
          plan.mealsByDay.reduce(
            (s, d) => s + d.meals.reduce((ms, m) => ms + m.protein, 0),
            0
          ) / days
        )
      : 0;
  const computedAvgFiber =
    days > 0
      ? Math.round(
          plan.mealsByDay.reduce(
            (s, d) =>
              s + d.meals.reduce((ms, m) => ms + (m.fiber ?? 0), 0),
            0
          ) / days
        )
      : 0;

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <AuthHeader />

      <main className="flex-1 w-full max-w-[1800px] mx-auto px-4 py-6 xl:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Your {days}-Day Meal Plan
            </h1>
            <p className="text-sm text-muted-foreground">
              {getWeekRangeLabel(plan, plan.createdAt ?? null)} · 3 meals/day ·  {householdSize} people
            </p>
          </div>
        </div>

        {/* Score Cards */}
        {metrics ? (
          <PlanScoreCards
            plan={plan}
            metrics={metrics}
            budgetAmount={budgetAmount}
            pantryItems={pantryItems}
            expiringSoonUsed={expiringSoonUsed}
            householdSize={householdSize}
          />
        ) : scoring ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 p-3 bg-secondary/50 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            Calculating plan scores...
          </div>
        ) : null}

        {/* 7-Day Calendar Grid - 1 day per row on small screens, 2 on larger */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {plan.mealsByDay.map((day, idx) => {
            const dayUrgent = getPantryItemsExpiringUrgent(pantryItems);
            const dayUrgentNames = dayUrgent
              .filter((p) => {
                for (const m of day.meals) {
                  for (const ing of m.ingredients) {
                    if (ing.fromPantry) {
                      const ingLower = ing.name.toLowerCase();
                      const panLower = p.name.toLowerCase();
                      if (
                        ingLower.includes(panLower) ||
                        panLower.includes(ingLower)
                      )
                        return true;
                    }
                  }
                }
                return false;
              })
              .map((p) => p.name);

            return (
              <DayColumn
                key={day.dayIndex ?? idx}
                day={day}
                idx={idx}
                plan={plan}
                pantryItems={pantryItems}
                onMealClick={setSelectedMeal}
                urgentExpiring={dayUrgentNames}
              />
            );
          })}
        </div>

        {/* Grocery List + Nearby SNAP Stores */}
        {plan.shoppingList && plan.shoppingList.length > 0 && (
          <GroceryList
            shoppingList={plan.shoppingList}
            householdSize={householdSize}
            zipCode={profile?.zip_code ?? ""}
            estimatedTotalCost={plan.estimatedTotalCost}
          />
        )}

        {/* Nutrition Summary - Card A */}
        {plan.nutritionSummary && (
          <div className="space-y-4 mb-6">
            <Card className="border-border/80 bg-muted/20">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-primary" />
                  Nutrition at a glance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4">
                  <p className="text-foreground">
                    <span className="text-muted-foreground">Avg calories/day:</span>{" "}
                    <span className="font-semibold tabular-nums">{computedAvgCal.toLocaleString()}</span>
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted-foreground">Avg protein/day:</span>{" "}
                    <span className="font-semibold tabular-nums">{computedAvgProtein}g</span>
                  </p>
                  {computedAvgFiber > 0 && (
                    <p className="text-foreground">
                      <span className="text-muted-foreground">Avg fiber/day:</span>{" "}
                      <span className="font-semibold tabular-nums">{computedAvgFiber}g</span>
                    </p>
                  )}
                </div>
                {plan.nutritionSummary.notes.length > 0 && (
                  <ul className="space-y-2">
                    {plan.nutritionSummary.notes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-sm">
                  <a
                    href={SNAP_ED_LEARN_MORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/90 hover:text-primary hover:underline"
                  >
                    Learn more: Meal planning on a SNAP budget (SNAP-Ed)
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Card B - Assumptions & notes (collapsible) */}
            {plan.confidenceNotes.length > 0 && (
              <Card className="border-border/80 bg-muted/20">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base">Assumptions & notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Planning assumptions used to generate this meal plan.
                  </p>
                  <ul className="space-y-2">
                    {plan.confidenceNotes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-700" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Meal Detail Drawer */}
      <MealDetailDrawer
        meal={selectedMeal}
        plan={plan}
        pantryItems={pantryItems}
        householdSize={householdSize}
        open={!!selectedMeal}
        onOpenChange={(open) => !open && setSelectedMeal(null)}
      />
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PlanContent />
    </Suspense>
  );
}
