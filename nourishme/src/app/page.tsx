"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ClipboardList,
  Leaf,
  ArrowRight,
  LayoutDashboard,
  Recycle,
  Refrigerator,
  CreditCard,
  ShoppingCart,
} from "lucide-react";
import { AuthHeader } from "@/components/AuthHeader";
import { useAuth } from "@/contexts/AuthContext";

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
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />

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
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-foreground leading-tight">
                  Use what you have. <br className="hidden md:block" />
                  <span className="text-primary">Waste less. Stretch your SNAP dollars.</span>
                </h2>

                <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                  Plan healthy, affordable meals around what&apos;s already in your
                  pantry. We help you use up what you have, cut food waste, and
                  create smart grocery lists that fit your SNAP budget.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-base h-14 px-8 shadow-md"
                    asChild
                  >
                    <Link href="/auth/sign-up">
                      Start Planning
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-base h-14 px-8 bg-background"
                    onClick={handleGuestStart}
                  >
                    Try as Guest
                  </Button>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  Takes 2 minutes · Works with SNAP EBT · No credit card
                </p>

                <div className="mt-12 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-left">
                    <ClipboardList className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">Plan around your pantry</p>
                      <p className="text-xs text-muted-foreground mt-0.5">We start with what you already have at home before adding anything new.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-left">
                    <Recycle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">Waste less food</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Meals are prioritized to use ingredients that are close to expiring.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-left">
                    <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">SNAP-smart budget</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Never plan more than your remaining SNAP or weekly food budget.</p>
                    </div>
                  </div>
                </div>

                <p className="mt-10 text-xs text-muted-foreground max-w-xl mx-auto">
                  Powered by AI, guided by your budget and pantry. You stay in control of every meal.
                </p>
              </>
            )}
          </div>
        </section>

        {!isAuthenticated && (
        <section className="container mx-auto px-4 py-20 max-w-6xl">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              How NourishMe Works
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Three simple steps to take the stress out of feeding your family on
              a budget.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">1. Set your budget & household</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Tell us your remaining SNAP balance or weekly food budget, how many people you&apos;re feeding, and how many days you need to cover. We make sure your plan never goes over what you can actually spend.
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  • Works with monthly SNAP cycles · • Shows your daily SNAP spend target
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full -z-10" />
              <CardHeader className="pb-4 relative z-10">
                <div className="bg-accent/15 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <Refrigerator className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">2. Add what you already have</CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-muted-foreground leading-relaxed">
                  Quickly list pantry staples and fridge items—like rice, beans, pasta, frozen veggies, and leftovers. Add optional &quot;use by&quot; dates so we can spot what needs to be used soon.
                </p>
                <p className="text-xs text-muted-foreground mt-4 space-y-1">
                  <span className="block">• We plan meals from your pantry first to avoid buying duplicates.</span>
                  <span className="block">• Items close to expiring get used earlier in your plan.</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <Leaf className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">3. Get your waste-smart meal plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Receive a complete AI-generated meal plan with easy recipes, a leftover-friendly schedule, and a smart grocery list that separates &quot;already in your pantry&quot; from &quot;to buy with SNAP.&quot;
                </p>
                <p className="text-xs text-muted-foreground mt-4 space-y-1">
                  <span className="block">• Designed around your time to cook (busy nights vs. slower days).</span>
                  <span className="block">• Highlights ingredients that appear in multiple meals, so nothing goes to waste.</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 max-w-2xl mx-auto">
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="bg-accent/15 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <ShoppingCart className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">4. Shop with confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Bring the list to your usual store. See estimated prices by item so you know you can cover everything with your SNAP benefits and any cash you choose to add.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
        )}

        {!isAuthenticated && (
        <section className="container mx-auto px-4 py-20 max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Why NourishMe is different for SNAP families
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Make every dollar count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Meal plans stay within your remaining SNAP balance and show how much you&apos;ll spend per day over your planning window.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="bg-accent/15 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <ClipboardList className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">Use up what you already have</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  We scan your pantry list first, then only add missing items to your grocery list—one of the top SNAP-Ed strategies for cutting waste and saving money.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                  <Recycle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Waste less, stress less</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Meals are ordered to use foods before they go bad and encourage leftovers for busy nights, a proven way to lower both food costs and food waste.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
        )}

        {!isAuthenticated && (
        <section className="bg-primary/5 py-20 border-y border-primary/10">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h3 className="text-2xl md:text-3xl font-bold mb-6">
              Ready to waste less and stretch your SNAP dollars?
            </h3>
            <p className="text-muted-foreground mb-8 text-lg">
              Join families who are saving money, reducing food waste, and eating better with NourishMe.
            </p>
            <Button
              size="lg"
              className="h-14 px-8 text-base shadow-sm"
              asChild
            >
              <Link href="/auth/sign-up">Create Your First Plan</Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Free to use · Built for SNAP households
            </p>
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
