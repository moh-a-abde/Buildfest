"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  useFieldArray,
  useWatch,
  useFormContext,
} from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  DollarSign,
  Leaf,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HorizonDays } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────

const BUDGET_STORAGE_KEY = "nourishme_budget";
const PANTRY_STORAGE_KEY = "nourishme_pantry";

const UNITS = [
  "items",
  "lbs",
  "oz",
  "cups",
  "cans",
  "bags",
  "boxes",
  "bottles",
  "bunches",
  "loaves",
] as const;

const COMMON_PANTRY_ITEMS = [
  "Rice",
  "Beans (canned)",
  "Beans (dried)",
  "Pasta",
  "Bread",
  "Eggs",
  "Milk",
  "Butter",
  "Flour",
  "Sugar",
  "Salt",
  "Pepper",
  "Cooking oil",
  "Olive oil",
  "Onions",
  "Garlic",
  "Potatoes",
  "Canned tomatoes",
  "Tomato paste",
  "Chicken broth",
  "Soy sauce",
  "Peanut butter",
  "Oats",
  "Cereal",
  "Frozen vegetables",
  "Canned tuna",
  "Canned corn",
  "Tortillas",
  "Cheese",
  "Yogurt",
  "Bananas",
  "Apples",
  "Carrots",
  "Lettuce",
  "Ground beef",
  "Chicken thighs",
  "Chicken breast",
  "Hot dogs",
  "Ramen noodles",
  "Mac & cheese",
];

const HORIZON_OPTIONS: { value: HorizonDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

// ── Schema ─────────────────────────────────────────────────────────────

const pantryItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().min(0.1, "Quantity must be positive"),
  unit: z.string().min(1, "Select a unit"),
  expiresOn: z.string().optional(),
});

const pageSchema = z.object({
  snapRemaining: z.number().min(0, "Budget cannot be negative"),
  horizonDays: z.number().refine((v) => [7, 14, 30].includes(v), {
    message: "Choose 7, 14, or 30 days",
  }),
  items: z.array(pantryItemSchema),
});

type PageValues = z.infer<typeof pageSchema>;
type PantryItemValues = z.infer<typeof pantryItemSchema>;

// ── Persistence helpers ────────────────────────────────────────────────

