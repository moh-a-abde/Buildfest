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
  Plus,
  ScanBarcode,
  Sparkles,
  Trash2,
  X,
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
import { BarcodeProductPreviewCard } from "@/components/BarcodeProductPreviewCard";
import { AskCoachButton } from "@/components/AskCoachButton";
import type { BarcodeProduct } from "@/lib/barcode-lookup";
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
  barcode: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  offMetadataRef: z
    .object({
      product_identity: z.string().nullable(),
      normalized_product_name: z.string().nullable(),
      allergen_flags: z.array(z.string()),
      nutri_score: z.string().nullable(),
      eco_score: z.string().nullable(),
      nova_group: z.number().int().nullable(),
      carbon_footprint_kg_co2e_per_kg: z.number().nullable(),
    })
    .nullable()
    .optional(),
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
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState("");
  const [previewProduct, setPreviewProduct] = useState<BarcodeProduct | null>(null);

  const form = useForm<PageValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      snapRemaining: savedBudget?.snapRemaining ?? 0,
      horizonDays: savedBudget?.horizonDays ?? 7,
      items: savedPantry?.length
        ? savedPantry
        : [{ name: "", quantity: 1, unit: "items", expiresOn: "", barcode: null, brand: null, offMetadataRef: null }],
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
            expiresOn: i.expires_on ?? "",
            barcode: i.barcode ?? null,
            brand: i.brand ?? null,
            offMetadataRef: i.off_metadata_ref ?? null,
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
    append({ name: "", quantity: 1, unit: "items", expiresOn: "", barcode: null, brand: null, offMetadataRef: null });
  }

  function addSuggested(name: string) {
    const existing = form.getValues("items");
    if (existing.some((item) => item.name.toLowerCase() === name.toLowerCase()))
      return;
    append({ name, quantity: 1, unit: "items", expiresOn: "", barcode: null, brand: null, offMetadataRef: null });
  }

  function clearBarcodePanelState() {
    setBarcodeInput("");
    setBarcodeError("");
    setPreviewProduct(null);
  }

  function confirmBarcodePreview() {
    if (!previewProduct) return;
    append({
      name: previewProduct.name,
      quantity: 1,
      unit: "items",
      expiresOn: "",
      barcode: previewProduct.barcode ?? null,
      brand: previewProduct.brand || null,
      offMetadataRef: {
        product_identity: previewProduct.barcode ?? null,
        normalized_product_name: previewProduct.name ?? null,
        allergen_flags: previewProduct.offMetadata?.allergens ?? [],
        nutri_score: previewProduct.offMetadata?.nutri_score ?? null,
        eco_score: previewProduct.offMetadata?.eco_score ?? null,
        nova_group: previewProduct.offMetadata?.nova_group ?? null,
        carbon_footprint_kg_co2e_per_kg:
          previewProduct.offMetadata?.carbon_footprint_kg_co2e_per_kg ?? null,
      },
    });
    clearBarcodePanelState();
    setBarcodeOpen(false);
  }

  async function handleBarcodeLookup() {
    const code = barcodeInput.replace(/\D/g, "");
    if (code.length < 8 || code.length > 14) {
      setBarcodeError("Enter an 8-14 digit barcode");
      return;
    }
    setBarcodeLoading(true);
    setBarcodeError("");
    try {
      const res = await fetch(`/api/barcode?code=${code}`);
      if (!res.ok) {
        setBarcodeError("Product not found for this barcode");
        setPreviewProduct(null);
        return;
      }
      const { product } = await res.json();
      setPreviewProduct(product);
    } catch {
      setBarcodeError("Lookup failed. Check your connection.");
      setPreviewProduct(null);
    } finally {
      setBarcodeLoading(false);
    }
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
        barcode: i.barcode || null,
        brand: i.brand || null,
        off_metadata_ref: i.offMetadataRef ?? null,
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
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-2xl relative z-10">
        <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Budget & Pantry
          </h1>
          <p className="text-muted-foreground mt-2 text-base md:text-lg">
            Tell us your budget and what you already have at home.
          </p>
          <div className="mt-3 flex justify-center">
            <AskCoachButton
              prompt="What can I make with my pantry items? Help me use what I have efficiently."
              label="Ask Coach for pantry tips"
              tooltip="Get ideas for using your pantry items"
            />
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8"
          >
            {/* ── Budget Section ─────────────────────── */}
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
                              const sanitized =
                                parts[0] +
                                (parts.length > 1
                                  ? "." + parts[1].slice(0, 2)
                                  : "");
                              const num = parseFloat(sanitized);
                              field.onChange(isNaN(num) ? 0 : num);
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

            {/* ── Pantry Section ─────────────────────── */}
            <Card className="border-border/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out delay-200 transition-shadow hover:shadow-md py-2 gap-0">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-2 pt-2 px-4">
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight">Your Pantry</CardTitle>
                  <CardDescription className="text-sm mt-0.5">
                    Add items you already have to reduce grocery costs
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-3 pb-3 px-4 bg-background">
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

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-dashed border-2 h-12 rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-500 ease-out"
                    onClick={addItem}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`sm:w-auto h-12 rounded-xl border-2 transition-all duration-500 ease-out ${barcodeOpen ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50 hover:bg-primary/5'}`}
                    onClick={() => setBarcodeOpen(!barcodeOpen)}
                  >
                    <ScanBarcode className="w-4 h-4 mr-2" />
                    Scan Barcode
                  </Button>
                </div>

                {barcodeOpen && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 ease-out shadow-inner">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium flex items-center gap-2 text-primary">
                        <ScanBarcode className="w-4 h-4" />
                        Scan or enter barcode
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => {
                          setBarcodeOpen(false);
                          clearBarcodePanelState();
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {!previewProduct && (
                      <div className="flex gap-3">
                        <Input
                          placeholder="e.g. 041331092609"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBarcodeLookup();
                            }
                          }}
                          className="flex-1 h-12 font-mono bg-background rounded-xl border-primary/20 focus-visible:ring-primary/30"
                          inputMode="numeric"
                        />
                        <Button
                          type="button"
                          className="h-12 px-6 rounded-xl shadow-sm transition-all duration-500"
                          disabled={barcodeLoading || !barcodeInput.trim()}
                          onClick={handleBarcodeLookup}
                        >
                          {barcodeLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Look up"
                          )}
                        </Button>
                      </div>
                    )}
                    {barcodeError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in">
                        {barcodeError}
                      </div>
                    )}
                    {previewProduct && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <BarcodeProductPreviewCard
                          product={previewProduct}
                          onConfirm={confirmBarcodePreview}
                          onCancel={() => setPreviewProduct(null)}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      Find the UPC barcode on the back of your product packaging. This helps us pull exact nutrition info for better meal planning.
                    </p>
                  </div>
                )}

                {/* Quick-add suggestions */}
                {suggestions.length > 0 && (
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
                      Common staples to quick-add
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.slice(0, 15).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => addSuggested(name)}
                          className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-border/60 bg-muted/20 hover:bg-primary/10 hover:border-primary/40 hover:text-primary hover:scale-[1.05] transition-all duration-500 ease-out cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
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
                    Saving your pantry...
                  </>
                ) : (
                  <>
                    Continue to Plan
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-500" />
                  </>
                )}
              </Button>
            </div>
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
    <div className="group relative rounded-xl border border-border/50 bg-background p-3 transition-all duration-500 ease-out hover:shadow-md hover:border-primary/20 hover:bg-muted/10">
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
                    placeholder="What item do you have?"
                    autoComplete="off"
                    className="h-11 rounded-lg border-border/50 bg-muted/5 text-base font-medium focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-300"
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
            <div className="absolute z-20 top-[calc(100%+4px)] left-0 right-0 bg-popover/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              {filteredSuggestions.map((suggestion, i) => (
                <button
                  key={suggestion}
                  type="button"
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer ${i < filteredSuggestions.length - 1 ? 'border-b border-border/40' : ''}`}
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
              className="h-11 w-11 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors duration-300"
              onClick={onRemove}
              title="Remove item"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          ) : (
            <div className="w-11" />
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
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Qty"
                    className="h-11 rounded-lg border-border/50 bg-muted/5 font-mono text-center focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-300"
                    value={field.value || ""}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value);
                      field.onChange(isNaN(num) ? 0 : num);
                    }}
                  />
                </div>
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
                  <SelectTrigger className="h-11 rounded-lg border-border/50 bg-muted/5 focus:ring-primary/20 transition-all duration-300">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-xl border-border/50 shadow-lg">
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit} className="rounded-lg cursor-pointer">
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
                <Input
                  type="date"
                  className="h-11 rounded-lg border-border/50 bg-muted/5 font-mono text-xs focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-300"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
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
