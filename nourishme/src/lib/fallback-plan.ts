import type {
  GeneratePlanToolInput,
  GeneratePlanToolOutput,
} from "@/app/ai/tools";

interface FallbackMeal {
  name: string;
  mealType: "breakfast" | "lunch" | "dinner";
  ingredients: { name: string; quantity: number; unit: string }[];
  calories: number;
  protein: number;
  fiber: number;
  estimatedCost: number;
}

const BREAKFAST_ROTATION: FallbackMeal[] = [
  {
    name: "Oatmeal with Banana",
    mealType: "breakfast",
    ingredients: [
      { name: "Oats, rolled, dry", quantity: 80, unit: "g" },
      { name: "Bananas, raw", quantity: 120, unit: "g" },
      { name: "Milk, 2% reduced fat", quantity: 240, unit: "g" },
    ],
    calories: 420,
    protein: 14,
    fiber: 6,
    estimatedCost: 0.85,
  },
  {
    name: "Scrambled Eggs with Toast",
    mealType: "breakfast",
    ingredients: [
      { name: "Eggs, whole, raw", quantity: 150, unit: "g" },
      { name: "Bread, whole wheat", quantity: 60, unit: "g" },
      { name: "Butter, salted", quantity: 10, unit: "g" },
    ],
    calories: 390,
    protein: 22,
    fiber: 4,
    estimatedCost: 1.1,
  },
  {
    name: "Peanut Butter Toast with Apple",
    mealType: "breakfast",
    ingredients: [
      { name: "Bread, whole wheat", quantity: 60, unit: "g" },
      { name: "Peanut butter, smooth", quantity: 32, unit: "g" },
      { name: "Apples, raw", quantity: 150, unit: "g" },
    ],
    calories: 430,
    protein: 14,
    fiber: 7,
    estimatedCost: 0.9,
  },
];

const LUNCH_ROTATION: FallbackMeal[] = [
  {
    name: "Black Bean and Rice Bowl",
    mealType: "lunch",
    ingredients: [
      { name: "Black beans, canned, drained", quantity: 200, unit: "g" },
      { name: "White rice, long grain, raw", quantity: 100, unit: "g" },
      { name: "Onions, raw", quantity: 50, unit: "g" },
      { name: "Garlic powder", quantity: 2, unit: "g" },
    ],
    calories: 520,
    protein: 20,
    fiber: 15,
    estimatedCost: 1.0,
  },
  {
    name: "Chicken and Vegetable Stir Fry",
    mealType: "lunch",
    ingredients: [
      { name: "Chicken breast, boneless, skinless, raw", quantity: 150, unit: "g" },
      { name: "Brown rice, long grain, raw", quantity: 80, unit: "g" },
      { name: "Carrots, raw", quantity: 80, unit: "g" },
      { name: "Broccoli, raw", quantity: 100, unit: "g" },
      { name: "Soy sauce", quantity: 15, unit: "g" },
    ],
    calories: 550,
    protein: 40,
    fiber: 6,
    estimatedCost: 2.5,
  },
  {
    name: "Lentil Soup with Bread",
    mealType: "lunch",
    ingredients: [
      { name: "Lentils, dry", quantity: 100, unit: "g" },
      { name: "Carrots, raw", quantity: 60, unit: "g" },
      { name: "Celery, raw", quantity: 50, unit: "g" },
      { name: "Bread, whole wheat", quantity: 60, unit: "g" },
    ],
    calories: 480,
    protein: 28,
    fiber: 14,
    estimatedCost: 1.2,
  },
];

const DINNER_ROTATION: FallbackMeal[] = [
  {
    name: "Pasta with Tomato Sauce",
    mealType: "dinner",
    ingredients: [
      { name: "Pasta, dry", quantity: 120, unit: "g" },
      { name: "Tomato sauce, canned", quantity: 200, unit: "g" },
      { name: "Ground beef, 80% lean, raw", quantity: 100, unit: "g" },
      { name: "Onions, raw", quantity: 50, unit: "g" },
    ],
    calories: 650,
    protein: 30,
    fiber: 5,
    estimatedCost: 2.2,
  },
  {
    name: "Chicken Thigh with Rice and Beans",
    mealType: "dinner",
    ingredients: [
      { name: "Chicken thigh, boneless, skinless, raw", quantity: 150, unit: "g" },
      { name: "White rice, long grain, raw", quantity: 100, unit: "g" },
      { name: "Pinto beans, canned, drained", quantity: 150, unit: "g" },
    ],
    calories: 620,
    protein: 42,
    fiber: 8,
    estimatedCost: 2.0,
  },
  {
    name: "Egg Fried Rice",
    mealType: "dinner",
    ingredients: [
      { name: "White rice, long grain, raw", quantity: 120, unit: "g" },
      { name: "Eggs, whole, raw", quantity: 100, unit: "g" },
      { name: "Frozen mixed vegetables", quantity: 100, unit: "g" },
      { name: "Soy sauce", quantity: 15, unit: "g" },
      { name: "Vegetable oil", quantity: 15, unit: "g" },
    ],
    calories: 580,
    protein: 20,
    fiber: 4,
    estimatedCost: 1.5,
  },
];

