"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Leaf, Loader2, Package, Plus, ScanBarcode, Sparkles, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BarcodeProductPreviewCard } from "@/components/BarcodeProductPreviewCard";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BarcodeProduct } from "@/lib/barcode-lookup";

const PANTRY_STORAGE_KEY = "nourishme_pantry";

const UNITS = ["items", "lbs", "oz", "cups", "cans", "bags", "boxes", "bottles", "bunches", "loaves"] as const;

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

const schema = z.object({
  items: z.array(pantryItemSchema),
});

type FormValues = z.infer<typeof schema>;
type PantryItemValues = z.infer<typeof pantryItemSchema>;

function loadPantry(): PantryItemValues[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PANTRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function EditPantryPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState("");
  const [previewProduct, setPreviewProduct] = useState<BarcodeProduct | null>(null);
  const savedPantry = loadPantry();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
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
    fetch("/api/pantry")
      .then((r) => r.json())
      .then((data) => {
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) return;
        form.reset({
          items: data.items.map(
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
          ),
        });
      })
      .catch(() => {
        // localStorage is the fallback
      })
      .finally(() => setApiLoaded(true));
  }, [apiLoaded, form]);

  const currentItems = form.watch("items");
  const usedNames = useMemo(() => new Set(currentItems.map((i) => i.name.toLowerCase())), [currentItems]);
  const suggestions = useMemo(
    () => COMMON_PANTRY_ITEMS.filter((name) => !usedNames.has(name.toLowerCase())),
    [usedNames],
  );

  function addItem() {
    append({ name: "", quantity: 1, unit: "items", expiresOn: "", barcode: null, brand: null, offMetadataRef: null });
  }

  function addSuggested(name: string) {
    if (usedNames.has(name.toLowerCase())) return;
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

  async function onSubmit(values: FormValues) {
    setIsSaving(true);
    const payload = values.items
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

    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(payload));

    try {
      await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Edit Pantry</h1>
          <p className="text-muted-foreground mt-1">Update the items you already have at home.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-accent/15 w-10 h-10 rounded-lg flex items-center justify-center text-accent-foreground">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Your Pantry</CardTitle>
                    <CardDescription>Add items you already have to reduce grocery costs</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-dashed"
                    onClick={addItem}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-dashed"
                    onClick={() => setBarcodeOpen(!barcodeOpen)}
                  >
                    <ScanBarcode className="w-4 h-4 mr-2" />
                    Scan Barcode
                  </Button>
                </div>

                {barcodeOpen && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <ScanBarcode className="w-4 h-4" />
                        Barcode Lookup
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setBarcodeOpen(false);
                          clearBarcodePanelState();
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {!previewProduct && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter barcode (e.g. 041331092609)"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBarcodeLookup();
                            }
                          }}
                          className="flex-1"
                          inputMode="numeric"
                        />
                        <Button
                          type="button"
                          size="sm"
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
                      <p className="text-xs text-destructive">{barcodeError}</p>
                    )}
                    {previewProduct && (
                      <BarcodeProductPreviewCard
                        product={previewProduct}
                        onConfirm={confirmBarcodePreview}
                        onCancel={() => setPreviewProduct(null)}
                      />
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Enter the UPC barcode number from a product package.
                      Data from Open Food Facts.
                    </p>
                  </div>
                )}

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

            <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Pantry"
              )}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}

function PantryItemRow({
  index,
  onRemove,
  canRemove,
}: {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const form = usePantryFormContext();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!nameQuery) return [];
    const query = nameQuery.toLowerCase();
    return COMMON_PANTRY_ITEMS.filter((item) => item.toLowerCase().includes(query)).slice(0, 6);
  }, [nameQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="group rounded-lg border bg-background p-3 transition-shadow hover:shadow-sm animate-in fade-in-0 slide-in-from-top-1 duration-200">
      <div className="grid grid-cols-[1fr_auto] gap-2">
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
                    field.onChange(Number.isNaN(num) ? 0 : num);
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
                <Input
                  type="date"
                  className="pr-2 text-xs"
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

function usePantryFormContext() {
  return useFormContext<FormValues>();
}
