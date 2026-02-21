"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Printer,
  ShoppingCart,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ShoppingListItem } from "@/app/api/plan/generate/types";
import type { SnapStore, StoresResponse } from "@/app/api/stores/types";
import {
  groupByCategory,
  sortedCategories,
  type GroceryCategory,
} from "@/lib/grocery-categories";

interface GroceryListProps {
  shoppingList: ShoppingListItem[];
  householdSize: number;
  zipCode: string;
  estimatedTotalCost: number;
}

const CATEGORY_EMOJI: Record<GroceryCategory, string> = {
  Produce: "🥬",
  "Meat & Seafood": "🥩",
  "Dairy & Eggs": "🥛",
  "Grains & Bread": "🌾",
  "Canned & Pantry": "🥫",
  Frozen: "🧊",
  "Oils & Condiments": "🫒",
  "Snacks & Beverages": "🥤",
  Other: "📦",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PriceSourceBadge({ source }: { source?: string }) {
  if (!source || source === "estimate" || source === "none") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center rounded px-1 py-0 text-[9px] font-medium border border-amber-200 bg-amber-50 text-amber-700">
            Est
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">Estimated price from static data</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium border border-blue-200 bg-blue-50 text-blue-700">
          <Zap className="h-2 w-2" />
          {source === "kroger" ? "Kroger" : "Live"}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">Live price from {source === "kroger" ? "Kroger" : source}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function SubstitutionBadge({ reason, reasonCodes }: { reason?: string; reasonCodes?: string[] }) {
  const isAllergen =
    reasonCodes?.includes("allergen_blocked") || reason === "allergen-safe";
  const isEco = reasonCodes?.includes("eco_preferred") || reason === "eco-preferred";
  if (!isAllergen && !isEco && !reasonCodes?.length) return null;

  const label = isAllergen ? "Allergen-safe" : "Eco-preferred";
  const classes = isAllergen
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-flex items-center rounded px-1 py-0 text-[9px] font-medium border ${classes}`}>
      {label}
    </span>
  );
}

function ScaledItem({
  item,
  scale,
  checked,
  onToggle,
}: {
  item: ShoppingListItem;
  scale: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const scaledQty = +(item.quantity * scale).toFixed(1);
  const scaledCost = +(item.estimatedCost * scale).toFixed(2);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        checked
          ? "border-green-200 bg-green-50/50 text-muted-foreground line-through"
          : "border-border/70 bg-background hover:bg-muted/30"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
          checked
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
        }`}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="text-sm font-medium">{item.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {scaledQty} {item.unit}
        </span>
        {item.substitutionDetails && (
          <span className="block text-[10px] text-muted-foreground mt-0.5">
            {item.substitutionDetails}
          </span>
        )}
      </span>
      <span className="shrink-0 flex items-center gap-1.5">
        <SubstitutionBadge reason={item.substitutionReason} reasonCodes={item.reasonCodes} />
        <PriceSourceBadge source={item.priceSource} />
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(scaledCost)}
        </span>
      </span>
    </button>
  );
}

