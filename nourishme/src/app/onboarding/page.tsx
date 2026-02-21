"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useForm,
  useWatch,
  useFormContext,
} from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Clock,
  Leaf,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { AllergenExclusion, CookingTimeLevel, DietaryFlag } from "@/lib/types";

const STORAGE_KEY = "nourishme_onboarding";

const DIETARY_OPTIONS: { value: DietaryFlag; label: string; icon: string }[] = [
  { value: "vegetarian", label: "Vegetarian", icon: "🥬" },
  { value: "vegan", label: "Vegan", icon: "🌱" },
  { value: "gluten-free", label: "Gluten-Free", icon: "🌾" },
  { value: "dairy-free", label: "Dairy-Free", icon: "🥛" },
  { value: "nut-free", label: "Nut-Free", icon: "🥜" },
];

const ALLERGEN_OPTIONS: { value: AllergenExclusion; label: string; icon: string }[] = [
  { value: "peanuts", label: "Peanuts", icon: "🥜" },
  { value: "tree-nuts", label: "Tree Nuts", icon: "🌰" },
  { value: "milk", label: "Milk", icon: "🥛" },
  { value: "eggs", label: "Eggs", icon: "🥚" },
  { value: "soy", label: "Soy", icon: "🫘" },
  { value: "wheat", label: "Wheat", icon: "🌾" },
  { value: "fish", label: "Fish", icon: "🐟" },
  { value: "shellfish", label: "Shellfish", icon: "🦐" },
  { value: "sesame", label: "Sesame", icon: "🧆" },
];

const COOKING_TIME_OPTIONS: {
  value: CookingTimeLevel;
  label: string;
  description: string;
}[] = [
  { value: "quick", label: "Quick", description: "Under 30 minutes" },
  { value: "moderate", label: "Moderate", description: "30–60 minutes" },
  { value: "extended", label: "Extended", description: "Over 60 minutes" },
];

