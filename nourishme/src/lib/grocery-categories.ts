export type GroceryCategory =
  | "Produce"
  | "Meat & Seafood"
  | "Dairy & Eggs"
  | "Grains & Bread"
  | "Canned & Pantry"
  | "Frozen"
  | "Oils & Condiments"
  | "Snacks & Beverages"
  | "Other";

const CATEGORY_KEYWORDS: Record<GroceryCategory, string[]> = {
  Produce: [
    "broccoli", "carrot", "spinach", "tomato", "onion", "garlic", "pepper",
    "potato", "sweet potato", "corn", "celery", "lettuce", "cabbage",
    "zucchini", "squash", "cucumber", "mushroom", "kale", "green bean",
    "pea", "cauliflower", "asparagus", "eggplant", "radish", "beet",
    "avocado", "lemon", "lime", "orange", "apple", "banana", "berry",
    "strawberr", "blueberr", "raspberr", "grape", "melon", "watermelon",
    "peach", "pear", "mango", "pineapple", "kiwi", "plum", "cherry",
    "ginger", "cilantro", "parsley", "basil", "mint", "jalapen",
    "scallion", "leek", "turnip", "collard", "arugula",
  ],
  "Meat & Seafood": [
    "chicken", "beef", "pork", "turkey", "ground meat", "steak",
    "sausage", "bacon", "ham", "hot dog", "drumstick", "thigh",
    "breast", "wing", "tenderloin", "shoulder", "chop",
    "salmon", "tuna", "shrimp", "tilapia", "catfish", "fish",
    "cod", "crab", "lobster", "clam", "mussel",
  ],
  "Dairy & Eggs": [
    "egg", "milk", "cheese", "yogurt", "butter", "cream",
    "sour cream", "cottage cheese", "mozzarella", "cheddar",
    "parmesan", "ricotta", "whipping cream", "half and half",
  ],
  "Grains & Bread": [
    "rice", "pasta", "bread", "tortilla", "oat", "flour",
    "cereal", "granola", "quinoa", "barley", "couscous",
    "cornmeal", "cracker", "noodle", "bun", "roll", "pita",
    "bagel", "muffin", "pancake mix", "biscuit",
  ],
  "Canned & Pantry": [
    "canned", "bean", "lentil", "chickpea", "pinto",
    "kidney", "black bean", "refried", "peanut butter",
    "tomato paste", "tomato sauce", "diced tomato", "broth",
    "stock", "soup", "tuna can", "coconut milk",
    "soy sauce", "hot sauce", "vinegar", "ketchup", "mustard",
    "mayonnaise", "salsa", "jam", "jelly", "honey", "maple syrup",
    "sugar", "brown sugar", "salt", "pepper", "spice",
    "cumin", "paprika", "chili powder", "oregano", "thyme",
    "cinnamon", "nutmeg", "bay leaf", "garlic powder",
    "onion powder", "Italian seasoning", "taco seasoning",
    "baking powder", "baking soda", "vanilla", "cocoa",
    "cornstarch", "yeast",
    "tofu", "edamame", "split pea", "navy bean", "lima bean",
  ],
  Frozen: [
    "frozen", "ice cream", "frozen vegetable", "frozen fruit",
    "frozen pizza", "fish stick", "frozen dinner", "pot pie",
    "frozen burrito", "ice pop",
  ],
  "Oils & Condiments": [
    "oil", "olive oil", "vegetable oil", "canola oil", "coconut oil",
    "cooking spray", "sesame oil", "dressing", "ranch", "bbq sauce",
    "worcestershire", "teriyaki",
  ],
  "Snacks & Beverages": [
    "juice", "coffee", "tea", "soda", "water",
    "chip", "pretzel", "popcorn", "nut", "almond",
    "walnut", "pecan", "cashew", "sunflower seed", "pumpkin seed",
    "trail mix", "granola bar", "cookie", "cracker",
  ],
  Other: [],
};

export function categorizeItem(name: string): GroceryCategory {
  const lower = name.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    GroceryCategory,
    string[],
  ][]) {
    if (category === "Other") continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }

  return "Other";
}

export function groupByCategory<T extends { name: string }>(
  items: T[],
): Map<GroceryCategory, T[]> {
  const groups = new Map<GroceryCategory, T[]>();

  for (const item of items) {
    const cat = categorizeItem(item.name);
    const list = groups.get(cat) ?? [];
    list.push(item);
    groups.set(cat, list);
  }

  return groups;
}

const CATEGORY_ORDER: GroceryCategory[] = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Grains & Bread",
  "Canned & Pantry",
  "Frozen",
  "Oils & Condiments",
  "Snacks & Beverages",
  "Other",
];

export function sortedCategories(
  groups: Map<GroceryCategory, unknown[]>,
): GroceryCategory[] {
  return CATEGORY_ORDER.filter((c) => groups.has(c) && groups.get(c)!.length > 0);
}
