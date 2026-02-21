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
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" as const } },
};
import { AuthHeader } from "@/components/AuthHeader";
import { StoreCard } from "@/components/GroceryList";
import { AskCoachButton } from "@/components/AskCoachButton";
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

    function load(): (() => void) | void {
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
    <Card className="shadow-sm rounded-2xl border-border/80 flex flex-col h-full bg-background">
      <CardHeader className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Nearby Stores
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <CardDescription className="text-sm font-medium">
                SNAP-authorized near <span className="font-mono">{zipCode}</span>
              </CardDescription>
              <AskCoachButton
                prompt="What SNAP items are eligible at stores near me? Which stores have Healthy Incentives programs?"
                label="Ask Coach"
                tooltip="Get tips on SNAP shopping at nearby stores"
              />
            </div>
          </div>
          {!loading && stores.length > 0 && (
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg">
              <Button
                variant={view === "map" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("map")}
                className="h-8 text-xs px-3 rounded-md font-medium"
              >
                <Map className="h-3.5 w-3.5 mr-1.5" />
                Map
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
                className="h-8 text-xs px-3 rounded-md font-medium"
              >
                <List className="h-3.5 w-3.5 mr-1.5" />
                List
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 flex flex-col flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground font-medium">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Finding SNAP-authorized stores...
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-muted/20 p-6 text-center">
            <p className="text-sm text-muted-foreground font-medium mb-2">
              No SNAP-authorized stores found for ZIP <span className="font-mono">{zipCode}</span>.
            </p>
            <a
              href="https://www.fns.usda.gov/snap/retailer-locator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              Search USDA Locator
            </a>
          </div>
        ) : view === "map" ? (
          <div className="space-y-4 flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Store className="h-4 w-4" />
              <span>
                <span className="font-mono font-semibold text-foreground">{stores.length}</span> store{stores.length !== 1 ? "s" : ""}
                {incentiveCount > 0 && (
                  <> · <span className="font-mono font-semibold text-foreground">{incentiveCount}</span> with Incentives</>
                )}
              </span>
              {source === "fallback" && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Cached</Badge>
              )}
            </div>
            <div className="rounded-xl overflow-hidden flex-1 border border-border/50">
              <NearbyStoresMap stores={stores} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Store className="h-4 w-4" />
              <span>
                <span className="font-mono font-semibold text-foreground">{stores.length}</span> store{stores.length !== 1 ? "s" : ""}
                {incentiveCount > 0 && (
                  <> · <span className="font-mono font-semibold text-foreground">{incentiveCount}</span> with Incentives</>
                )}
              </span>
              {source === "fallback" && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Cached</Badge>
              )}
            </div>
            <div className="space-y-2">
              {displayed.map((store, idx) => (
                <StoreCard key={`${store.name}-${idx}`} store={store} />
              ))}
            </div>
            {stores.length > 5 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-sm font-medium rounded-xl"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show fewer" : `Show all ${stores.length} stores`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>  );
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
      : generationElapsedSeconds < 30
        ? 1
        : generationElapsedSeconds < 60
          ? 2
          : 3;
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
    <div className="min-h-screen flex flex-col bg-background relative">
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />
      <AuthHeader />

      <main className="flex-1 container mx-auto px-4 sm:px-6 pt-28 pb-12 max-w-5xl relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Greeting */}
          <motion.div variants={itemVariants} className="mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {user
                ? `Welcome back${user.email ? `, ${user.email.split("@")[0]}` : ""}`
                : isGuest
                  ? "Welcome, Guest"
                  : "Your Dashboard"}
            </h1>
            <div className="mt-4 border-l-4 border-primary/40 pl-4 max-w-[65ch]">
              <p className="text-lg text-muted-foreground font-medium">
                {setupComplete
                  ? "Welcome back — your pantry and budget are ready."
                  : "You're close — finish setup to generate a plan."}
              </p>
            </div>
          </motion.div>

          {/* Setup progress */}
          {!setupComplete && (
            <motion.div variants={itemVariants}>
              <Card className="border-primary/15 bg-primary/[0.02] shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary/70" />
                    Getting started
                  </CardTitle>
                  <CardDescription className="font-medium text-sm mt-1">
                    <span className="font-mono">{completedCount}</span> of <span className="font-mono">{steps.length}</span> steps complete
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="flex gap-2 mb-6">
                    {steps.map((s) => (
                      <div
                        key={s.label}
                        className={`h-2.5 flex-1 rounded-full transition-all duration-500 ${
                          s.done ? "bg-primary" : "bg-primary/10"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-4">
                    {steps.map((s) => (
                      <div key={s.label} className="flex items-center justify-between bg-background p-4 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                        <span className={`text-base flex items-center gap-3 ${s.done ? "text-primary font-extrabold tracking-tight" : "text-muted-foreground font-medium"}`}>
                          {s.done && <Check className="w-5 h-5" />}
                          {s.done ? `${s.label} saved` : `Add ${s.label.toLowerCase()}`}
                        </span>
                        {!s.done && (
                          <Button variant="secondary" size="sm" asChild className="rounded-lg font-semibold">
                            <Link href={s.href}>
                              Set up your {s.label.toLowerCase()} <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Generate Plan CTA */}
          {setupComplete && (
            <motion.div variants={itemVariants}>
              <Card className="border-primary/20 bg-card shadow-sm hover:shadow-primary/10 rounded-2xl overflow-hidden transition-all duration-700 ease-out hover:shadow-md motion-safe:hover:-translate-y-0.5">
                <CardContent className="flex flex-col md:grid md:grid-cols-[1fr_auto] md:items-center p-4 md:p-6 lg:p-8 md:gap-6 lg:gap-10">
                  <div className="text-left max-w-[42rem]">
                    <h2 className="text-2xl font-extrabold tracking-tight leading-tight text-foreground">
                      Generate meals that stay within your SNAP balance.
                    </h2>
                    <p className="text-base text-muted-foreground font-medium mt-3 md:mt-4">
                      Built around your pantry, household of <span className="font-mono">{profile?.household_size ?? 1}</span>, and <span className="font-mono">{budget?.horizon_days ?? 7}</span>-day window.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="h-12 px-8 w-full md:w-auto shadow-sm hover:shadow-md hover:shadow-primary/20 transition-all duration-300 rounded-xl font-semibold mt-5 md:mt-0"
                    disabled={isGenerating}
                    onClick={() => setShowGenerateDialog(true)}
                  >
                    {isGenerating ? "Generating..." : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Build My Meal Plan
                      </>
                    )}
                  </Button>
                </CardContent>
                {generateError && (
                  <div className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6 -mt-2">
                    <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm font-medium text-destructive">
                      {generateError}
                    </div>
                  </div>
                )}
                {isGenerating && generateStatus && (
                  <div className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6 -mt-2">
                    <div className="rounded-xl border border-primary/20 bg-background/85 p-5 backdrop-blur-sm shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold tracking-tight text-foreground">{generateStatus}</p>
                        <p className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                          This usually takes about 2 minutes — we're being thorough.
                        </p>
                      </div>
                      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-1000 ease-in-out"
                          style={{ width: `${generationProgressPercent}%` }}
                        />
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-3">
                        {[
                          "Reviewing pantry...",
                          "Building meals...",
                          "Checking budget...",
                          "Creating your list",
                        ].map((phase, index) => {
                          const isComplete = index < generationPhase;
                          const isActive = index === generationPhase;
                          return (
                            <div
                              key={phase}
                              className={`rounded-lg border px-2 py-2.5 text-center text-xs font-medium transition-colors ${
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
            </motion.div>
          )}

          {/* Main Content Grid: Plans + Stores */}
          {setupComplete && (
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Previous Plans */}
              <div className="lg:col-span-7 flex flex-col h-full">
                <Card className="shadow-sm rounded-2xl border-border/80 flex flex-col h-full bg-background">
                  <CardHeader className="p-6 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-extrabold tracking-tight">Previous Plans</CardTitle>
                        <CardDescription className="text-sm font-medium mt-1">
                          Tap to reopen — prices reflect estimates at the time they were created.
                        </CardDescription>
                      </div>
                      {recentPlans.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg"
                          onClick={() => {
                            setPlansEditMode((prev) => !prev);
                            setPlansError(null);
                          }}
                        >
                          {plansEditMode ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="font-medium">Done</span>
                            </>
                          ) : (
                            <>
                              <Pencil className="w-4 h-4" />
                              <span className="font-medium">Edit</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col">
                    {recentPlans.length === 0 ? (
                      <div className="p-6 text-sm text-muted-foreground font-medium text-center">
                        No plans yet — generate one above and it will appear here.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50 flex-1">
                        {recentPlans.map((plan) => (
                          <div
                            key={plan.planId}
                            className="flex items-center justify-between p-4 sm:px-6 hover:bg-muted/30 transition-colors group"
                          >
                            <div>
                              <p className="text-sm font-extrabold tracking-tight text-foreground">
                                {new Date(plan.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                                Est. total: <span className="font-mono text-foreground font-semibold">${plan.estimatedTotalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {plansEditMode ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
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
                                <Button size="sm" variant="outline" asChild className="rounded-lg font-medium shadow-sm transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
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
                      <div className="m-4 rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm font-medium text-destructive">
                        {plansError}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Nearby SNAP-Authorized Stores */}
              <div className="lg:col-span-5 flex flex-col h-full">
                {profile?.zip_code ? (
                  <DashboardStoresSection zipCode={profile.zip_code} />
                ) : (
                  <div className="h-full rounded-2xl border border-dashed border-border/80 flex items-center justify-center p-6 text-muted-foreground text-sm font-medium text-center bg-background">
                    Set your ZIP code in your profile to see nearby SNAP-authorized stores.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Info Cards Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Profile Card */}
            <Card className="shadow-sm rounded-2xl border-border/80 flex flex-col bg-background">
              <CardHeader className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/8 w-10 h-10 rounded-xl flex items-center justify-center text-primary">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-extrabold tracking-tight">Profile</CardTitle>
                      <CardDescription className="text-sm font-medium mt-0.5">
                        Household profile
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                    <Link href="/onboarding?edit=1">
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-1">
                {profile ? (
                  <dl className="grid grid-cols-1 gap-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap">
                        <Users className="w-4 h-4" /> Household
                      </dt>
                      <dd className="font-mono font-semibold text-foreground text-right">
                        {profile.household_size} <span className="font-sans text-muted-foreground font-medium">{profile.household_size === 1 ? "person" : "people"}</span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap">
                        <MapPin className="w-4 h-4" /> ZIP Code
                      </dt>
                      <dd className="font-mono font-semibold text-foreground text-right">
                        {profile.zip_code}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap">
                        <Clock className="w-4 h-4" /> Cooking Time
                      </dt>
                      <dd className="font-medium text-foreground text-right">
                        {COOKING_LABELS[profile.cooking_time_level] ?? profile.cooking_time_level}
                      </dd>
                    </div>
                    {profile.dietary_flags.length > 0 && (
                      <div className="flex items-start justify-between gap-4 pt-1">
                        <dt className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap mt-1">
                          <Leaf className="w-4 h-4" /> Dietary
                        </dt>
                        <dd className="flex flex-wrap justify-end gap-1.5">
                          {profile.dietary_flags.map((flag) => (
                            <Badge key={flag} variant="secondary" className="px-2 py-0.5 text-xs font-medium rounded-md bg-muted hover:bg-muted/80">
                              {flag}
                            </Badge>
                          ))}
                        </dd>
                      </div>
                    )}
                    {(profile.allergen_exclusions?.length ?? 0) > 0 && (
                      <div className="flex items-start justify-between gap-4 pt-1">
                        <dt className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap mt-1">
                          <AlertTriangle className="w-4 h-4" /> Allergens
                        </dt>
                        <dd className="flex flex-wrap justify-end gap-1.5">
                          {profile.allergen_exclusions?.map((allergen) => (
                            <Badge key={allergen} variant="secondary" className="px-2 py-0.5 text-xs font-medium rounded-md bg-muted hover:bg-muted/80">
                              {allergen.replace("-", " ")}
                            </Badge>
                          ))}
                        </dd>
                      </div>
                    )}
                    {profile.eco_priority_enabled && (
                      <div className="flex items-center justify-between gap-4 pt-1">
                        <dt className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap">
                          <Leaf className="w-4 h-4" /> Eco Priority
                        </dt>
                        <dd className="text-right">
                          <Badge variant="secondary" className="px-2 py-0.5 text-xs font-medium rounded-md bg-muted hover:bg-muted/80 border-border/50">
                            Enabled
                          </Badge>
                        </dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground font-medium mb-4">
                      No profile yet
                    </p>
                    <Button size="sm" variant="outline" className="rounded-lg font-medium" asChild>
                      <Link href="/onboarding">Set up profile</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget Card */}
            <Card className="shadow-sm rounded-2xl border-border/80 flex flex-col bg-background">
              <CardHeader className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 w-10 h-10 rounded-xl flex items-center justify-center text-primary">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-extrabold tracking-tight">Budget</CardTitle>
                      <CardDescription className="text-sm font-medium mt-0.5">
                        Your SNAP plan
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                    <Link href="/budget">
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-between">
                {budget ? (
                  <div className="space-y-6">
                    <dl className="grid grid-cols-1 gap-y-5 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap">
                          <Wallet className="w-4 h-4" /> SNAP Balance
                        </dt>
                        <dd className="font-mono text-2xl font-extrabold tracking-tight text-foreground text-right">
                          ${(budget.snap_remaining ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap">
                          <Clock className="w-4 h-4" /> Planning Window
                        </dt>
                        <dd className="font-mono font-semibold text-foreground text-right">
                          {budget.horizon_days} <span className="font-sans text-muted-foreground font-medium">days</span>
                        </dd>
                      </div>
                    </dl>
                    <p className="text-sm text-muted-foreground font-medium border-t border-border/50 pt-5">
                      Available for the next <span className="font-mono font-semibold text-foreground">{budget.horizon_days}</span> days
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground font-medium mb-4">
                      No budget set
                    </p>
                    <Button size="sm" variant="outline" className="rounded-lg font-medium" asChild>
                      <Link href="/budget">Set budget</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pantry Card — full width */}
            <Card className="md:col-span-2 shadow-sm rounded-2xl border-border/80 bg-background">
              <CardHeader className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/15 w-10 h-10 rounded-xl flex items-center justify-center text-accent-foreground">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-extrabold tracking-tight">Pantry</CardTitle>
                      <CardDescription className="text-sm font-medium mt-0.5">
                        What's at home right now
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                    <Link href="/pantry/edit">
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {pantry && pantry.length > 0 ? (
                  <div className="space-y-5">
                    {(() => {
                      const expiringItems = pantry.filter(i => {
                        if (!i.expires_on) return false;
                        const expDate = new Date(i.expires_on);
                        const today = new Date();
                        expDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        return daysUntil <= 3 && daysUntil >= 0;
                      });
                      if (expiringItems.length > 0) {
                        return (
                          <div className="flex items-center">
                            <Badge variant="destructive" className="px-3 py-1 text-xs font-medium rounded-lg">
                              <span className="font-mono font-semibold mr-1">{expiringItems.length}</span> item{expiringItems.length === 1 ? "" : "s"} expiring soon
                            </Badge>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="flex flex-wrap gap-2.5">
                      {pantry
                        .filter((i) => i.name?.trim())
                        .map((item, idx) => (
                          <Badge
                            key={`${item.name}-${idx}`}
                            variant="secondary"
                            className="text-sm py-1.5 px-3 rounded-xl bg-muted/60 hover:bg-muted border border-border/50"
                          >
                            <span className="font-medium text-foreground">{item.name}</span>
                            <span className="text-muted-foreground ml-2 font-mono text-xs">
                              {item.quantity} {item.unit}
                            </span>
                          </Badge>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground font-medium mb-4">
                      Your pantry is empty — add items so the plan knows what you have.
                    </p>
                    <Button size="sm" variant="outline" className="rounded-lg font-medium" asChild>
                      <Link href="/pantry/edit">Add pantry items</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Guest upsell */}
          {isGuest && (
            <motion.div variants={itemVariants}>
              <Card className="border-dashed border-2 border-primary/20 bg-primary/[0.02] shadow-sm rounded-2xl">
                <CardContent className="flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-lg font-extrabold tracking-tight text-foreground">Your data lives here</p>
                    <p className="text-base text-muted-foreground font-medium mt-1">
                      Create an account to keep your profile, budget, and pantry safe across devices.
                    </p>
                  </div>
                  <Button variant="outline" size="lg" className="rounded-xl font-semibold border-primary/20 hover:bg-primary/5 shadow-sm" asChild>
                    <Link href="/auth/sign-up?redirect=/dashboard">
                      Create a free account
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

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
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader className="space-y-2 mb-2">
              <DialogTitle className="text-xl font-extrabold tracking-tight">What are you in the mood for?</DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Add any preferences, or leave blank — we'll use your profile.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
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
                        className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
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
                className="w-full min-h-[100px] rounded-xl border border-input bg-transparent px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none resize-none font-medium"
                placeholder="e.g., more soups this week, easy breakfasts, no seafood..."
                maxLength={500}
                value={preferencesInput}
                onChange={(e) => setPreferencesInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground font-mono text-right">
                {preferencesInput.length}/500
              </p>
            </div>

            <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end mt-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-xl font-semibold"
                onClick={() => {
                  setShowGenerateDialog(false);
                  setPreferencesInput("");
                }}
              >
                Never mind
              </Button>
              <Button
                className="w-full sm:w-auto sm:min-w-[150px] rounded-xl font-semibold shadow-sm hover:shadow-md transition-shadow"
                onClick={() => {
                  setShowGenerateDialog(false);
                  handleGeneratePlan(preferencesInput.trim() || undefined);
                  setPreferencesInput("");
                }}
              >
                Generate My Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