const onboardingSchema = z.object({
  householdSize: z
    .number()
    .min(1, "At least 1 person")
    .max(8, "Maximum 8 people"),
  zipCode: z.string().regex(/^\d{5}$/, "Enter a valid 5-digit ZIP code"),
  dietaryFlags: z.array(z.string()),
  allergenExclusions: z.array(z.string()),
  cookingTime: z.enum(["quick", "moderate", "extended"], {
    error: "Please select a cooking time preference",
  }),
  ecoPriorityEnabled: z.boolean().default(false),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

const TOTAL_STEPS = 4;
const COOKING_TIME_VALUES: CookingTimeLevel[] = ["quick", "moderate", "extended"];

const STEP_META = [
  {
    title: "Household Size",
    description: "How many people are you cooking for?",
    icon: <Users className="w-5 h-5" />,
  },
  {
    title: "Your Location",
    description: "We use this to find local food resources",
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    title: "Dietary Preferences",
    description: "Select any that apply to your household",
    icon: <Leaf className="w-5 h-5" />,
  },
  {
    title: "Cooking Time",
    description: "How much time do you usually have to cook?",
    icon: <Clock className="w-5 h-5" />,
  },
];

function loadSavedData(): Partial<OnboardingValues> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveData(data: Partial<OnboardingValues>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or unavailable
  }
}

type BudgetSnapshot =
  | { snapRemaining?: number; horizonDays?: number }
  | { snap_remaining?: number; horizon_days?: number };

function hasBudgetSnapshot(value: BudgetSnapshot | null): boolean {
  if (!value) return false;
  const snap =
    "snap_remaining" in value
      ? value.snap_remaining
      : value.snapRemaining;
  const horizon =
    "horizon_days" in value
      ? value.horizon_days
      : value.horizonDays;
  return (
    typeof snap === "number" &&
    !Number.isNaN(snap) &&
    snap >= 0 &&
    typeof horizon === "number" &&
    [7, 14, 30].includes(horizon)
  );
}

function hasPantrySnapshot(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => {
    if (!item || typeof item !== "object") return false;
    const name = (item as { name?: unknown }).name;
    return typeof name === "string" && name.trim().length > 0;
  });
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "1";
  const [step, setStep] = useState(0);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [enteredCookingStepAt, setEnteredCookingStepAt] = useState<number | null>(null);

  const saved = loadSavedData();

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      householdSize: saved?.householdSize ?? 2,
      zipCode: saved?.zipCode ?? "",
      dietaryFlags: saved?.dietaryFlags ?? [],
      allergenExclusions: saved?.allergenExclusions ?? [],
      cookingTime: saved?.cookingTime ?? undefined,
      ecoPriorityEnabled: saved?.ecoPriorityEnabled ?? false,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (apiLoaded) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          const p = data.profile;
          const cookingTime =
            typeof p.cooking_time_level === "string" &&
            COOKING_TIME_VALUES.includes(p.cooking_time_level as CookingTimeLevel)
              ? (p.cooking_time_level as CookingTimeLevel)
              : form.getValues("cookingTime");
          form.reset({
            householdSize: p.household_size ?? form.getValues("householdSize"),
            zipCode: p.zip_code ?? form.getValues("zipCode"),
            dietaryFlags: p.dietary_flags ?? form.getValues("dietaryFlags"),
            allergenExclusions: p.allergen_exclusions ?? form.getValues("allergenExclusions"),
            cookingTime,
            ecoPriorityEnabled: p.eco_priority_enabled ?? form.getValues("ecoPriorityEnabled"),
          }, { keepDirtyValues: true });
        }
      })
      .catch(() => {})
      .finally(() => setApiLoaded(true));
  }, [apiLoaded, form]);

  useEffect(() => {
    if (step === TOTAL_STEPS - 1) {
      setEnteredCookingStepAt(Date.now());
      return;
    }
    setEnteredCookingStepAt(null);
  }, [step]);

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    saveData(watchedValues as Partial<OnboardingValues>);
  }, [watchedValues]);

  const validateCurrentStep = useCallback(async () => {
    switch (step) {
      case 0:
        return form.trigger("householdSize");
      case 1:
        return form.trigger("zipCode");
      case 2:
        return true;
      case 3:
        return form.trigger("cookingTime");
      default:
        return true;
    }
  }, [step, form]);

  async function handleNext() {
    const valid = await validateCurrentStep();
    if (!valid) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(values: OnboardingValues) {
    if (step !== TOTAL_STEPS - 1) return;
    if (
      enteredCookingStepAt !== null &&
      Date.now() - enteredCookingStepAt < 300
    ) {
      // Prevent accidental immediate submit when advancing to the last step.
      return;
    }

    setSubmitError(null);
    setIsSaving(true);

    const profileData = {
      household_size: values.householdSize,
      zip_code: values.zipCode,
      dietary_flags: values.dietaryFlags,
      allergen_exclusions: values.allergenExclusions,
      cooking_time_level: values.cookingTime,
      eco_priority_enabled: values.ecoPriorityEnabled,
    };

    localStorage.setItem("nourishme_profile", JSON.stringify(profileData));
    localStorage.removeItem(STORAGE_KEY);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn("Profile API save failed:", data.error);
      }
    } catch {
      // localStorage is the fallback; continue to next step
    }

    let hasBudgetAndPantry = false;
    try {
      const [budgetRes, pantryRes] = await Promise.all([
        fetch("/api/budget").then((r) => r.json()).catch(() => ({})),
        fetch("/api/pantry").then((r) => r.json()).catch(() => ({})),
      ]);
      hasBudgetAndPantry =
        hasBudgetSnapshot(
          (budgetRes as { budget?: BudgetSnapshot }).budget ?? null,
        ) &&
        hasPantrySnapshot((pantryRes as { items?: unknown }).items);
    } catch {
      // API unavailable; fallback to localStorage
    }

    if (!hasBudgetAndPantry) {
      try {
        const budgetRaw = localStorage.getItem("nourishme_budget");
        const pantryRaw = localStorage.getItem("nourishme_pantry");
        const budgetData = budgetRaw ? (JSON.parse(budgetRaw) as BudgetSnapshot) : null;
        const pantryData = pantryRaw ? (JSON.parse(pantryRaw) as unknown) : null;
        hasBudgetAndPantry =
          hasBudgetSnapshot(budgetData) &&
          hasPantrySnapshot(pantryData);
      } catch {
        // ignore parse errors and keep fallback redirect
      }
    }

    setIsSaving(false);
    document.cookie = "nourishme_onboarding_complete=true; path=/; max-age=31536000";
    router.push(hasBudgetAndPantry ? "/dashboard" : "/pantry");
  }

  const currentMeta = STEP_META[step];

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 h-14 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">NourishMe</span>
        </div>
      </header>

      <div className="w-full bg-muted">
        <div
          className="h-1 bg-primary transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <main className="flex-1 flex items-start md:items-center justify-center px-4 py-8 md:py-0">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-2 text-primary">
                {currentMeta.icon}
              </div>
              <CardTitle className="text-2xl">{currentMeta.title}</CardTitle>
              <CardDescription className="text-base">
                {currentMeta.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {step === 0 && <HouseholdStep />}
                  {step === 1 && <ZipCodeStep />}
                  {step === 2 && <DietaryStep />}
                  {step === 3 && <CookingTimeStep />}

                  <div className="flex gap-3 pt-2">
                    {step > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-11"
                        onClick={handleBack}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                    )}
                    {step < TOTAL_STEPS - 1 ? (
                      <Button
                        type="button"
                        className="flex-1 h-11"
                        onClick={handleNext}
                      >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="flex-1 h-11"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            {isEditMode ? "Save Profile" : "Finish Setup"}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>
      </main>
    </div>
  );
}

