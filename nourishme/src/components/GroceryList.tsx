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
  const isEco = reasonCodes?.includes("eco_preferred") || reason === "eco-preferred";
  if (!isEco) return null;

  const label = "Eco-preferred";
  const classes = "border-emerald-200 bg-emerald-50 text-emerald-700";

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
      className={`group w-full grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
        checked
          ? "border-green-200/50 bg-green-50/30 text-muted-foreground"
          : "border-transparent bg-background hover:bg-muted/30 hover:border-border/50"
      }`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${checked ? "border-green-500 bg-green-500 text-white" : "border-border/80 group-hover:border-border"}`}>
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      <div className="flex flex-col min-w-0">
        <span className={`text-[15px] font-semibold leading-tight truncate ${checked ? "line-through" : ""}`}>{item.name}</span>
        {item.substitutionDetails && (
          <span className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{item.substitutionDetails}</span>
        )}
      </div>
      <div className="shrink-0 flex items-center justify-end w-20 text-right">
        <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md tabular-nums">{scaledQty} {item.unit}</span>
      </div>
      <div className="shrink-0 flex flex-col items-end justify-center w-24 border-l border-border/40 pl-4">
        <div className="flex items-center gap-1 mb-1">
          <SubstitutionBadge reason={item.substitutionReason} reasonCodes={item.reasonCodes} />
          <PriceSourceBadge source={item.priceSource} />
        </div>
        <span className="text-[15px] font-mono font-bold tabular-nums text-foreground">{formatCurrency(scaledCost)}</span>
      </div>
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
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-muted/30 transition-colors border border-transparent hover:border-border/40"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-xl shadow-sm border border-border/50">
          {CATEGORY_EMOJI[category]}
        </div>
        <span className="flex-1 text-base font-bold tracking-tight text-foreground">{category}</span>
        <div className="flex items-center gap-4 text-right">
           <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md tabular-nums">
             {checkedCount}/{items.length}
           </span>
           <span className="text-sm font-mono font-bold tabular-nums min-w-[70px] text-right">
             {formatCurrency(categoryTotal)}
           </span>
        </div>
        <div className="text-muted-foreground ml-2">
          {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </div>
      </button>
      {!collapsed && (
        <div className="mt-2 space-y-1.5 px-2">
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
    <div className="group flex items-start gap-4 rounded-xl border border-border/50 bg-background hover:bg-muted/10 p-4 transition-all">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
        <Store className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
        <p className="text-[15px] font-bold leading-tight truncate text-foreground">{store.name}</p>
        <p className="text-xs font-medium text-muted-foreground truncate mt-1">
          {store.address}, {store.city}, {store.state} {store.zip}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
            {store.storeType}
          </Badge>
          {store.healthyIncentives && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-green-200 bg-green-50 text-green-700"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
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
    <div className="space-y-6 print:space-y-4 mb-8 grocery-list-print">
      {/* Grocery List Card */}
      <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b bg-muted/10 flex flex-row items-baseline justify-between gap-4 space-y-0">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-bold">Grocery List</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 print:hidden font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-6">
          <p className="text-sm font-medium text-muted-foreground -mt-2">
            {shoppingList.length} item{shoppingList.length !== 1 ? "s" : ""} to
            buy <span className="mx-1.5 opacity-50">·</span> All items are SNAP-eligible
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
            {/* Family size scaler */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-5 py-4">
              <div>
                <p className="text-sm font-semibold">Scale for household</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Plan made for {householdSize} people
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-sm"
                  disabled={scale <= 0.5}
                  onClick={() =>
                    setScale((s) => Math.max(0.5, +(s - 0.5).toFixed(1)))
                  }
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-10 text-center text-[15px] font-bold tabular-nums">
                  {scale}x
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-sm"
                  disabled={scale >= 3}
                  onClick={() =>
                    setScale((s) => Math.min(3, +(s + 0.5).toFixed(1)))
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Cost summary bar */}
            <div className="flex flex-col justify-center rounded-xl border border-border/60 bg-muted/20 px-5 py-3 gap-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">SNAP Total</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono tabular-nums">
                  {formatCurrency(scaledTotal)}
                </span>
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-bold uppercase tracking-wider border-green-200 bg-green-50 text-green-700"
                  >
                    SNAP Eligible
                  </Badge>
                  {liveCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold uppercase tracking-wider border-blue-200 bg-blue-50 text-blue-700"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      {liveCount} live price{liveCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
              {checkedItems.size > 0 && (
                <div className="text-xs font-medium text-muted-foreground mt-0.5">
                  ({formatCurrency(checkedTotal)} checked ·{" "}
                  {formatCurrency(remainingTotal)} remaining)
                </div>
              )}
            </div>
          </div>

          {/* Categorized items */}
          <div className="space-y-2">
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
      <Card className="border-border/60 bg-card shadow-sm overflow-hidden print:hidden mt-8">
        <CardHeader className="p-5 sm:p-6 border-b bg-muted/10">
          <CardTitle className="text-lg font-bold flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-primary" />
            Nearby SNAP-Authorized Stores
          </CardTitle>
          <p className="text-[13px] font-medium text-muted-foreground mt-1.5">
            Based on your ZIP code ({zipCode})
          </p>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <NearbyStores zipCode={zipCode} />
        </CardContent>
      </Card>
    </div>
  );
}
