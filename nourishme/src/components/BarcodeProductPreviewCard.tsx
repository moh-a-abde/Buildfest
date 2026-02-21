import type { BarcodeProduct } from "@/lib/barcode-lookup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BarcodeProductPreviewCardProps = {
  product: BarcodeProduct;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
};

function formatGradeLabel(grade: string | null, label: string) {
  if (!grade) return `${label}: Unknown`;
  return `${label}: ${grade.toUpperCase()}`;
}

function formatNovaLabel(novaGroup: number | null) {
  return novaGroup ? `NOVA: ${novaGroup}` : "NOVA: Unknown";
}

export function BarcodeProductPreviewCard({
  product,
  onConfirm,
  onCancel,
  isConfirming = false,
}: BarcodeProductPreviewCardProps) {
  const allergens = product.offMetadata?.allergens ?? [];
  const hasNutriScore = Boolean(product.offMetadata?.nutri_score);
  const hasEcoScore = Boolean(product.offMetadata?.eco_score);
  const hasNovaGroup = Boolean(product.offMetadata?.nova_group);
  const hasAllergenList = allergens.length > 0;
  const partialMetadata =
    !product.imageUrl ||
    !product.brand ||
    !hasNutriScore ||
    !hasEcoScore ||
    !hasNovaGroup;

  return (
    <Card className="border-border/70 bg-background">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-sm font-semibold">Review scanned product</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted/30">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              Brand: {product.brand || "Unknown brand"}
            </p>
            <p className="text-[11px] text-muted-foreground">Barcode: {product.barcode}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] ${
              hasNutriScore
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {formatGradeLabel(product.offMetadata?.nutri_score ?? null, "Nutri-Score")}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              hasEcoScore
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {formatGradeLabel(product.offMetadata?.eco_score ?? null, "Eco-Score")}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              hasNovaGroup
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {formatNovaLabel(product.offMetadata?.nova_group ?? null)}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              hasAllergenList
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            Allergens: {hasAllergenList ? allergens.slice(0, 3).join(", ") : "None listed"}
          </Badge>
          {allergens.length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{allergens.length - 3} more
            </Badge>
          )}
        </div>

        {partialMetadata && (
          <p className="text-[11px] text-muted-foreground">
            Some product details are missing. Verify the package label before saving.
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" size="sm" className="flex-1" onClick={onConfirm} disabled={isConfirming}>
            Add to pantry
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
