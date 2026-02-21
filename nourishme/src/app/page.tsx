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
  CheckCircle2,
  AlertCircle,
  Wallet,
  Package
} from "lucide-react";
import { AuthHeader } from "@/components/AuthHeader";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

interface HomeStats {
  snapRemaining: number | null;
  pantryItemsToUseFirst: number | null;
  mealsPlannedAllTime: number | null;
}

export default function Home() {
  const router = useRouter();
  const { user, isLoading, continueAsGuest } = useAuth();
  const isAuthenticated = !isLoading && !!user;
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
              <div className="relative isolate pt-8 pb-12 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="max-w-3xl mx-auto"
                >
                  <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-foreground leading-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">Welcome back.</span><br />
                    Let&apos;s use what you have.
                  </h2>
                  <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                    Based on your pantry, SNAP balance, and household size, we&apos;ll
                    help you plan another week of meals that waste less and stay on
                    budget.
                  </p>
                  <Button
                    size="lg"
                    className="h-14 rounded-full px-10 text-base font-semibold shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.5)] hover:shadow-[0_12px_24px_-10px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 transition-all mb-16 bg-primary hover:bg-primary/90 text-primary-foreground"
                    asChild
                  >
                    <Link href="/dashboard">
                      Go to Dashboard
                    </Link>
                  </Button>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left"
                >
                  <div className="bg-card rounded-3xl border shadow-sm p-6 relative overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all">
                    <div className="absolute -top-4 -right-4 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-12 duration-500">
                      <Wallet className="w-32 h-32 text-primary" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> SNAP Remaining</p>
                      <p className="text-4xl font-mono font-bold text-primary">{formatSnap(stats.snapRemaining)}</p>
                    </div>
                  </div>

                  <div className="bg-card rounded-3xl border shadow-sm p-6 relative overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all">
                    <div className="absolute -top-4 -right-4 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:-rotate-12 duration-500">
                      <Package className="w-32 h-32 text-accent" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Use First</p>
                      <p className="text-4xl font-mono font-bold text-accent">{formatCount(stats.pantryItemsToUseFirst)}<span className="text-lg text-muted-foreground ml-1 font-sans">items</span></p>
                    </div>
                  </div>

                  <div className="bg-card rounded-3xl border shadow-sm p-6 relative overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all">
                    <div className="absolute -top-4 -right-4 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-12 duration-500">
                      <CheckCircle2 className="w-32 h-32 text-foreground" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Meals Planned</p>
                      <p className="text-4xl font-mono font-bold text-foreground">{formatCount(stats.mealsPlannedAllTime)}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              <>
                <div className="relative isolate overflow-hidden pt-12 pb-24">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none -z-10" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent pointer-events-none -z-10" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 max-w-6xl mx-auto">
                    {/* Left: Copy & CTAs */}
                    <motion.div 
                      className="flex-1 text-left"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                      <h2 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">Use what you have. Waste less.</span><br />
                        Stretch your SNAP dollars.
                      </h2>

                      <p className="mb-8 text-lg leading-relaxed text-muted-foreground md:text-xl max-w-lg">
                        Plan healthy, affordable meals around what&apos;s already in your
                        pantry. We help you use up what you have, cut food waste, and
                        create smart grocery lists that fit your budget.
                      </p>

                      <div className="flex flex-col gap-4 sm:flex-row mb-6">
                        <Button
                          size="lg"
                          className="h-12 w-full px-7 text-base shadow-sm hover:shadow-md transition-all sm:w-auto"
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
                          className="h-12 w-full border-border bg-background/50 px-7 text-base backdrop-blur-sm sm:w-auto hover:bg-muted/50"
                          onClick={handleGuestStart}
                        >
                          Try as Guest
                        </Button>
                      </div>

                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" /> Works with SNAP EBT
                        <span className="mx-1">·</span>
                        <CheckCircle2 className="w-4 h-4 text-primary" /> Free forever
                      </p>
                    </motion.div>

                    {/* Right: Planning Preview Card */}
                    <motion.div 
                      className="flex-1 w-full max-w-md relative"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    >
                      {/* Floating Assistant Card */}
                      <motion.div 
                        className="absolute -top-6 -left-6 md:-left-12 z-20 bg-background/90 backdrop-blur-md p-4 rounded-xl border shadow-lg w-64"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <Leaf className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-mono font-medium text-muted-foreground mb-1">NOURISH_ASSIST</p>
                            <p className="text-sm font-medium leading-snug">Prioritize spinach and yogurt this week to reduce spoilage.</p>
                            <div className="mt-3 flex gap-2">
                              <Button size="sm" variant="secondary" className="h-7 text-xs px-2">Use Suggestion</Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Main Console Card */}
                      <div className="bg-card rounded-2xl border shadow-xl overflow-hidden relative z-10">
                        <div className="bg-muted/30 border-b px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-destructive/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-accent/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-primary/80" />
                          </div>
                          <p className="text-xs font-mono text-muted-foreground">Planning Console</p>
                        </div>
                        
                        <div className="p-5 space-y-5">
                          {/* SNAP Metric */}
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">SNAP Remaining</p>
                            <p className="text-3xl font-mono font-bold text-foreground">$124<span className="text-muted-foreground/50">.50</span></p>
                          </div>

                          {/* Pantry List */}
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">Detected in Pantry</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg text-sm">
                                <span>Brown Rice</span>
                                <span className="font-mono text-muted-foreground">2 lbs</span>
                              </div>
                              <div className="flex items-center justify-between bg-accent/10 border border-accent/20 px-3 py-2 rounded-lg text-sm">
                                <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-accent" /> Spinach</span>
                                <span className="font-mono text-accent">Expires: 2d</span>
                              </div>
                              <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg text-sm">
                                <span>Black Beans</span>
                                <span className="font-mono text-muted-foreground">3 cans</span>
                              </div>
                            </div>
                          </div>

                          {/* Plan Summary */}
                          <div className="pt-2 border-t">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Suggested Plan</p>
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">High Match</Badge>
                            </div>
                            <p className="text-sm font-medium">Spinach & Black Bean Rice Bowls</p>
                            <p className="text-xs text-muted-foreground mt-1">Uses 3 pantry items · Est. cost: $4.20</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {!isAuthenticated && (
          <section className="container mx-auto px-4 py-8 border-y border-border/40 bg-muted/10">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-55 hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all hover:scale-105">
                <Leaf className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">USDA SNAP Guidelines</span>
              </div>
              <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all hover:scale-105">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">Local Food Partners</span>
              </div>
              <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all hover:scale-105">
                <AlertCircle className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">SNAP-Ed Approved Strategies</span>
              </div>
            </div>
          </section>
        )}

        {!isAuthenticated && (
          <section className="container mx-auto max-w-6xl px-4 py-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="bg-card border rounded-2xl p-6 shadow-sm font-mono text-sm relative overflow-hidden">
                  <div className="absolute left-6 top-10 bottom-6 w-px bg-border z-0" />
                  <div className="space-y-6 relative z-10">
                    <div className="flex gap-4">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1.5 ring-4 ring-background" />
                      <div>
                        <span className="text-muted-foreground">10:02:14</span> <span className="text-primary font-bold">PANTRY_SCAN</span>
                        <p className="text-xs mt-1 opacity-80">Identified 12 items. 2 expiring within 48h.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1.5 ring-4 ring-background" />
                      <div>
                        <span className="text-muted-foreground">10:02:15</span> <span className="text-primary font-bold">BUDGET_CHECK</span>
                        <p className="text-xs mt-1 opacity-80">Verified $85.00 SNAP remaining. Target: $12.14/day.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-3 h-3 rounded-full bg-accent mt-1.5 ring-4 ring-background" />
                      <div>
                        <span className="text-muted-foreground">10:02:16</span> <span className="text-accent font-bold">MEAL_MATCH</span>
                        <p className="text-xs mt-1 opacity-80 text-accent">Warning: Chicken thighs require early use. Adjusting schedule...</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1.5 ring-4 ring-background" />
                      <div>
                        <span className="text-muted-foreground">10:02:18</span> <span className="text-primary font-bold">LIST_BUILD</span>
                        <p className="text-xs mt-1 opacity-80">Added 5 missing ingredients. Est. cost: $14.20.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h3 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">
                  Transparent Decision Making
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Our system doesn&apos;t just spit out recipes. It shows you exactly how it arrived at a plan, giving you the confidence that every recommendation is guided by your actual budget and pantry constraints.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border/50">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Clear cost estimations before you shop</span>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border/50">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Logic explicitly tied to your inputs</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {!isAuthenticated && (
          <section id="how-it-works" className="container mx-auto px-4 py-24 max-w-6xl">
            <div className="text-center mb-16">
              <h3 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
                Designed for Practical, Everyday Use
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                A simple four-step flow built to stretch benefits, reduce food waste, and lower shopping stress.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Card 1: Span 2 */}
              <motion.div 
                className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="pantry-nodes" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="20" cy="20" r="2" fill="currentColor" />
                        <path d="M 20 20 L 40 40 M 20 20 L 0 40" stroke="currentColor" strokeWidth="0.5" fill="none" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#pantry-nodes)" />
                  </svg>
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="mb-6">
                    <h4 className="text-xl font-bold text-foreground mb-2">Pantry-First Planning</h4>
                    <p className="text-muted-foreground leading-relaxed max-w-md">
                      We start with what you already have at home before adding anything new to your grocery list. A proven strategy to cut waste and save money.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">Scans current items</Badge>
                    <Badge variant="secondary" className="bg-accent/10 text-accent">Prioritizes expiring food</Badge>
                  </div>
                </div>
              </motion.div>

              {/* Card 2 */}
              <motion.div 
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-foreground mb-2">Budget Guardrails</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Never plan more than your remaining SNAP or weekly food budget.
                  </p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between border relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40 animate-pulse" />
                  <span className="text-sm font-medium">Remaining:</span>
                  <span className="font-mono font-bold text-lg text-primary">$45.00</span>
                </div>
              </motion.div>

              {/* Card 3 */}
              <motion.div 
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-foreground mb-2">Waste Reduction First</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Meals are ordered to use foods before they go bad.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Items used before expiry</span>
                    <span className="text-primary">85%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[85%] rounded-full" />
                  </div>
                </div>
              </motion.div>

              {/* Card 4: Span 2 */}
              <motion.div 
                className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-center justify-between"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-foreground mb-2">Smart Grocery List</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Bring your list to the store with estimated prices so you can stay confident that your SNAP benefits will cover what you need.
                  </p>
                </div>
                <div className="flex-1 w-full bg-foreground text-background rounded-xl p-4 font-mono text-sm shadow-inner relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
                   <div className="space-y-2 opacity-90">
                     <div className="flex justify-between border-b border-background/20 pb-2">
                       <span>[ ] Milk (1 gal)</span>
                       <span>~$3.50</span>
                     </div>
                     <div className="flex justify-between border-b border-background/20 pb-2">
                       <span>[ ] Eggs (1 doz)</span>
                       <span>~$2.80</span>
                     </div>
                     <div className="flex justify-between pt-1 text-primary-foreground font-bold">
                       <span>Total Est:</span>
                       <span>$6.30</span>
                     </div>
                   </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {!isAuthenticated && (
          <section className="container mx-auto max-w-6xl px-4 py-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="bg-card border rounded-2xl p-6 shadow-sm font-mono text-sm relative overflow-hidden">
                  <div className="absolute left-6 top-10 bottom-6 w-px bg-border z-0" />
                  <div className="space-y-6 relative z-10">
                    <div className="flex gap-4">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1.5 ring-4 ring-background" />
                      <div>
                        <span className="text-muted-foreground">10:02:14</span> <span className="text-primary font-bold">PANTRY_SCAN</span>
                        <p className="text-xs mt-1 opacity-80">Identified 12 items. 2 expiring within 48h.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1.5 ring-4 ring-background" />
                      <div>
                        <span className="text-muted-foreground">10:02:15</span> <span className="text-primary font-bold">BUDGET_CHECK</span>
                        <p className="text-xs mt-1 opacity-80">Verified $85.00 SNAP remaining. Target: $12.14/day.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-3 h-3 rounded-full bg-accent mt-1.5 ring-4 ring-background" />
                      <div>
                        <span className="text-muted-foreground">10:02:16</span> <span className="text-accent font-bold">MEAL_MATCH</span>
                        <p className="text-xs mt-1 opacity-80 text-accent">Warning: Chicken thighs require early use. Adjusting schedule...</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1.5 ring-4 ring-background" />
                      <div>
                        <span className="text-muted-foreground">10:02:18</span> <span className="text-primary font-bold">LIST_BUILD</span>
                        <p className="text-xs mt-1 opacity-80">Added 5 missing ingredients. Est. cost: $14.20.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h3 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">
                  Transparent Decision Making
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Our system doesn&apos;t just spit out recipes. It shows you exactly how it arrived at a plan, giving you the confidence that every recommendation is guided by your actual budget and pantry constraints.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border/50">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Clear cost estimations before you shop</span>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border/50">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Logic explicitly tied to your inputs</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {!isAuthenticated && (
          <section id="testimonials" className="relative py-24 md:py-32 overflow-hidden bg-background">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden">
              <span className="text-[25vw] font-extrabold tracking-tighter text-foreground whitespace-nowrap">RESULTS</span>
            </div>
            
            <div className="container mx-auto px-4 max-w-6xl relative z-10">
              <div className="flex flex-col md:flex-row gap-12 md:gap-20 items-center">
                <div className="flex-1 md:pr-10">
                  <div className="flex items-center gap-4 mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Sarah&backgroundColor=d98a4a" alt="User Profile" className="w-16 h-16 rounded-full border-2 border-primary/20 shadow-sm" />
                    <div>
                      <p className="font-bold text-lg">Sarah M.</p>
                      <p className="text-sm text-muted-foreground">SNAP Household of 4</p>
                    </div>
                  </div>
                  <blockquote className="text-2xl md:text-3xl font-medium leading-relaxed italic text-foreground/90">
                    &ldquo;Before NourishMe, we would always run out of benefits by the third week. Now, because we actually use what&apos;s in our pantry first, we make it through the whole month with less stress.&rdquo;
                  </blockquote>
                </div>
                
                <div className="flex-1 w-full space-y-6">
                  <div className="bg-primary text-primary-foreground p-8 rounded-3xl shadow-lg transform transition-transform hover:scale-105">
                    <p className="text-sm font-medium opacity-90 uppercase tracking-wider mb-2">Impact</p>
                    <p className="text-4xl font-extrabold mb-1">30% Less</p>
                    <p className="text-lg opacity-90">Food waste reduced</p>
                  </div>
                  <div className="bg-accent text-accent-foreground p-8 rounded-3xl shadow-lg transform transition-transform hover:scale-105 md:-translate-x-6">
                    <p className="text-sm font-medium opacity-90 uppercase tracking-wider mb-2">Confidence</p>
                    <p className="text-4xl font-extrabold mb-1">100%</p>
                    <p className="text-lg opacity-90">Stayed within SNAP budget</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {!isAuthenticated && (
          <section className="container mx-auto max-w-6xl px-4 pb-20 pt-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Pantry Scan", desc: "Digital inventory of what you have" },
                { title: "Budget Tracking", desc: "SNAP balance integration" },
                { title: "Meal Planner", desc: "Waste-free recipe matching" },
                { title: "Grocery Export", desc: "Cost-estimated shopping lists" },
              ].map((feature, i) => (
                <div key={i} className="bg-card border rounded-2xl p-6 group hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <p className="font-bold text-foreground mb-2">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isAuthenticated && (
          <section className="container mx-auto max-w-4xl px-4 pb-32 pt-8">
            <div className="relative overflow-hidden rounded-3xl border bg-background/50 p-8 md:p-12 text-center shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-50" />
              <div className="absolute -z-10 inset-0 pointer-events-none overflow-hidden">
                {/* Gentle rising lines/particles effect */}
                <motion.div 
                  className="absolute bottom-0 left-[20%] w-px h-[150px] bg-gradient-to-t from-primary/40 to-transparent"
                  animate={{ y: [-150, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <motion.div 
                  className="absolute bottom-0 right-[30%] w-px h-[200px] bg-gradient-to-t from-accent/40 to-transparent"
                  animate={{ y: [-200, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1 }}
                />
                <motion.div 
                  className="absolute bottom-0 left-[60%] w-px h-[100px] bg-gradient-to-t from-primary/30 to-transparent"
                  animate={{ y: [-100, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 2 }}
                />
              </div>
              <div className="relative z-10 mx-auto max-w-2xl">
                <h3 className="text-3xl font-extrabold text-foreground md:text-5xl tracking-tight mb-6">
                  Ready to plan smarter with what you already have?
                </h3>
                <div className="mt-8 flex justify-center">
                  <Button
                    size="lg"
                    className="h-14 rounded-full px-8 text-base shadow-md hover:shadow-lg hover:-translate-y-1 transition-all"
                    asChild
                  >
                    <Link href="/auth/sign-up">Create Your First Plan</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 py-16 mt-auto border-t relative overflow-hidden">
        <div className="absolute -bottom-8 left-0 right-0 text-center pointer-events-none opacity-[0.03] select-none">
          <span className="text-[15vw] font-extrabold tracking-tighter text-foreground whitespace-nowrap leading-none">NOURISHME</span>
        </div>
        <div className="container mx-auto px-4 relative z-10 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4 group">
                <div className="bg-primary/10 text-primary p-1.5 rounded-full transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Leaf className="w-5 h-5" />
                </div>
                <span className="font-bold text-foreground tracking-tight">NourishMe</span>
              </Link>
            </div>
            <div>
              <p className="font-semibold mb-4">Product</p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#how-it-works" className="hover:text-foreground">How it Works</Link></li>
                <li><Link href="/pantry" className="hover:text-foreground">Pantry Scan</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">Pricing (Free)</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-4">Resources</p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="https://www.fns.usda.gov/snap" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">USDA SNAP Info</a></li>
                <li><a href="https://masnaped.org/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">SNAP-Ed Strategies</a></li>
                <li><a href="https://www.feedingamerica.org/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Find Local Foodbanks</a></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-2">
              <p className="font-semibold mb-4">Legal & Disclaimers</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                NourishMe provides meal planning support and cost estimations but is not affiliated with the USDA or the SNAP program. Prices are estimates and may vary by local store.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Not intended as medical advice. Please consult healthcare providers for specific dietary needs or restrictions.
              </p>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} NourishMe. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
