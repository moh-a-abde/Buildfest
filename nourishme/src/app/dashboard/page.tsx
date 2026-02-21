"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  Leaf,
  List,
  Loader2,
  Map,
  MapPin,
  Package,
  Pencil,
  Sparkles,
  Store,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import { AuthHeader } from "@/components/AuthHeader";
import { StoreCard } from "@/components/GroceryList";
import { useAuth } from "@/contexts/AuthContext";
import { buildGeneratePlanPayload } from "@/lib/plan-payload";
import type { CookingTimeLevel } from "@/lib/types";
import type { SnapStore, StoresResponse } from "@/app/api/stores/types";

const NearbyStoresMap = dynamic(() => import("@/components/NearbyStoresMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-lg border border-border/70 bg-muted/10 flex items-center justify-center" style={{ height: 360 }}>
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface ProfileData {
  household_size: number;
  zip_code: string;
  dietary_flags: string[];
  cooking_time_level: CookingTimeLevel;
  allergen_exclusions?: string[];
  eco_priority_enabled?: boolean;
}

interface BudgetData {
  snap_remaining: number;
  horizon_days: number;
}

interface PantryItemData {
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
}

interface RecentPlan {
  planId: string;
  estimatedTotalCost: number;
  createdAt: string;
}

const COOKING_LABELS: Record<CookingTimeLevel, string> = {
  quick: "Under 30 min",
  moderate: "30–60 min",
  extended: "Over 60 min",
};

function loadJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function loadBudgetCompat(): BudgetData | null {
  const raw = loadJSON<Record<string, unknown>>("nourishme_budget");
  if (!raw) return null;
  return {
    snap_remaining:
      (raw.snap_remaining as number) ?? (raw.snapRemaining as number) ?? 0,
    horizon_days:
      (raw.horizon_days as number) ?? (raw.horizonDays as number) ?? 7,
  };
}

function loadPantryCompat(): PantryItemData[] | null {
  const raw = loadJSON<Array<Record<string, unknown>>>("nourishme_pantry");
  if (!raw || !Array.isArray(raw)) return null;
  return raw.map((item) => ({
    name: (item.name as string) ?? "",
    quantity: (item.quantity as number) ?? 0,
    unit: (item.unit as string) ?? "items",
    expires_on: (item.expires_on as string) ?? (item.expiresOn as string) ?? null,
    barcode: (item.barcode as string) ?? null,
    brand: (item.brand as string) ?? null,
    off_metadata_ref:
      (item.off_metadata_ref as PantryItemData["off_metadata_ref"]) ??
      (item.offMetadataRef as PantryItemData["off_metadata_ref"]) ??
      null,
  }));
}

function DashboardStoresSection({ zipCode }: { zipCode: string }) {
  const [stores, setStores] = useState<SnapStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"usda_api" | "fallback">("usda_api");
  const [view, setView] = useState<"list" | "map">("map");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!zipCode) {
        if (active) setLoading(false);
        return;
      }

      let cancelled = false;

      fetch(`/api/stores?zip=${encodeURIComponent(zipCode)}`)
        .then((r) => r.json())
        .then((data: StoresResponse) => {
          if (cancelled || !active) return;
          setStores(data.stores ?? []);
          setSource(data.source);
        })
        .catch(() => {
          if (!cancelled && active) setStores([]);
        })
        .finally(() => {
          if (!cancelled && active) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    const cleanup = load();

    return () => {
      active = false;
      if (cleanup && typeof cleanup === 'function') cleanup();
    };
  }, [zipCode]);

  const incentiveCount = stores.filter((s) => s.healthyIncentives).length;
  const displayed = showAll ? stores : stores.slice(0, 5);

  return (
    <Card className="mb-8 border-border/80 bg-muted/20">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Nearby SNAP-Authorized Stores
            </CardTitle>
            <CardDescription className="mt-1">
              Based on your ZIP code ({zipCode})
            </CardDescription>
          </div>
          {!loading && stores.length > 0 && (
            <div className="flex items-center rounded-lg border border-border/70 p-0.5">
              <button
                type="button"
                onClick={() => setView("map")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  view === "map"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Map className="h-3.5 w-3.5" />
                Map
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  view === "list"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding SNAP-authorized stores near {zipCode}...
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              No SNAP-authorized stores found for ZIP {zipCode}.{" "}
              <a
                href="https://www.fns.usda.gov/snap/retailer-locator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Search on USDA SNAP Retailer Locator
              </a>
            </p>
          </div>
        ) : view === "map" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Store className="h-3.5 w-3.5" />
              <span>
                {stores.length} SNAP-authorized store{stores.length !== 1 ? "s" : ""} near{" "}
                {zipCode}
                {incentiveCount > 0 && (
                  <> · {incentiveCount} with Healthy Incentives</>
                )}
              </span>
              {source === "fallback" && (
                <Badge variant="secondary" className="text-[10px]">
                  Cached
                </Badge>
              )}
            </div>
            <NearbyStoresMap stores={stores} />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Store className="h-3.5 w-3.5" />
              <span>
                {stores.length} SNAP-authorized store{stores.length !== 1 ? "s" : ""} near{" "}
                {zipCode}
                {incentiveCount > 0 && (
                  <> · {incentiveCount} with Healthy Incentives</>
                )}
              </span>
              {source === "fallback" && (
                <Badge variant="secondary" className="text-[10px]">
                  Cached
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              {displayed.map((store, idx) => (
                <StoreCard key={`${store.name}-${idx}`} store={store} />
              ))}
            </div>
            {stores.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show fewer" : `Show all ${stores.length} stores`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const ESTIMATED_GENERATION_SECONDS = 120;
  const { user, isGuest, isLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [pantry, setPantry] = useState<PantryItemData[] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateStatus, setGenerateStatus] = useState<string | null>(null);
  const [recentPlans, setRecentPlans] = useState<RecentPlan[]>([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [preferencesInput, setPreferencesInput] = useState("");
  const [plansEditMode, setPlansEditMode] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);

  useEffect(() => {
    setProfile(loadJSON<ProfileData>("nourishme_profile"));
    setBudget(loadBudgetCompat());
    setPantry(loadPantryCompat());
    setMounted(true);

    // Then hydrate from API for authoritative data
    Promise.all([
      fetch("/api/profile").then((r) => r.json()).catch(() => ({})),
      fetch("/api/budget").then((r) => r.json()).catch(() => ({})),
      fetch("/api/pantry").then((r) => r.json()).catch(() => ({})),
      fetch("/api/plan").then((r) => r.json()).catch(() => ({})),
    ]).then(([profileRes, budgetRes, pantryRes, plansRes]) => {
      if (profileRes.profile) {
        setProfile(profileRes.profile);
        localStorage.setItem(
          "nourishme_profile",
          JSON.stringify(profileRes.profile),
        );
      }
      if (budgetRes.budget) {
        setBudget(budgetRes.budget);
        localStorage.setItem(
          "nourishme_budget",
          JSON.stringify(budgetRes.budget),
        );
      }
      if (pantryRes.items && pantryRes.items.length > 0) {
        setPantry(pantryRes.items);
        localStorage.setItem(
          "nourishme_pantry",
          JSON.stringify(pantryRes.items),
        );
      }
      if (plansRes.plans && Array.isArray(plansRes.plans)) {
        setRecentPlans(plansRes.plans);
      }
    });
  }, []);

  const setupComplete = useMemo(
    () => !!profile && !!budget && pantry !== null && pantry.length > 0,
    [profile, budget, pantry],
  );

  const steps = useMemo(
    () => [
      {
        label: "Profile",
        done: !!profile,
        href: profile ? "/onboarding?edit=1" : "/onboarding",
      },
      { label: "Budget", done: !!budget, href: "/budget" },
      {
        label: "Pantry",
        done: pantry !== null && pantry.length > 0,
        href: "/pantry/edit",
      },
    ],
    [profile, budget, pantry],
  );

  const completedCount = steps.filter((s) => s.done).length;
  const generationPhase =
    generationElapsedSeconds < 15
      ? 0
      : generationElapsedSeconds < 40
        ? 1
        : 2;
  const generationProgressPercent = Math.min(
    95,
    Math.round((generationElapsedSeconds / ESTIMATED_GENERATION_SECONDS) * 100),
  );

  useEffect(() => {
    if (!isGenerating) {
      setGenerationElapsedSeconds(0);
      return;
    }
    const interval = window.setInterval(() => {
      setGenerationElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isGenerating]);

  async function handleDeletePlan(planId: string) {
    setDeletingPlanId(planId);
    setPlansError(null);
    try {
      const res = await fetch(`/api/plan/${planId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete plan");
      }
      setRecentPlans((prev) => prev.filter((p) => p.planId !== planId));
    } catch (err) {
      setPlansError(
        err instanceof Error ? err.message : "Failed to delete plan",
      );
    } finally {
      setDeletingPlanId(null);
    }
  }

  async function handleGeneratePlan(additionalPreferences?: string) {
    if (!profile || !budget || !pantry) return;
    let shouldResetGeneratingState = true;
    setIsGenerating(true);
    setGenerateError(null);
    setGenerateStatus("Preparing your request...");
    try {
      const payload = buildGeneratePlanPayload(profile, budget, pantry, additionalPreferences);
      setGenerateStatus(
        "Generating your meal plan with AI. This usually takes about 2 minutes.",
      );
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const details = Array.isArray(data.details)
          ? data.details
              .map((d: { path?: Array<string | number>; message?: string }) => {
                const path = Array.isArray(d.path) ? d.path.join(".") : "request";
                return `${path}: ${d.message ?? "invalid value"}`;
              })
              .join("; ")
          : null;
        throw new Error(
          details || data.error || `Plan generation failed (${res.status})`,
        );
      }
      const data = await res.json();
      if (!data?.planId) {
        throw new Error("Plan generated but no plan ID was returned.");
      }

      setGenerateStatus("Plan ready. Redirecting...");
      shouldResetGeneratingState = false;
      const destination = `/plan?planId=${encodeURIComponent(data.planId as string)}`;
      setRecentPlans((prev) => [
        {
          planId: data.planId as string,
          estimatedTotalCost: Number(data.estimatedTotalCost ?? 0),
          createdAt: new Date().toISOString(),
        },
        ...prev.filter((p) => p.planId !== data.planId).slice(0, 9),
      ]);
      router.push(destination);

      // Fallback navigation in case client routing does not complete.
      setTimeout(() => {
        if (window.location.pathname === "/dashboard") {
          window.location.assign(destination);
        }
      }, 1200);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Failed to generate plan",
      );
    } finally {
      if (shouldResetGeneratingState) {
        setIsGenerating(false);
        setGenerateStatus(null);
      }
    }
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AuthHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <AuthHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {user
              ? `Welcome back${user.email ? `, ${user.email.split("@")[0]}` : ""}`
              : isGuest
                ? "Welcome, Guest"
                : "Your Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {setupComplete
              ? "You're all set. Generate a meal plan or update your info below."
              : "Complete the steps below to generate your first meal plan."}
          </p>
        </div>

        {/* Setup progress */}
        {!setupComplete && (
          <Card className="mb-8 border-primary/20 bg-primary/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Setup Progress
              </CardTitle>
              <CardDescription>
                {completedCount} of {steps.length} steps complete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                {steps.map((s) => (
                  <div
                    key={s.label}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      s.done ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              {steps
                .filter((s) => !s.done)
                .slice(0, 1)
                .map((s) => (
                  <Button key={s.label} asChild>
                    <Link href={s.href}>
                      Complete {s.label}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Generate Plan CTA */}
        {setupComplete && (
          <Card className="mb-8 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 shadow-sm">
            <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold mb-1">
                  Ready to generate your meal plan
                </h2>
                <p className="text-muted-foreground">
                  We&apos;ll create a personalized {budget?.horizon_days ?? 7}-day plan based on your
                  profile, budget, and pantry.
                </p>
              </div>
              <Button
                size="lg"
                className="h-11 px-6 self-stretch sm:self-auto sm:min-w-[180px]"
                disabled={isGenerating}
                onClick={() => setShowGenerateDialog(true)}
              >
                {isGenerating ? "Generating..." : "Generate Plan"}
              </Button>
            </CardContent>
            {generateError && (
              <div className="px-6 pb-4 -mt-2">
                <p className="text-sm text-destructive">{generateError}</p>
              </div>
            )}
            {isGenerating && generateStatus && (
              <div className="px-6 pb-5 -mt-1">
                <div className="rounded-xl border border-primary/20 bg-background/85 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{generateStatus}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {Math.min(generationElapsedSeconds, ESTIMATED_GENERATION_SECONDS)}s / ~120s
                    </p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                      style={{ width: `${generationProgressPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      "Reading profile",
                      "Matching pantry",
                      "Building your plan",
                    ].map((phase, index) => {
                      const isComplete = index < generationPhase;
                      const isActive = index === generationPhase;
                      return (
                        <div
                          key={phase}
                          className={`rounded-md border px-2 py-2 text-center text-[11px] sm:text-xs transition-colors ${
                            isComplete
                              ? "border-primary/30 bg-primary/5 text-foreground"
                              : isActive
                                ? "border-primary/40 bg-primary/10 text-foreground animate-pulse"
                                : "border-border/70 text-muted-foreground"
                          }`}
                        >
                          {phase}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Recent Plans */}
        {setupComplete && (
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">Recent Meal Plans</CardTitle>
                <CardDescription>
                  Reopen previous generated plans.
                </CardDescription>
              </div>
              {recentPlans.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    setPlansEditMode((prev) => !prev);
                    setPlansError(null);
                  }}
                >
                  {plansEditMode ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Done
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No plans yet. Generate your first plan above.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentPlans.map((plan) => (
                    <div
                      key={plan.planId}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(plan.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Estimated total: $
                          {plan.estimatedTotalCost.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {plansEditMode ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={deletingPlanId === plan.planId}
                            onClick={() => handleDeletePlan(plan.planId)}
                          >
                            {deletingPlanId === plan.planId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              href={`/plan?planId=${encodeURIComponent(plan.planId)}`}
                            >
                              View Plan
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {plansError && (
                <p className="mt-3 text-sm text-destructive">{plansError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Nearby SNAP-Authorized Stores */}
        {setupComplete && profile?.zip_code && (
          <DashboardStoresSection zipCode={profile.zip_code} />
        )}

        {/* Info Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile</CardTitle>
                  <CardDescription className="text-xs">
                    Household &amp; preferences
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/onboarding?edit=1">
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {profile ? (
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <dt className="text-muted-foreground">Household</dt>
                    <dd className="ml-auto font-medium">
                      {profile.household_size}{" "}
                      {profile.household_size === 1 ? "person" : "people"}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <dt className="text-muted-foreground">ZIP Code</dt>
                    <dd className="ml-auto font-medium">
                      {profile.zip_code}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <dt className="text-muted-foreground">Cooking Time</dt>
                    <dd className="ml-auto font-medium">
                      {COOKING_LABELS[profile.cooking_time_level] ??
                        profile.cooking_time_level}
                    </dd>
                  </div>
                  {profile.dietary_flags.length > 0 && (
                    <div className="flex items-start gap-2 pt-1">
                      <Leaf className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                      <dt className="text-muted-foreground">Dietary</dt>
                      <dd className="ml-auto flex flex-wrap justify-end gap-1">
                        {profile.dietary_flags.map((flag) => (
                          <Badge
                            key={flag}
                            variant="secondary"
                            className="text-xs capitalize"
                          >
                            {flag}
                          </Badge>
                        ))}
                      </dd>
                    </div>
                  )}
                  {(profile.allergen_exclusions?.length ?? 0) > 0 && (
                    <div className="flex items-start gap-2 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                      <dt className="text-muted-foreground">Allergens</dt>
                      <dd className="ml-auto flex flex-wrap justify-end gap-1">
                        {profile.allergen_exclusions?.map((allergen) => (
                          <Badge
                            key={allergen}
                            variant="secondary"
                            className="text-xs capitalize"
                          >
                            {allergen.replace("-", " ")}
                          </Badge>
                        ))}
                      </dd>
                    </div>
                  )}
                  {profile.eco_priority_enabled && (
                    <div className="flex items-center gap-2">
                      <Leaf className="w-3.5 h-3.5 text-muted-foreground" />
                      <dt className="text-muted-foreground">Eco Priority</dt>
                      <dd className="ml-auto">
                        <Badge variant="secondary" className="text-xs">
                          Enabled
                        </Badge>
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    No profile yet
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/onboarding">Set up profile</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Budget</CardTitle>
                  <CardDescription className="text-xs">
                    SNAP balance &amp; planning window
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/budget">
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {budget ? (
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                    <dt className="text-muted-foreground">SNAP Balance</dt>
                    <dd className="ml-auto font-medium text-lg">
                      $
                      {(budget.snap_remaining ?? 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <dt className="text-muted-foreground">Planning Window</dt>
                    <dd className="ml-auto font-medium">
                      {budget.horizon_days} days
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    No budget set
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/budget">Set budget</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pantry Card — full width */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-accent/15 w-10 h-10 rounded-lg flex items-center justify-center text-accent-foreground">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Pantry</CardTitle>
                  <CardDescription className="text-xs">
                    Items you have at home
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/pantry/edit">
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pantry && pantry.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pantry
                    .filter((i) => i.name?.trim())
                    .map((item, idx) => (
                      <Badge
                        key={`${item.name}-${idx}`}
                        variant="secondary"
                        className="text-sm py-1 px-3"
                      >
                        {item.name}
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          {item.quantity} {item.unit}
                        </span>
                      </Badge>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    No pantry items yet
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/pantry/edit">Add pantry items</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Guest upsell */}
        {isGuest && (
          <Card className="mt-8 border-dashed">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6">
              <div className="flex-1 text-center sm:text-left">
                <p className="font-medium">Save your data across devices</p>
                <p className="text-sm text-muted-foreground">
                  Create an account to keep your profile, budget, and pantry
                  synced.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/auth/sign-up?redirect=/dashboard">
                  Create Account
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
        {/* Generate Plan Preferences Dialog */}
        <Dialog
          open={showGenerateDialog}
          onOpenChange={(open) => {
            if (!isGenerating) {
              setShowGenerateDialog(open);
              if (!open) setPreferencesInput("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Customize your plan</DialogTitle>
              <DialogDescription>
                Add any preferences for your meal plan, or leave blank to use
                your profile defaults.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {["High protein", "Low carb", "Quick meals", "Kid-friendly", "More vegetables"].map(
                  (chip) => {
                    const isActive = preferencesInput
                      .toLowerCase()
                      .includes(chip.toLowerCase());
                    return (
                      <button
                        key={chip}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
                        }`}
                        onClick={() => {
                          if (isActive) {
                            setPreferencesInput((prev) =>
                              prev
                                .replace(new RegExp(`,?\\s*${chip}`, "i"), "")
                                .replace(/^,\s*/, "")
                                .trim(),
                            );
                          } else {
                            setPreferencesInput((prev) =>
                              prev.trim() ? `${prev.trim()}, ${chip}` : chip,
                            );
                          }
                        }}
                      >
                        {chip}
                      </button>
                    );
                  },
                )}
              </div>

              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none resize-none"
                placeholder="e.g., high protein, low carb, more vegetables, no seafood..."
                maxLength={500}
                value={preferencesInput}
                onChange={(e) => setPreferencesInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground text-right">
                {preferencesInput.length}/500
              </p>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowGenerateDialog(false);
                  setPreferencesInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="w-full sm:w-auto sm:min-w-[150px]"
                onClick={() => {
                  setShowGenerateDialog(false);
                  handleGeneratePlan(preferencesInput.trim() || undefined);
                  setPreferencesInput("");
                }}
              >
                Generate Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