function HouseholdStep() {
  const { control } = useFormContext<OnboardingValues>();

  return (
    <FormField
      control={control}
      name="householdSize"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="sr-only">Household Size</FormLabel>
          <FormControl>
            <div className="flex items-center justify-center gap-6">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                disabled={field.value <= 1}
                onClick={() => field.onChange(Math.max(1, field.value - 1))}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <span className="text-5xl font-bold tabular-nums text-foreground">
                  {field.value}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {field.value === 1 ? "person" : "people"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                disabled={field.value >= 8}
                onClick={() => field.onChange(Math.min(8, field.value + 1))}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </FormControl>
          <FormDescription className="text-center">
            Including yourself (1–8 people)
          </FormDescription>
          <FormMessage className="text-center" />
        </FormItem>
      )}
    />
  );
}

function ZipCodeStep() {
  const { control } = useFormContext<OnboardingValues>();

  return (
    <FormField
      control={control}
      name="zipCode"
      render={({ field }) => (
        <FormItem>
          <FormLabel>ZIP Code</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="text"
              inputMode="numeric"
              placeholder="e.g. 10001"
              maxLength={5}
              className="text-center text-lg h-12 tracking-widest"
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                field.onChange(val);
              }}
            />
          </FormControl>
          <FormDescription>
            Helps us estimate local grocery prices and find nearby food
            assistance programs.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function DietaryStep() {
  const { control } = useFormContext<OnboardingValues>();

  return (
    <FormField
      control={control}
      name="dietaryFlags"
      render={() => (
        <FormItem>
          <FormLabel className="sr-only">Dietary Preferences</FormLabel>
          <div className="grid gap-3">
            {DIETARY_OPTIONS.map((option) => (
              <FormField
                key={option.value}
                control={control}
                name="dietaryFlags"
                render={({ field }) => {
                  const values = field.value as string[];
                  const checked = values.includes(option.value);
                  return (
                    <FormItem>
                      <FormControl>
                        <label
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            checked
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              field.onChange(
                                isChecked
                                  ? [...values, option.value]
                                  : values.filter((v) => v !== option.value)
                              );
                            }}
                          />
                          <span className="text-xl">{option.icon}</span>
                          <span className="font-medium">{option.label}</span>
                        </label>
                      </FormControl>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium mb-2">Exclude allergens</p>
            <div className="grid gap-3">
              {ALLERGEN_OPTIONS.map((option) => (
                <FormField
                  key={option.value}
                  control={control}
                  name="allergenExclusions"
                  render={({ field }) => {
                    const values = field.value as string[];
                    const checked = values.includes(option.value);
                    return (
                      <FormItem>
                        <FormControl>
                          <label
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              checked
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40 hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                field.onChange(
                                  isChecked
                                    ? [...values, option.value]
                                    : values.filter((v) => v !== option.value)
                                );
                              }}
                            />
                            <span className="text-xl">{option.icon}</span>
                            <span className="font-medium">{option.label}</span>
                          </label>
                        </FormControl>
                      </FormItem>
                    );
                  }}
                />
              ))}
            </div>
          </div>
          <FormDescription className="mt-3">
            Select all that apply. You can always change these later.
          </FormDescription>
        </FormItem>
      )}
    />
  );
}

function CookingTimeStep() {
  const { control } = useFormContext<OnboardingValues>();

  return (
    <>
      <FormField
        control={control}
        name="cookingTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">Cooking Time</FormLabel>
            <FormControl>
              <div className="grid gap-3">
                {COOKING_TIME_OPTIONS.map((option) => {
                  const selected = field.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {option.value === "quick" ? (
                          <Clock className="w-5 h-5" />
                        ) : (
                          <ChefHat className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                      {selected && (
                        <Check className="w-5 h-5 text-primary ml-auto flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="ecoPriorityEnabled"
        render={({ field }) => (
          <FormItem className="mt-4 rounded-lg border p-4">
            <FormLabel className="font-medium">Prioritize lower-impact ingredients</FormLabel>
            <FormDescription>
              We will prefer lower eco-impact alternatives when they fit your budget and nutrition goals.
            </FormDescription>
            <FormControl>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                />
                Enable eco-priority substitutions
              </label>
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );
}
