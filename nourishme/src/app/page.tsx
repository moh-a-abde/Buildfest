"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { AuthHeader } from "@/components/AuthHeader";
import { useAuth } from "@/contexts/AuthContext";

interface HomeStats {
  snapRemaining: number | null;
  pantryItemsToUseFirst: number | null;
  mealsPlannedAllTime: number | null;
}

interface HowItWorksPanel {
  title: string;
  description: string;
  height: string;
}

const HOW_IT_WORKS_PANELS: HowItWorksPanel[] = [
  {
    title: "1. Set your budget & household",
    description:
      "Tell us your remaining SNAP balance or weekly food budget, how many people you are feeding, and how many days you need to cover.",
    height: "85%",
  },
  {
    title: "2. Add what you already have",
    description:
      "Quickly list pantry staples and fridge items, then optionally add use-by dates so meals can prioritize what should be used first.",
    height: "100%",
  },
  {
    title: "3. Get your waste-smart meal plan",
    description:
      "Receive an AI meal plan with easy recipes, leftovers built into the week, and a list split between pantry items and SNAP purchases.",
    height: "90%",
  },
  {
    title: "4. Shop with confidence",
    description:
      "Bring your list to the store with estimated prices so you can stay confident that your SNAP benefits will cover what you need.",
    height: "80%",
  },
];