function loadBudget(): { snapRemaining: number; horizonDays: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadPantry(): PantryItemValues[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PANTRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveBudget(data: { snapRemaining: number; horizonDays: number }) {
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function savePantry(items: PantryItemValues[]) {
  try {
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

// ── Page ───────────────────────────────────────────────────────────────

export default function PantryPage() {
  const router = useRouter();
  const savedBudget = loadBudget();
  const savedPantry = loadPantry();
  const [apiLoaded, setApiLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PageValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      snapRemaining: savedBudget?.snapRemaining ?? 0,
      horizonDays: savedBudget?.horizonDays ?? 7,
      items: savedPantry?.length
        ? savedPantry
        : [{ name: "", quantity: 1, unit: "items", expiresOn: "" }],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (apiLoaded) return;
    Promise.all([
      fetch("/api/budget").then((r) => r.json()).catch(() => ({})),
      fetch("/api/pantry").then((r) => r.json()).catch(() => ({})),
    ]).then(([budgetRes, pantryRes]) => {
      const updates: Partial<PageValues> = {};
      if (budgetRes.budget) {
        updates.snapRemaining = budgetRes.budget.snap_remaining ?? 0;
        updates.horizonDays = budgetRes.budget.horizon_days ?? 7;
      }
      if (pantryRes.items && pantryRes.items.length > 0) {
        updates.items = pantryRes.items.map(
          (i: { name: string; quantity: number; unit: string; expires_on?: string | null }) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            expiresOn: i.expires_on ?? "",
          }),
        );
      }
      if (Object.keys(updates).length > 0) {
        form.reset({ ...form.getValues(), ...updates });
      }
      setApiLoaded(true);
    });
  }, [apiLoaded, form]);

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    saveBudget({
      snapRemaining: watchedValues.snapRemaining ?? 0,
      horizonDays: (watchedValues.horizonDays as number) ?? 7,
    });
    savePantry((watchedValues.items as PantryItemValues[]) ?? []);
  }, [watchedValues]);

  function addItem() {
    append({ name: "", quantity: 1, unit: "items", expiresOn: "" });
  }

  function addSuggested(name: string) {
    const existing = form.getValues("items");
    if (existing.some((item) => item.name.toLowerCase() === name.toLowerCase()))
      return;
    append({ name, quantity: 1, unit: "items", expiresOn: "" });
  }

  async function onSubmit(values: PageValues) {
    setIsSaving(true);

    const budgetData = {
      snap_remaining: values.snapRemaining,
      horizon_days: values.horizonDays,
    };
    const pantryData = values.items
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        expires_on: i.expiresOn || null,
      }));

    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgetData));
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(pantryData));

    try {
      await Promise.all([
        fetch("/api/budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(budgetData),
        }),
        fetch("/api/pantry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: pantryData }),
        }),
      ]);
    } catch {
      // localStorage is the fallback
    }

    setIsSaving(false);
    document.cookie = "nourishme_pantry_complete=true; path=/; max-age=31536000";
    router.push("/dashboard");
  }

  const currentItems = form.watch("items");
  const usedNames = useMemo(
    () => new Set(currentItems.map((i) => i.name.toLowerCase())),
    [currentItems]
  );

  const suggestions = useMemo(
    () => COMMON_PANTRY_ITEMS.filter((n) => !usedNames.has(n.toLowerCase())),
    [usedNames]
  );

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 h-14 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">NourishMe</span>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 md:py-10 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Budget & Pantry
          </h1>
          <p className="text-muted-foreground mt-1">
            Tell us your budget and what you already have at home.
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* ── Budget Section ─────────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>SNAP Budget</CardTitle>
                    <CardDescription>
                      Enter your remaining balance and planning window
                    </CardDescription>
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
                              const raw = e.target.value.replace(
                                /[^0-9.]/g,
                                ""
                              );
                              const parts = raw.split(".");
                              const sanitized =
                                parts[0] +
                                (parts.length > 1
                                  ? "." + parts[1].slice(0, 2)
                                  : "");
                              const num = parseFloat(sanitized);
                              field.onChange(
                                isNaN(num) ? 0 : num
                              );
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your current EBT/SNAP card balance or weekly grocery
                        budget.
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
                      <FormDescription>
                        How far ahead should we plan meals?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* ── Pantry Section ─────────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-accent/15 w-10 h-10 rounded-lg flex items-center justify-center text-accent-foreground">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Your Pantry</CardTitle>
                    <CardDescription>
                      Add items you already have to reduce grocery costs
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Item list */}
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <PantryItemRow
                      key={field.id}
                      index={index}
                      onRemove={() => remove(index)}
                      canRemove={fields.length > 1}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={addItem}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>

                {/* Quick-add suggestions */}
                {suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Sparkles className="w-3 h-3" />
                      Quick add common items
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.slice(0, 12).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => addSuggested(name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border border-border bg-background hover:bg-muted hover:border-primary/30 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}

// ── Pantry item row ────────────────────────────────────────────────────

function PantryItemRow({
  index,
  onRemove,
  canRemove,
}: {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const form = usePageFormContext();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!nameQuery || nameQuery.length < 1) return [];
    const q = nameQuery.toLowerCase();
    return COMMON_PANTRY_ITEMS.filter((item) =>
      item.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [nameQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="group rounded-lg border bg-background p-3 transition-shadow hover:shadow-sm animate-in fade-in-0 slide-in-from-top-1 duration-200">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        {/* Row 1: Name + Remove */}
        <div ref={wrapperRef} className="relative">
          <FormField
            control={form.control}
            name={`items.${index}.name`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Item name"
                    autoComplete="off"
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setNameQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (nameQuery) setShowSuggestions(true);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    form.setValue(`items.${index}.name`, suggestion);
                    setNameQuery(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </div>

      {/* Row 2: Qty, Unit, Expiry */}
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 mt-2">
        <FormField
          control={form.control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Qty"
                  value={field.value || ""}
                  onChange={(e) => {
                    const num = parseFloat(e.target.value);
                    field.onChange(isNaN(num) ? 0 : num);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`items.${index}.unit`}
          render={({ field }) => (
            <FormItem>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`items.${index}.expiresOn`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    type="date"
                    className="pr-2 text-xs"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function usePageFormContext() {
  return useFormContext<PageValues>();
}