function CategoryGroup({
  category,
  items,
  scale,
  checkedItems,
  onToggle,
}: {
  category: GroceryCategory;
  items: ShoppingListItem[];
  scale: number;
  checkedItems: Set<string>;
  onToggle: (name: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const categoryTotal = items.reduce((s, i) => s + i.estimatedCost * scale, 0);
  const checkedCount = items.filter((i) => checkedItems.has(i.name)).length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-base">{CATEGORY_EMOJI[category]}</span>
        <span className="flex-1 text-sm font-semibold">{category}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {checkedCount}/{items.length} · {formatCurrency(categoryTotal)}
        </span>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {!collapsed && (
        <div className="space-y-1.5 pl-1 pr-1 pb-2">
          {items.map((item) => (
            <ScaledItem
              key={item.name}
              item={item}
              scale={scale}
              checked={checkedItems.has(item.name)}
              onToggle={() => onToggle(item.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function StoreCard({ store }: { store: SnapStore }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Store className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{store.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {store.address}, {store.city}, {store.state} {store.zip}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {store.storeType}
          </Badge>
          {store.healthyIncentives && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 border-green-200 bg-green-50 text-green-700"
                >
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  Healthy Incentives
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  This store participates in a SNAP Healthy Incentives program,
                  offering extra benefits when you buy fruits and vegetables.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export function NearbyStores({ zipCode }: { zipCode: string }) {
  const [stores, setStores] = useState<SnapStore[]>([]);
  const [loading, setLoading] = useState(Boolean(zipCode));
  const [source, setSource] = useState<"usda_api" | "fallback">("usda_api");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!zipCode) {
        if (active) setStores([]);
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Finding SNAP-authorized stores near {zipCode}...
      </div>
    );
  }

  if (stores.length === 0) {
    return (
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
    );
  }

  const displayed = showAll ? stores : stores.slice(0, 5);
  const incentiveCount = stores.filter((s) => s.healthyIncentives).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <MapPin className="h-3.5 w-3.5" />
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
  );
}

export function GroceryList({
  shoppingList,
  householdSize,
  zipCode,
  estimatedTotalCost,
}: GroceryListProps) {
  const [scale, setScale] = useState(1);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => groupByCategory(shoppingList), [shoppingList]);
  const categories = useMemo(() => sortedCategories(grouped), [grouped]);

  const scaledTotal = estimatedTotalCost * scale;
  const checkedTotal = shoppingList
    .filter((i) => checkedItems.has(i.name))
    .reduce((s, i) => s + i.estimatedCost * scale, 0);
  const remainingTotal = scaledTotal - checkedTotal;
  const liveCount = shoppingList.filter(
    (i) => i.priceSource && i.priceSource !== "estimate" && i.priceSource !== "none",
  ).length;

  function handleToggle(name: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handlePrint() {
    window.print();
  }

  if (shoppingList.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-8 grocery-list-print">
      {/* Grocery List Card */}
      <Card className="border-border/80 bg-muted/20">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Grocery List
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 print:hidden"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {shoppingList.length} item{shoppingList.length !== 1 ? "s" : ""} to
            buy · All items are SNAP-eligible
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Family size scaler */}
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-4 py-2.5 print:hidden">
            <div>
              <p className="text-sm font-medium">Scale for household</p>
              <p className="text-xs text-muted-foreground">
                Plan made for {householdSize} people
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={scale <= 0.5}
                onClick={() =>
                  setScale((s) => Math.max(0.5, +(s - 0.5).toFixed(1)))
                }
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums">
                {scale}x
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={scale >= 3}
                onClick={() =>
                  setScale((s) => Math.min(3, +(s + 0.5).toFixed(1)))
                }
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Cost summary bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/70 bg-background px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">SNAP Total</span>
            </div>
            <span className="text-lg font-bold tabular-nums">
              {formatCurrency(scaledTotal)}
            </span>
            {checkedItems.size > 0 && (
              <span className="text-xs text-muted-foreground">
                ({formatCurrency(checkedTotal)} checked ·{" "}
                {formatCurrency(remainingTotal)} remaining)
              </span>
            )}
            <Badge
              variant="secondary"
              className="text-[10px] border-green-200 bg-green-50 text-green-700"
            >
              SNAP Eligible
            </Badge>
            {liveCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] border-blue-200 bg-blue-50 text-blue-700"
              >
                <Zap className="h-2 w-2 mr-0.5" />
                {liveCount} live price{liveCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Categorized items */}
          <div className="space-y-1">
            {categories.map((cat) => (
              <CategoryGroup
                key={cat}
                category={cat}
                items={grouped.get(cat)!}
                scale={scale}
                checkedItems={checkedItems}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nearby SNAP Stores Card */}
      <Card className="border-border/80 bg-muted/20 print:hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Nearby SNAP-Authorized Stores
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Based on your ZIP code ({zipCode})
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <NearbyStores zipCode={zipCode} />
        </CardContent>
      </Card>
    </div>
  );
}