export default function Home() {
  const router = useRouter();
  const { user, isLoading, continueAsGuest } = useAuth();
  const isAuthenticated = !isLoading && !!user;
  const [hoveredPanel, setHoveredPanel] = useState<number | null>(null);
  const [stats, setStats] = useState<HomeStats>({
    snapRemaining: null,
    pantryItemsToUseFirst: null,
    mealsPlannedAllTime: null,
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchStats() {
      try {
        const [budgetRes, pantryRes, plansRes] = await Promise.all([
          fetch("/api/budget").then((r) => r.json()),
          fetch("/api/pantry").then((r) => r.json()),
          fetch("/api/plan").then((r) => r.json()),
        ]);

        const snapRemaining =
          budgetRes.budget?.snap_remaining != null
            ? Number(budgetRes.budget.snap_remaining)
            : null;

        const items = pantryRes.items ?? [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const inSevenDays = new Date(now);
        inSevenDays.setDate(inSevenDays.getDate() + 7);
        const pantryItemsToUseFirst = items.filter((item: { expires_on?: string | null }) => {
          const exp = item.expires_on;
          if (!exp) return false;
          const expDate = new Date(exp);
          expDate.setHours(0, 0, 0, 0);
          return expDate <= inSevenDays; // expiring today, past, or within 7 days
        }).length;

        let mealsPlannedAllTime = 0;
        const plans = plansRes.plans ?? [];
        if (plans.length > 0) {
          const planDetails = await Promise.all(
            plans.map((p: { planId: string }) =>
              fetch(`/api/plan/${p.planId}`).then((r) => r.json())
            )
          );
          mealsPlannedAllTime = planDetails.reduce(
            (sum, pd) =>
              sum +
              (pd.mealsByDay ?? []).reduce(
                (s: number, day: { meals?: unknown[] }) =>
                  s + (day.meals?.length ?? 0),
                0
              ),
            0
          );
        }

        setStats({
          snapRemaining,
          pantryItemsToUseFirst,
          mealsPlannedAllTime,
        });
      } catch {
        // Keep nulls on error
      }
    }

    fetchStats();
  }, [isAuthenticated]);

  function handleGuestStart() {
    continueAsGuest();
    router.push("/onboarding");
  }

  function formatSnap(value: number | null): string {
    if (value == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatCount(value: number | null): string {
    if (value == null) return "—";
    return String(value);
  }

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/20">
      <AuthHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-secondary/30 pt-16 md:pt-24 pb-20 md:pb-32">
          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
            <Badge
              variant="secondary"
              className="mb-6 bg-accent/15 text-accent-foreground hover:bg-accent/20 border-accent/20 px-3 py-1 text-sm font-medium"
            >
              Built for SNAP families · Reduce food waste
            </Badge>

            {isAuthenticated ? (
              <>
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-foreground leading-tight">
                  Welcome back. Let&apos;s use what you have this week.
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                  Based on your pantry, SNAP balance, and household size, we&apos;ll
                  help you plan another week of meals that waste less and stay on
                  budget.
                </p>
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base h-14 px-8 shadow-md"
                  asChild
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 w-4 h-4" />
                    Go to Dashboard
                  </Link>
                </Button>
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="bg-background/60 rounded-lg border border-border/60 px-4 py-3 text-left">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">SNAP remaining</p>
                    <p className="font-semibold text-foreground">{formatSnap(stats.snapRemaining)}</p>
                  </div>
                  <div className="bg-background/60 rounded-lg border border-border/60 px-4 py-3 text-left">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Pantry items to use first</p>
                    <p className="font-semibold text-foreground">{formatCount(stats.pantryItemsToUseFirst)}</p>
                  </div>
                  <div className="bg-background/60 rounded-lg border border-border/60 px-4 py-3 text-left">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Meals planned (all time)</p>
                    <p className="font-semibold text-foreground">{formatCount(stats.mealsPlannedAllTime)}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="relative isolate overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-b from-white/45 via-white/20 to-white/10 px-5 py-8 shadow-[0_10px_40px_-22px_hsl(var(--primary)/0.55),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-[16px] dark:from-white/15 dark:via-white/8 dark:to-white/5 md:rounded-3xl md:px-8 md:py-10">
                  <div className="relative z-10">
                    <h2 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
                      Use what you have. <br className="hidden md:block" />
                      <span className="text-primary">Waste less. Stretch your SNAP dollars.</span>
                    </h2>

                    <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                      Plan healthy, affordable meals around what&apos;s already in your
                      pantry. We help you use up what you have, cut food waste, and
                      create smart grocery lists that fit your SNAP budget.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                      <Button
                        size="lg"
                        className="h-12 w-full px-7 text-base shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.65)] sm:w-auto"
                        asChild
                      >
                        <Link href="/auth/sign-up">
                          Start Planning
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-12 w-full border-white/40 bg-white/45 px-7 text-base backdrop-blur-[16px] sm:w-auto"
                        onClick={handleGuestStart}
                      >
                        Try as Guest
                      </Button>
                    </div>

                    <p className="mt-4 text-sm text-muted-foreground">
                      Takes 2 minutes · Works with SNAP EBT · No credit card
                    </p>

                    <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/30 bg-gradient-to-b from-white/45 via-white/20 to-white/10 px-4 py-3 text-left shadow-[0_8px_24px_-18px_rgba(0,0,0,0.35)] backdrop-blur-[16px] dark:from-white/15 dark:via-white/8 dark:to-white/5">
                        <p className="text-sm font-semibold text-foreground">Plan around your pantry</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          We start with what you already have at home before adding
                          anything new.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/30 bg-gradient-to-b from-white/45 via-white/20 to-white/10 px-4 py-3 text-left shadow-[0_8px_24px_-18px_rgba(0,0,0,0.35)] backdrop-blur-[16px] dark:from-white/15 dark:via-white/8 dark:to-white/5">
                        <p className="text-sm font-semibold text-foreground">Waste less food</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Meals are prioritized to use ingredients that are close to
                          expiring.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/30 bg-gradient-to-b from-white/45 via-white/20 to-white/10 px-4 py-3 text-left shadow-[0_8px_24px_-18px_rgba(0,0,0,0.35)] backdrop-blur-[16px] dark:from-white/15 dark:via-white/8 dark:to-white/5">
                        <p className="text-sm font-semibold text-foreground">SNAP-smart budget</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Never plan more than your remaining SNAP or weekly food budget.
                        </p>
                      </div>
                    </div>

                    <p className="mx-auto mt-8 max-w-xl text-xs text-muted-foreground">
                      Powered by AI, guided by your budget and pantry. You stay in control of every meal.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {!isAuthenticated && (
          <section className="container mx-auto px-4 py-20 max-w-6xl">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-foreground mb-4">How NourishMe Works</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                A simple four-step flow with an interactive view of how each stage
                works together.
              </p>
            </div>

            <div
              className="hidden md:block"
              onMouseLeave={() => setHoveredPanel(null)}
            >
              <div className="h-[28rem] [perspective:1200px]">
                <div className="flex h-full items-end gap-4">
                  {HOW_IT_WORKS_PANELS.map((panel, index) => {
                    const isHovered = hoveredPanel === index;
                    const hasHoveredPanel = hoveredPanel !== null;
                    const isDimmed = hasHoveredPanel && !isHovered;
                    const panelTransform = isHovered
                      ? "scale(1.02) translateZ(30px)"
                      : isDimmed
                        ? "scale(0.95) translateZ(-8px)"
                        : "scale(1) translateZ(0)";

                    return (
                      <article
                        key={panel.title}
                        style={{ height: panel.height, transform: panelTransform }}
                        onMouseEnter={() => setHoveredPanel(index)}
                        onFocus={() => setHoveredPanel(index)}
                        onBlur={() => setHoveredPanel(null)}
                        tabIndex={0}
                        className={`group relative isolate overflow-hidden rounded-3xl border border-white/30 px-4 pb-4 pt-4 text-left transition-all duration-500 ease-out outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                          isHovered
                            ? "flex-[1.8_1_0%] shadow-2xl shadow-primary/20 blur-0"
                            : hasHoveredPanel
                              ? "flex-[0.9_1_0%] shadow-lg shadow-black/5 blur-[2px]"
                              : "flex-[1_1_0%] shadow-xl shadow-black/10"
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/20 to-white/10 backdrop-blur-[16px] dark:from-white/15 dark:via-white/8 dark:to-white/5" />
                        <div className="absolute -left-14 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-2xl" />
                        <div className="absolute -right-12 bottom-0 h-28 w-28 rounded-full bg-accent/25 blur-2xl" />

                        <div className="relative z-10 flex h-full flex-col">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
                            Step {index + 1}
                          </p>
                          <h4 className="max-w-[15rem] text-xl font-semibold text-foreground">
                            {panel.title.replace(`${index + 1}. `, "")}
                          </h4>

                          <div
                            className={`mt-4 transition-all duration-500 ${
                              isHovered
                                ? "translate-y-0 opacity-100 delay-75"
                                : "translate-y-2 opacity-0"
                            }`}
                          >
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {panel.description}
                            </p>
                          </div>

                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4 md:hidden">
              {HOW_IT_WORKS_PANELS.map((panel) => {
                return (
                  <div
                    key={`mobile-${panel.title}`}
                    className="relative overflow-hidden rounded-2xl border border-white/40 bg-background/70 p-4 backdrop-blur-[16px]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-transparent dark:from-white/10 dark:via-white/5" />
                    <div className="relative z-10">
                      <div className="mb-3">
                        <h4 className="text-lg font-semibold text-foreground">{panel.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {panel.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!isAuthenticated && (
          <section className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-b from-white/45 via-white/20 to-white/10 p-5 shadow-[0_10px_40px_-22px_hsl(var(--primary)/0.6),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-[16px] dark:from-white/15 dark:via-white/8 dark:to-white/5 md:rounded-3xl md:p-8">
              <div className="relative z-10 mb-7 text-center md:mb-9">
                <h3 className="text-2xl font-bold text-foreground md:text-3xl">
                  Why NourishMe is different for SNAP families
                </h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  Compact planning support built to stretch benefits, reduce food waste,
                  and lower shopping stress.
                </p>
              </div>

              <div className="relative z-10 grid gap-4 md:grid-cols-6 md:gap-5">
                <article
                  tabIndex={0}
                  className="group relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-b from-white/45 via-white/20 to-white/10 p-4 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-[16px] transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-reduce:transition-none motion-reduce:transform-none md:col-span-2 md:translate-y-2 md:hover:-translate-y-1 md:hover:scale-[1.02] md:hover:shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.65)] md:focus-visible:-translate-y-1 md:focus-visible:scale-[1.02] md:focus-visible:shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.65)]"
                >
                  <h4 className="text-lg font-semibold text-foreground">Make every dollar count</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Meal plans stay within your remaining SNAP balance and show how much
                    you&apos;ll spend per day over your planning window.
                  </p>
                </article>

                <article
                  tabIndex={0}
                  className="group relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-b from-white/45 via-white/20 to-white/10 p-4 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-[16px] transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-reduce:transition-none motion-reduce:transform-none md:col-span-2 md:translate-y-0 md:scale-95 md:opacity-95 md:hover:-translate-y-2 md:hover:scale-[1.02] md:hover:opacity-100 md:hover:shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.55)] md:focus-visible:-translate-y-2 md:focus-visible:scale-[1.02] md:focus-visible:opacity-100 md:focus-visible:shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.55)]"
                >
                  <h4 className="text-lg font-semibold text-foreground">Use up what you already have</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    We scan your pantry list first, then only add missing items to your
                    grocery list, a top SNAP-Ed strategy for cutting waste and saving money.
                  </p>
                </article>

                <article
                  tabIndex={0}
                  className="group relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-b from-white/45 via-white/20 to-white/10 p-4 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-[16px] transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-reduce:transition-none motion-reduce:transform-none md:col-span-2 md:-translate-y-2 md:scale-95 md:opacity-95 md:hover:-translate-y-4 md:hover:scale-[1.02] md:hover:opacity-100 md:hover:shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.55)] md:focus-visible:-translate-y-4 md:focus-visible:scale-[1.02] md:focus-visible:opacity-100 md:focus-visible:shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.55)]"
                >
                  <h4 className="text-lg font-semibold text-foreground">Waste less, stress less</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Meals are ordered to use foods before they go bad and encourage leftovers
                    for busy nights, a proven way to lower both food costs and food waste.
                  </p>
                </article>
              </div>
            </div>
          </section>
        )}

        {!isAuthenticated && (
          <section className="container mx-auto max-w-6xl px-4 pb-20 pt-8">
            <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-b from-white/45 via-white/20 to-white/10 p-6 text-center shadow-[0_10px_40px_-22px_hsl(var(--primary)/0.5),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-[16px] dark:from-white/15 dark:via-white/8 dark:to-white/5 md:rounded-3xl md:p-9">
              <div className="relative z-10 mx-auto max-w-3xl">
                <h3 className="text-2xl font-bold text-foreground md:text-3xl">
                  Ready to waste less and stretch your SNAP dollars?
                </h3>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  Join families who are saving money, reducing food waste, and eating better
                  with NourishMe.
                </p>
                <div className="mt-6">
                  <Button
                    size="lg"
                    className="h-12 rounded-xl px-7 text-base shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.65)] !transition-none"
                    asChild
                  >
                    <Link href="/auth/sign-up">Create Your First Plan</Link>
                  </Button>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Free to use · Built for SNAP households
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-secondary/20 py-10 mt-auto border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2 opacity-80">
                <Leaf className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground tracking-tight">
                  NourishMe
                </span>
              </div>

              <p className="text-sm text-muted-foreground text-center max-w-md">
                NourishMe provides coaching support and is not medical advice.
                Consult healthcare providers for specific dietary needs.
              </p>

              <div className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} NourishMe
              </div>
            </div>

            <div className="border-t border-border/60 pt-6">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                External resources (not affiliated with NourishMe)
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <a
                  href="https://www.fns.usda.gov/snap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  USDA SNAP information
                </a>
                <a
                  href="https://masnaped.org/healthy-foods/reducing-food-waste-at-home/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  SNAP-Ed tips on meal planning &amp; reducing food waste
                </a>
                <a
                  href="https://www.feedingamerica.org/find-your-local-foodbank"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Find local food resources
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