/**
 * Build a valid N-day meal plan from deterministic templates.
 * Used as fallback when AI generation fails validation.
 * Costs are placeholders — caller should run recalculatePlanCosts.
 */
export function createFallbackPlan(
  constraints: GeneratePlanToolInput,
): GeneratePlanToolOutput {
  const { pantryItems, budget } = constraints;
  const days = budget.horizonDays;
  const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase()));

  const mealsByDay = Array.from({ length: days }, (_, dayIndex) => {
    const breakfast = BREAKFAST_ROTATION[dayIndex % BREAKFAST_ROTATION.length];
    const lunch = LUNCH_ROTATION[dayIndex % LUNCH_ROTATION.length];
    const dinner = DINNER_ROTATION[dayIndex % DINNER_ROTATION.length];

    const mapIngredients = (meal: FallbackMeal) =>
      meal.ingredients.map((ing) => ({
        ...ing,
        fromPantry: pantryNames.has(ing.name.toLowerCase()),
      }));

    const meals = [breakfast, lunch, dinner].map((meal) => ({
      id: `day${dayIndex}-${meal.mealType}`,
      name: meal.name,
      mealType: meal.mealType,
      ingredients: mapIngredients(meal),
      estimatedCost: meal.estimatedCost,
      calories: meal.calories,
      protein: meal.protein,
      fiber: meal.fiber,
    }));

    const dayCost = meals.reduce((s, m) => s + m.estimatedCost, 0);
    const dayCalories = meals.reduce((s, m) => s + m.calories, 0);

    return { dayIndex, meals, dayCost, dayCalories };
  });

  const ingredientMap = new Map<
    string,
    { quantity: number; unit: string; fromPantry: boolean }
  >();
  for (const day of mealsByDay) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        const key = ing.name.toLowerCase();
        const existing = ingredientMap.get(key);
        if (existing && existing.unit === ing.unit) {
          existing.quantity += ing.quantity;
        } else if (!existing) {
          ingredientMap.set(key, { ...ing });
        }
      }
    }
  }

  const shoppingList = Array.from(ingredientMap.entries())
    .filter(([, v]) => !v.fromPantry)
    .map(([name, v]) => ({
      name,
      quantity: Math.round(v.quantity * 100) / 100,
      unit: v.unit,
      estimatedCost: 0,
      pantryOverlap: false,
    }));

  const totalCalories = mealsByDay.reduce((s, d) => s + d.dayCalories, 0);
  const totalProtein = mealsByDay.reduce(
    (s, d) => s + d.meals.reduce((ms, m) => ms + m.protein, 0),
    0,
  );
  const totalFiber = mealsByDay.reduce(
    (s, d) => s + d.meals.reduce((ms, m) => ms + (m.fiber ?? 0), 0),
    0,
  );

  return {
    mealsByDay,
    shoppingList,
    estimatedTotalCost: Math.round(
      mealsByDay.reduce((s, d) => s + d.dayCost, 0) * 100,
    ) / 100,
    nutritionSummary: {
      avgCaloriesPerDay: Math.round(totalCalories / days),
      avgProteinPerDay: Math.round(totalProtein / days),
      avgFiberPerDay: Math.round(totalFiber / days),
      notes: [
        "This is a fallback plan generated due to AI service issues.",
        "Meals are based on simple, budget-friendly templates.",
        "Consider regenerating when the service is available.",
      ],
    },
    confidenceNotes: [
      "FALLBACK: AI generation was unavailable. This plan uses a deterministic template.",
      "Costs will be recalculated from local price data.",
    ],
  };
}
