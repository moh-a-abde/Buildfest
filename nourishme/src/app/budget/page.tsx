"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, DollarSign, Leaf, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { HorizonDays } from "@/lib/types";

const BUDGET_STORAGE_KEY = "nourishme_budget";

const HORIZON_OPTIONS: { value: HorizonDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

const schema = z.object({
  snapRemaining: z.number().min(0, "Budget cannot be negative"),
  horizonDays: z.number().refine((v) => [7, 14, 30].includes(v), {
    message: "Choose 7, 14, or 30 days",
  }),
});

type FormValues = z.infer<typeof schema>;

function loadBudget(): FormValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function BudgetPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const savedBudget = loadBudget();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      snapRemaining: savedBudget?.snapRemaining ?? 0,
      horizonDays: savedBudget?.horizonDays ?? 7,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (apiLoaded) return;
    fetch("/api/budget")
      .then((r) => r.json())
      .then((data) => {
        if (!data.budget) return;
        form.reset({
          snapRemaining: data.budget.snap_remaining ?? 0,
          horizonDays: data.budget.horizon_days ?? 7,
        });
      })
      .catch(() => {
        // localStorage is the fallback
      })
      .finally(() => setApiLoaded(true));
  }, [apiLoaded, form]);

  async function onSubmit(values: FormValues) {
    setIsSaving(true);
    const payload = {
      snap_remaining: values.snapRemaining,
      horizon_days: values.horizonDays,
    };

    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(values));

    try {
      await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // localStorage is the fallback
    }

    setIsSaving(false);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground relative selection:bg-primary/20">
      {/* Subtle Noise Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] mix-blend-multiply bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <header className="sticky top-4 z-30 mx-auto w-full max-w-2xl px-4 mt-2">
        <div className="flex h-14 items-center justify-between rounded-full border border-border/40 bg-background/80 px-5 backdrop-blur-xl shadow-sm transition-all duration-700 ease-out">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-full">
              <Leaf className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight text-sm">NourishMe</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors duration-700 ease-out"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-2xl relative z-10">
        <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Edit Budget</h1>
          <p className="text-muted-foreground mt-2 text-base md:text-lg">
            Update your SNAP balance and planning window.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="border-border/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out delay-100 transition-shadow hover:shadow-md py-2 gap-0">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-2 pt-2 px-4">
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight">SNAP Budget</CardTitle>
                  <CardDescription className="text-sm mt-0.5">
                    Enter your remaining balance and planning window
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-3 pb-3 px-4 bg-background">
                <FormField
                  control={form.control}
                  name="snapRemaining"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 font-medium">Remaining SNAP Balance</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-500" />
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            className="pl-11 h-14 text-xl font-mono rounded-xl border-border/50 bg-muted/10 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-500 shadow-sm"
                            value={field.value || ""}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "");
                              const parts = raw.split(".");
                              const sanitized = parts[0] + (parts.length > 1 ? `.${parts[1].slice(0, 2)}` : "");
                              const num = parseFloat(sanitized);
                              field.onChange(Number.isNaN(num) ? 0 : num);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        Your current EBT/SNAP card balance or weekly grocery budget.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horizonDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 font-medium">Planning Window</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-3">
                          {HORIZON_OPTIONS.map((opt) => {
                            const selected = field.value === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => field.onChange(opt.value)}
                                className={`h-12 rounded-xl border font-medium transition-all duration-700 ease-out cursor-pointer flex flex-col items-center justify-center ${
                                  selected
                                    ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                                    : "border-border/50 bg-muted/10 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:scale-[1.02]"
                                }`}
                              >
                                <span className={selected ? "font-bold font-mono" : "font-mono"}>{opt.value}</span>
                                <span className="text-[10px] uppercase tracking-wider opacity-80">Days</span>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        How far ahead should we plan meals?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="pt-2 pb-8 animate-in fade-in slide-in-from-bottom-10 duration-700 ease-out delay-300">
              <Button
                type="submit"
                size="lg"
                className="group relative w-full h-14 rounded-2xl text-lg font-medium overflow-hidden shadow-[0_8px_30px_rgb(var(--primary)/0.2)] hover:shadow-[0_8px_40px_rgb(var(--primary)/0.3)] transition-all duration-700 ease-out hover:-translate-y-0.5"
                disabled={isSaving}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Budget"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
