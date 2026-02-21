"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, DollarSign, Leaf, Loader2, Wallet } from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight">NourishMe</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 md:py-10 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Edit Budget</h1>
          <p className="text-muted-foreground mt-1">Update your SNAP balance and planning window.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>SNAP Budget</CardTitle>
                    <CardDescription>Enter your remaining balance and planning window</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="snapRemaining"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remaining SNAP Balance</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            className="pl-9 h-11 text-lg"
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
                      <FormDescription>Your current EBT/SNAP card balance or weekly grocery budget.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horizonDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planning Window</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-2">
                          {HORIZON_OPTIONS.map((opt) => {
                            const selected = field.value === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => field.onChange(opt.value)}
                                className={`h-11 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                                  selected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/50"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormDescription>How far ahead should we plan meals?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Budget"
              )}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
