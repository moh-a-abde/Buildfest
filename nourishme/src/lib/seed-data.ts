/**
 * Static seed data for nutrition_data and price_estimates tables.
 *
 * Nutrition values sourced from USDA SR28 ABBREV dataset (per 100 g edible portion).
 * Price estimates based on Walmart/Aldi Saint Paul, MN area pricing (Feb 2026).
 * All prices are clearly labeled as estimates and should not be used for
 * financial decisions without verification.
 */

import type { NutritionSeedRow, PriceSeedRow } from "./types";

// ─────────────────────────────────────────────
// Nutrition seed data — USDA SR28 per 100 g
// ─────────────────────────────────────────────

export const NUTRITION_SEED_DATA: NutritionSeedRow[] = [
  // ── Poultry ──
  { food_name: "Chicken breast, boneless, skinless, raw", category: "Poultry", calories_per_100g: 120, protein_per_100g: 22.5, fiber_per_100g: 0, sodium_per_100g: 45, serving_size_g: 100, usda_ndb_no: "05062" },
  { food_name: "Chicken thigh, boneless, skinless, raw", category: "Poultry", calories_per_100g: 177, protein_per_100g: 19.7, fiber_per_100g: 0, sodium_per_100g: 75, serving_size_g: 100, usda_ndb_no: "05096" },
  { food_name: "Chicken drumstick, raw", category: "Poultry", calories_per_100g: 161, protein_per_100g: 19.3, fiber_per_100g: 0, sodium_per_100g: 77, serving_size_g: 100, usda_ndb_no: "05082" },
  { food_name: "Chicken wings, raw", category: "Poultry", calories_per_100g: 203, protein_per_100g: 18.3, fiber_per_100g: 0, sodium_per_100g: 73, serving_size_g: 100, usda_ndb_no: "05090" },
  { food_name: "Ground turkey, raw", category: "Poultry", calories_per_100g: 148, protein_per_100g: 19.7, fiber_per_100g: 0, sodium_per_100g: 65, serving_size_g: 100, usda_ndb_no: "05664" },
  { food_name: "Turkey breast, raw", category: "Poultry", calories_per_100g: 104, protein_per_100g: 23.7, fiber_per_100g: 0, sodium_per_100g: 52, serving_size_g: 100, usda_ndb_no: "05220" },

  // ── Beef & Pork ──
  { food_name: "Ground beef, 80% lean, raw", category: "Beef & Pork", calories_per_100g: 254, protein_per_100g: 17.2, fiber_per_100g: 0, sodium_per_100g: 66, serving_size_g: 100, usda_ndb_no: "23572" },
  { food_name: "Ground beef, 90% lean, raw", category: "Beef & Pork", calories_per_100g: 176, protein_per_100g: 20.0, fiber_per_100g: 0, sodium_per_100g: 66, serving_size_g: 100, usda_ndb_no: "23557" },
  { food_name: "Beef stew meat, raw", category: "Beef & Pork", calories_per_100g: 149, protein_per_100g: 20.2, fiber_per_100g: 0, sodium_per_100g: 61, serving_size_g: 100, usda_ndb_no: "13346" },
  { food_name: "Pork chop, bone-in, raw", category: "Beef & Pork", calories_per_100g: 154, protein_per_100g: 21.0, fiber_per_100g: 0, sodium_per_100g: 50, serving_size_g: 100, usda_ndb_no: "10040" },
  { food_name: "Pork tenderloin, raw", category: "Beef & Pork", calories_per_100g: 120, protein_per_100g: 22.2, fiber_per_100g: 0, sodium_per_100g: 53, serving_size_g: 100, usda_ndb_no: "10218" },
  { food_name: "Pork shoulder, raw", category: "Beef & Pork", calories_per_100g: 207, protein_per_100g: 17.4, fiber_per_100g: 0, sodium_per_100g: 63, serving_size_g: 100, usda_ndb_no: "10072" },
  { food_name: "Hot dogs, beef", category: "Beef & Pork", calories_per_100g: 290, protein_per_100g: 11.4, fiber_per_100g: 0, sodium_per_100g: 1090, serving_size_g: 100, usda_ndb_no: "07024" },
  { food_name: "Bacon, raw", category: "Beef & Pork", calories_per_100g: 417, protein_per_100g: 13.7, fiber_per_100g: 0, sodium_per_100g: 1021, serving_size_g: 100, usda_ndb_no: "10124" },

  // ── Seafood ──
  { food_name: "Salmon, Atlantic, raw", category: "Seafood", calories_per_100g: 208, protein_per_100g: 20.4, fiber_per_100g: 0, sodium_per_100g: 59, serving_size_g: 100, usda_ndb_no: "15236" },
  { food_name: "Tuna, canned in water, drained", category: "Seafood", calories_per_100g: 116, protein_per_100g: 25.5, fiber_per_100g: 0, sodium_per_100g: 338, serving_size_g: 100, usda_ndb_no: "15126" },
  { food_name: "Shrimp, raw", category: "Seafood", calories_per_100g: 85, protein_per_100g: 20.1, fiber_per_100g: 0, sodium_per_100g: 119, serving_size_g: 100, usda_ndb_no: "15149" },
  { food_name: "Tilapia, raw", category: "Seafood", calories_per_100g: 96, protein_per_100g: 20.1, fiber_per_100g: 0, sodium_per_100g: 52, serving_size_g: 100, usda_ndb_no: "15261" },
  { food_name: "Catfish, raw", category: "Seafood", calories_per_100g: 95, protein_per_100g: 16.4, fiber_per_100g: 0, sodium_per_100g: 43, serving_size_g: 100, usda_ndb_no: "15010" },

  // ── Eggs & Dairy ──
  { food_name: "Eggs, whole, raw", category: "Eggs & Dairy", calories_per_100g: 143, protein_per_100g: 12.6, fiber_per_100g: 0, sodium_per_100g: 142, serving_size_g: 100, usda_ndb_no: "01123" },
  { food_name: "Milk, whole, 3.25%", category: "Eggs & Dairy", calories_per_100g: 61, protein_per_100g: 3.2, fiber_per_100g: 0, sodium_per_100g: 43, serving_size_g: 100, usda_ndb_no: "01077" },
  { food_name: "Milk, 2% reduced fat", category: "Eggs & Dairy", calories_per_100g: 50, protein_per_100g: 3.3, fiber_per_100g: 0, sodium_per_100g: 47, serving_size_g: 100, usda_ndb_no: "01079" },
  { food_name: "Milk, skim", category: "Eggs & Dairy", calories_per_100g: 34, protein_per_100g: 3.4, fiber_per_100g: 0, sodium_per_100g: 51, serving_size_g: 100, usda_ndb_no: "01085" },
  { food_name: "Cheddar cheese", category: "Eggs & Dairy", calories_per_100g: 403, protein_per_100g: 24.9, fiber_per_100g: 0, sodium_per_100g: 621, serving_size_g: 100, usda_ndb_no: "01009" },
  { food_name: "Mozzarella cheese", category: "Eggs & Dairy", calories_per_100g: 280, protein_per_100g: 27.5, fiber_per_100g: 0, sodium_per_100g: 619, serving_size_g: 100, usda_ndb_no: "01026" },
  { food_name: "Cream cheese", category: "Eggs & Dairy", calories_per_100g: 342, protein_per_100g: 5.9, fiber_per_100g: 0, sodium_per_100g: 321, serving_size_g: 100, usda_ndb_no: "01017" },
  { food_name: "Yogurt, plain, low fat", category: "Eggs & Dairy", calories_per_100g: 63, protein_per_100g: 5.3, fiber_per_100g: 0, sodium_per_100g: 70, serving_size_g: 100, usda_ndb_no: "01117" },
  { food_name: "Greek yogurt, plain, nonfat", category: "Eggs & Dairy", calories_per_100g: 59, protein_per_100g: 10.2, fiber_per_100g: 0, sodium_per_100g: 36, serving_size_g: 100, usda_ndb_no: "01256" },
  { food_name: "Butter, salted", category: "Eggs & Dairy", calories_per_100g: 717, protein_per_100g: 0.9, fiber_per_100g: 0, sodium_per_100g: 643, serving_size_g: 100, usda_ndb_no: "01001" },
  { food_name: "Sour cream", category: "Eggs & Dairy", calories_per_100g: 193, protein_per_100g: 2.4, fiber_per_100g: 0, sodium_per_100g: 53, serving_size_g: 100, usda_ndb_no: "01056" },
  { food_name: "Cottage cheese, low fat", category: "Eggs & Dairy", calories_per_100g: 72, protein_per_100g: 12.4, fiber_per_100g: 0, sodium_per_100g: 406, serving_size_g: 100, usda_ndb_no: "01015" },

  // ── Grains & Cereals ──
  { food_name: "White rice, long grain, raw", category: "Grains & Cereals", calories_per_100g: 365, protein_per_100g: 7.1, fiber_per_100g: 1.3, sodium_per_100g: 5, serving_size_g: 100, usda_ndb_no: "20044" },
  { food_name: "Brown rice, long grain, raw", category: "Grains & Cereals", calories_per_100g: 370, protein_per_100g: 7.9, fiber_per_100g: 3.5, sodium_per_100g: 7, serving_size_g: 100, usda_ndb_no: "20040" },
  { food_name: "Oats, rolled, dry", category: "Grains & Cereals", calories_per_100g: 379, protein_per_100g: 13.2, fiber_per_100g: 10.1, sodium_per_100g: 6, serving_size_g: 100, usda_ndb_no: "08120" },
  { food_name: "Pasta, dry", category: "Grains & Cereals", calories_per_100g: 371, protein_per_100g: 13.0, fiber_per_100g: 1.8, sodium_per_100g: 6, serving_size_g: 100, usda_ndb_no: "20120" },
  { food_name: "Bread, white", category: "Grains & Cereals", calories_per_100g: 265, protein_per_100g: 9.4, fiber_per_100g: 2.7, sodium_per_100g: 491, serving_size_g: 100, usda_ndb_no: "18069" },
  { food_name: "Bread, whole wheat", category: "Grains & Cereals", calories_per_100g: 247, protein_per_100g: 12.9, fiber_per_100g: 6.8, sodium_per_100g: 450, serving_size_g: 100, usda_ndb_no: "18075" },
  { food_name: "Tortillas, flour", category: "Grains & Cereals", calories_per_100g: 312, protein_per_100g: 8.2, fiber_per_100g: 2.1, sodium_per_100g: 530, serving_size_g: 100, usda_ndb_no: "18364" },
  { food_name: "Tortillas, corn", category: "Grains & Cereals", calories_per_100g: 218, protein_per_100g: 5.7, fiber_per_100g: 5.5, sodium_per_100g: 46, serving_size_g: 100, usda_ndb_no: "18363" },
  { food_name: "Cornmeal, yellow", category: "Grains & Cereals", calories_per_100g: 362, protein_per_100g: 8.1, fiber_per_100g: 7.3, sodium_per_100g: 7, serving_size_g: 100, usda_ndb_no: "20022" },
  { food_name: "All-purpose flour", category: "Grains & Cereals", calories_per_100g: 364, protein_per_100g: 10.3, fiber_per_100g: 2.7, sodium_per_100g: 2, serving_size_g: 100, usda_ndb_no: "20081" },
  { food_name: "Quinoa, raw", category: "Grains & Cereals", calories_per_100g: 368, protein_per_100g: 14.1, fiber_per_100g: 7.0, sodium_per_100g: 5, serving_size_g: 100, usda_ndb_no: "20035" },
  { food_name: "Barley, pearled, raw", category: "Grains & Cereals", calories_per_100g: 352, protein_per_100g: 9.9, fiber_per_100g: 15.6, sodium_per_100g: 9, serving_size_g: 100, usda_ndb_no: "20005" },
  { food_name: "Couscous, dry", category: "Grains & Cereals", calories_per_100g: 376, protein_per_100g: 12.8, fiber_per_100g: 2.0, sodium_per_100g: 10, serving_size_g: 100, usda_ndb_no: "20028" },
  { food_name: "Cereal, corn flakes", category: "Grains & Cereals", calories_per_100g: 357, protein_per_100g: 7.5, fiber_per_100g: 3.3, sodium_per_100g: 729, serving_size_g: 100, usda_ndb_no: "08020" },
  { food_name: "Granola, oats and honey", category: "Grains & Cereals", calories_per_100g: 471, protein_per_100g: 10.4, fiber_per_100g: 5.4, sodium_per_100g: 246, serving_size_g: 100, usda_ndb_no: "08218" },
  { food_name: "Crackers, saltines", category: "Grains & Cereals", calories_per_100g: 421, protein_per_100g: 9.6, fiber_per_100g: 2.9, sodium_per_100g: 1072, serving_size_g: 100, usda_ndb_no: "18228" },

  // ── Legumes ──
  { food_name: "Black beans, canned, drained", category: "Legumes", calories_per_100g: 132, protein_per_100g: 8.9, fiber_per_100g: 8.7, sodium_per_100g: 237, serving_size_g: 100, usda_ndb_no: "16015" },
  { food_name: "Pinto beans, canned, drained", category: "Legumes", calories_per_100g: 124, protein_per_100g: 7.6, fiber_per_100g: 6.1, sodium_per_100g: 294, serving_size_g: 100, usda_ndb_no: "16043" },
  { food_name: "Kidney beans, canned, drained", category: "Legumes", calories_per_100g: 127, protein_per_100g: 8.7, fiber_per_100g: 6.3, sodium_per_100g: 256, serving_size_g: 100, usda_ndb_no: "16028" },
  { food_name: "Chickpeas, canned, drained", category: "Legumes", calories_per_100g: 164, protein_per_100g: 8.9, fiber_per_100g: 7.6, sodium_per_100g: 243, serving_size_g: 100, usda_ndb_no: "16058" },
  { food_name: "Lentils, dry", category: "Legumes", calories_per_100g: 353, protein_per_100g: 25.8, fiber_per_100g: 10.7, sodium_per_100g: 6, serving_size_g: 100, usda_ndb_no: "16069" },
  { food_name: "Split peas, dry", category: "Legumes", calories_per_100g: 341, protein_per_100g: 24.6, fiber_per_100g: 25.5, sodium_per_100g: 15, serving_size_g: 100, usda_ndb_no: "16086" },
  { food_name: "Navy beans, dry", category: "Legumes", calories_per_100g: 337, protein_per_100g: 22.3, fiber_per_100g: 15.3, sodium_per_100g: 5, serving_size_g: 100, usda_ndb_no: "16038" },
  { food_name: "Lima beans, canned, drained", category: "Legumes", calories_per_100g: 105, protein_per_100g: 6.8, fiber_per_100g: 4.8, sodium_per_100g: 270, serving_size_g: 100, usda_ndb_no: "16072" },
  { food_name: "Refried beans, canned", category: "Legumes", calories_per_100g: 91, protein_per_100g: 5.4, fiber_per_100g: 4.4, sodium_per_100g: 522, serving_size_g: 100, usda_ndb_no: "16202" },
  { food_name: "Peanut butter, smooth", category: "Legumes", calories_per_100g: 588, protein_per_100g: 25.1, fiber_per_100g: 6.0, sodium_per_100g: 459, serving_size_g: 100, usda_ndb_no: "16098" },
  { food_name: "Tofu, firm", category: "Legumes", calories_per_100g: 144, protein_per_100g: 15.6, fiber_per_100g: 1.2, sodium_per_100g: 14, serving_size_g: 100, usda_ndb_no: "16427" },
  { food_name: "Edamame, frozen", category: "Legumes", calories_per_100g: 121, protein_per_100g: 11.9, fiber_per_100g: 5.2, sodium_per_100g: 6, serving_size_g: 100, usda_ndb_no: "11212" },

  // ── Vegetables ──
  { food_name: "Broccoli, raw", category: "Vegetables", calories_per_100g: 34, protein_per_100g: 2.8, fiber_per_100g: 2.6, sodium_per_100g: 33, serving_size_g: 100, usda_ndb_no: "11090" },
  { food_name: "Carrots, raw", category: "Vegetables", calories_per_100g: 41, protein_per_100g: 0.9, fiber_per_100g: 2.8, sodium_per_100g: 69, serving_size_g: 100, usda_ndb_no: "11124" },
  { food_name: "Spinach, raw", category: "Vegetables", calories_per_100g: 23, protein_per_100g: 2.9, fiber_per_100g: 2.2, sodium_per_100g: 79, serving_size_g: 100, usda_ndb_no: "11457" },
  { food_name: "Spinach, frozen", category: "Vegetables", calories_per_100g: 29, protein_per_100g: 3.6, fiber_per_100g: 2.6, sodium_per_100g: 58, serving_size_g: 100, usda_ndb_no: "11463" },
  { food_name: "Tomatoes, raw", category: "Vegetables", calories_per_100g: 18, protein_per_100g: 0.9, fiber_per_100g: 1.2, sodium_per_100g: 5, serving_size_g: 100, usda_ndb_no: "11529" },
  { food_name: "Tomatoes, canned, diced", category: "Vegetables", calories_per_100g: 17, protein_per_100g: 0.8, fiber_per_100g: 0.9, sodium_per_100g: 132, serving_size_g: 100, usda_ndb_no: "11531" },
  { food_name: "Tomato paste, canned", category: "Vegetables", calories_per_100g: 82, protein_per_100g: 4.3, fiber_per_100g: 4.1, sodium_per_100g: 59, serving_size_g: 100, usda_ndb_no: "11546" },
  { food_name: "Onions, raw", category: "Vegetables", calories_per_100g: 40, protein_per_100g: 1.1, fiber_per_100g: 1.7, sodium_per_100g: 4, serving_size_g: 100, usda_ndb_no: "11282" },
  { food_name: "Garlic, raw", category: "Vegetables", calories_per_100g: 149, protein_per_100g: 6.4, fiber_per_100g: 2.1, sodium_per_100g: 17, serving_size_g: 100, usda_ndb_no: "11215" },
  { food_name: "Bell peppers, green, raw", category: "Vegetables", calories_per_100g: 20, protein_per_100g: 0.9, fiber_per_100g: 1.7, sodium_per_100g: 3, serving_size_g: 100, usda_ndb_no: "11333" },
  { food_name: "Bell peppers, red, raw", category: "Vegetables", calories_per_100g: 31, protein_per_100g: 1.0, fiber_per_100g: 2.1, sodium_per_100g: 4, serving_size_g: 100, usda_ndb_no: "11821" },
  { food_name: "Potatoes, russet, raw", category: "Vegetables", calories_per_100g: 79, protein_per_100g: 2.1, fiber_per_100g: 1.3, sodium_per_100g: 5, serving_size_g: 100, usda_ndb_no: "11354" },
  { food_name: "Sweet potatoes, raw", category: "Vegetables", calories_per_100g: 86, protein_per_100g: 1.6, fiber_per_100g: 3.0, sodium_per_100g: 55, serving_size_g: 100, usda_ndb_no: "11507" },
  { food_name: "Corn, sweet, canned, drained", category: "Vegetables", calories_per_100g: 79, protein_per_100g: 2.3, fiber_per_100g: 1.7, sodium_per_100g: 205, serving_size_g: 100, usda_ndb_no: "11172" },
  { food_name: "Corn, sweet, frozen", category: "Vegetables", calories_per_100g: 86, protein_per_100g: 3.3, fiber_per_100g: 2.8, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "11179" },
  { food_name: "Green beans, canned, drained", category: "Vegetables", calories_per_100g: 20, protein_per_100g: 1.2, fiber_per_100g: 1.3, sodium_per_100g: 260, serving_size_g: 100, usda_ndb_no: "11056" },
  { food_name: "Green beans, frozen", category: "Vegetables", calories_per_100g: 33, protein_per_100g: 1.8, fiber_per_100g: 3.0, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "11061" },
  { food_name: "Peas, green, frozen", category: "Vegetables", calories_per_100g: 77, protein_per_100g: 5.2, fiber_per_100g: 4.5, sodium_per_100g: 72, serving_size_g: 100, usda_ndb_no: "11312" },
  { food_name: "Cabbage, raw", category: "Vegetables", calories_per_100g: 25, protein_per_100g: 1.3, fiber_per_100g: 2.5, sodium_per_100g: 18, serving_size_g: 100, usda_ndb_no: "11109" },
  { food_name: "Lettuce, iceberg, raw", category: "Vegetables", calories_per_100g: 14, protein_per_100g: 0.9, fiber_per_100g: 1.2, sodium_per_100g: 10, serving_size_g: 100, usda_ndb_no: "11252" },
  { food_name: "Lettuce, romaine, raw", category: "Vegetables", calories_per_100g: 17, protein_per_100g: 1.2, fiber_per_100g: 2.1, sodium_per_100g: 8, serving_size_g: 100, usda_ndb_no: "11251" },
  { food_name: "Celery, raw", category: "Vegetables", calories_per_100g: 14, protein_per_100g: 0.7, fiber_per_100g: 1.6, sodium_per_100g: 80, serving_size_g: 100, usda_ndb_no: "11143" },
  { food_name: "Cucumber, raw", category: "Vegetables", calories_per_100g: 15, protein_per_100g: 0.7, fiber_per_100g: 0.5, sodium_per_100g: 2, serving_size_g: 100, usda_ndb_no: "11205" },
  { food_name: "Zucchini, raw", category: "Vegetables", calories_per_100g: 17, protein_per_100g: 1.2, fiber_per_100g: 1.0, sodium_per_100g: 8, serving_size_g: 100, usda_ndb_no: "11477" },
  { food_name: "Cauliflower, raw", category: "Vegetables", calories_per_100g: 25, protein_per_100g: 1.9, fiber_per_100g: 2.0, sodium_per_100g: 30, serving_size_g: 100, usda_ndb_no: "11135" },
  { food_name: "Mushrooms, white, raw", category: "Vegetables", calories_per_100g: 22, protein_per_100g: 3.1, fiber_per_100g: 1.0, sodium_per_100g: 5, serving_size_g: 100, usda_ndb_no: "11260" },
  { food_name: "Mixed vegetables, frozen", category: "Vegetables", calories_per_100g: 54, protein_per_100g: 2.9, fiber_per_100g: 3.5, sodium_per_100g: 42, serving_size_g: 100, usda_ndb_no: "11581" },
  { food_name: "Kale, raw", category: "Vegetables", calories_per_100g: 49, protein_per_100g: 4.3, fiber_per_100g: 3.6, sodium_per_100g: 38, serving_size_g: 100, usda_ndb_no: "11233" },
  { food_name: "Collard greens, frozen", category: "Vegetables", calories_per_100g: 30, protein_per_100g: 2.7, fiber_per_100g: 3.5, sodium_per_100g: 22, serving_size_g: 100, usda_ndb_no: "11162" },
  { food_name: "Squash, butternut, raw", category: "Vegetables", calories_per_100g: 45, protein_per_100g: 1.0, fiber_per_100g: 2.0, sodium_per_100g: 4, serving_size_g: 100, usda_ndb_no: "11485" },
  { food_name: "Jalapeño peppers, raw", category: "Vegetables", calories_per_100g: 29, protein_per_100g: 0.9, fiber_per_100g: 2.8, sodium_per_100g: 3, serving_size_g: 100, usda_ndb_no: "11979" },
  { food_name: "Avocado, raw", category: "Vegetables", calories_per_100g: 160, protein_per_100g: 2.0, fiber_per_100g: 6.7, sodium_per_100g: 7, serving_size_g: 100, usda_ndb_no: "09037" },
  { food_name: "Beets, canned, drained", category: "Vegetables", calories_per_100g: 31, protein_per_100g: 0.9, fiber_per_100g: 1.8, sodium_per_100g: 194, serving_size_g: 100, usda_ndb_no: "11084" },

  // ── Fruits ──
  { food_name: "Bananas, raw", category: "Fruits", calories_per_100g: 89, protein_per_100g: 1.1, fiber_per_100g: 2.6, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09040" },
  { food_name: "Apples, raw, with skin", category: "Fruits", calories_per_100g: 52, protein_per_100g: 0.3, fiber_per_100g: 2.4, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09003" },
  { food_name: "Oranges, raw", category: "Fruits", calories_per_100g: 47, protein_per_100g: 0.9, fiber_per_100g: 2.4, sodium_per_100g: 0, serving_size_g: 100, usda_ndb_no: "09200" },
  { food_name: "Grapes, red, raw", category: "Fruits", calories_per_100g: 69, protein_per_100g: 0.7, fiber_per_100g: 0.9, sodium_per_100g: 2, serving_size_g: 100, usda_ndb_no: "09132" },
  { food_name: "Strawberries, raw", category: "Fruits", calories_per_100g: 32, protein_per_100g: 0.7, fiber_per_100g: 2.0, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09316" },
  { food_name: "Blueberries, raw", category: "Fruits", calories_per_100g: 57, protein_per_100g: 0.7, fiber_per_100g: 2.4, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09050" },
  { food_name: "Blueberries, frozen", category: "Fruits", calories_per_100g: 51, protein_per_100g: 0.4, fiber_per_100g: 2.7, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09054" },
  { food_name: "Watermelon, raw", category: "Fruits", calories_per_100g: 30, protein_per_100g: 0.6, fiber_per_100g: 0.4, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09326" },
  { food_name: "Peaches, canned in juice", category: "Fruits", calories_per_100g: 44, protein_per_100g: 0.5, fiber_per_100g: 0.6, sodium_per_100g: 4, serving_size_g: 100, usda_ndb_no: "09369" },
  { food_name: "Pears, raw", category: "Fruits", calories_per_100g: 57, protein_per_100g: 0.4, fiber_per_100g: 3.1, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09252" },
  { food_name: "Pineapple, canned in juice", category: "Fruits", calories_per_100g: 50, protein_per_100g: 0.4, fiber_per_100g: 0.8, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09268" },
  { food_name: "Mango, raw", category: "Fruits", calories_per_100g: 60, protein_per_100g: 0.8, fiber_per_100g: 1.6, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09176" },
  { food_name: "Raisins", category: "Fruits", calories_per_100g: 299, protein_per_100g: 3.1, fiber_per_100g: 3.7, sodium_per_100g: 11, serving_size_g: 100, usda_ndb_no: "09298" },
  { food_name: "Applesauce, unsweetened", category: "Fruits", calories_per_100g: 42, protein_per_100g: 0.2, fiber_per_100g: 1.1, sodium_per_100g: 2, serving_size_g: 100, usda_ndb_no: "09019" },
  { food_name: "Fruit cocktail, canned in juice", category: "Fruits", calories_per_100g: 37, protein_per_100g: 0.4, fiber_per_100g: 0.8, sodium_per_100g: 5, serving_size_g: 100, usda_ndb_no: "09099" },
  { food_name: "Lemon juice, raw", category: "Fruits", calories_per_100g: 22, protein_per_100g: 0.4, fiber_per_100g: 0.3, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09152" },
  { food_name: "Lime juice, raw", category: "Fruits", calories_per_100g: 25, protein_per_100g: 0.4, fiber_per_100g: 0.4, sodium_per_100g: 2, serving_size_g: 100, usda_ndb_no: "09160" },
  { food_name: "Orange juice, from concentrate", category: "Fruits", calories_per_100g: 47, protein_per_100g: 0.7, fiber_per_100g: 0.2, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "09215" },

  // ── Nuts & Seeds ──
  { food_name: "Almonds, raw", category: "Nuts & Seeds", calories_per_100g: 579, protein_per_100g: 21.2, fiber_per_100g: 12.5, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "12061" },
  { food_name: "Walnuts, raw", category: "Nuts & Seeds", calories_per_100g: 654, protein_per_100g: 15.2, fiber_per_100g: 6.7, sodium_per_100g: 2, serving_size_g: 100, usda_ndb_no: "12155" },
  { food_name: "Sunflower seeds, raw", category: "Nuts & Seeds", calories_per_100g: 584, protein_per_100g: 20.8, fiber_per_100g: 8.6, sodium_per_100g: 9, serving_size_g: 100, usda_ndb_no: "12036" },
  { food_name: "Peanuts, dry roasted", category: "Nuts & Seeds", calories_per_100g: 585, protein_per_100g: 23.7, fiber_per_100g: 8.0, sodium_per_100g: 6, serving_size_g: 100, usda_ndb_no: "16090" },
  { food_name: "Chia seeds", category: "Nuts & Seeds", calories_per_100g: 486, protein_per_100g: 16.5, fiber_per_100g: 34.4, sodium_per_100g: 16, serving_size_g: 100, usda_ndb_no: "12006" },
  { food_name: "Flaxseed, ground", category: "Nuts & Seeds", calories_per_100g: 534, protein_per_100g: 18.3, fiber_per_100g: 27.3, sodium_per_100g: 30, serving_size_g: 100, usda_ndb_no: "12220" },

  // ── Oils & Fats ──
  { food_name: "Olive oil", category: "Oils & Fats", calories_per_100g: 884, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 2, serving_size_g: 100, usda_ndb_no: "04053" },
  { food_name: "Vegetable oil, canola", category: "Oils & Fats", calories_per_100g: 884, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 0, serving_size_g: 100, usda_ndb_no: "04582" },
  { food_name: "Margarine, regular", category: "Oils & Fats", calories_per_100g: 717, protein_per_100g: 0.2, fiber_per_100g: 0, sodium_per_100g: 751, serving_size_g: 100, usda_ndb_no: "04610" },
  { food_name: "Mayonnaise", category: "Oils & Fats", calories_per_100g: 680, protein_per_100g: 1.0, fiber_per_100g: 0, sodium_per_100g: 635, serving_size_g: 100, usda_ndb_no: "04025" },

  // ── Canned & Pantry Staples ──
  { food_name: "Chicken broth, canned", category: "Pantry Staples", calories_per_100g: 7, protein_per_100g: 1.0, fiber_per_100g: 0, sodium_per_100g: 372, serving_size_g: 100, usda_ndb_no: "06080" },
  { food_name: "Vegetable broth", category: "Pantry Staples", calories_per_100g: 6, protein_per_100g: 0.2, fiber_per_100g: 0, sodium_per_100g: 307, serving_size_g: 100, usda_ndb_no: "06615" },
  { food_name: "Tomato sauce, canned", category: "Pantry Staples", calories_per_100g: 29, protein_per_100g: 1.3, fiber_per_100g: 1.5, sodium_per_100g: 525, serving_size_g: 100, usda_ndb_no: "11549" },
  { food_name: "Salsa, ready to serve", category: "Pantry Staples", calories_per_100g: 27, protein_per_100g: 1.3, fiber_per_100g: 1.5, sodium_per_100g: 571, serving_size_g: 100, usda_ndb_no: "06164" },
  { food_name: "Soy sauce", category: "Pantry Staples", calories_per_100g: 53, protein_per_100g: 8.1, fiber_per_100g: 0.8, sodium_per_100g: 5493, serving_size_g: 100, usda_ndb_no: "16124" },
  { food_name: "Ketchup", category: "Pantry Staples", calories_per_100g: 101, protein_per_100g: 1.0, fiber_per_100g: 0.3, sodium_per_100g: 907, serving_size_g: 100, usda_ndb_no: "11935" },
  { food_name: "Mustard, yellow", category: "Pantry Staples", calories_per_100g: 60, protein_per_100g: 3.7, fiber_per_100g: 4.0, sodium_per_100g: 1135, serving_size_g: 100, usda_ndb_no: "02046" },
  { food_name: "Vinegar, distilled", category: "Pantry Staples", calories_per_100g: 18, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 2, serving_size_g: 100, usda_ndb_no: "02048" },
  { food_name: "Sugar, granulated", category: "Pantry Staples", calories_per_100g: 387, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 1, serving_size_g: 100, usda_ndb_no: "19335" },
  { food_name: "Brown sugar", category: "Pantry Staples", calories_per_100g: 380, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 28, serving_size_g: 100, usda_ndb_no: "19334" },
  { food_name: "Honey", category: "Pantry Staples", calories_per_100g: 304, protein_per_100g: 0.3, fiber_per_100g: 0.2, sodium_per_100g: 4, serving_size_g: 100, usda_ndb_no: "19296" },
  { food_name: "Maple syrup", category: "Pantry Staples", calories_per_100g: 260, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 12, serving_size_g: 100, usda_ndb_no: "19353" },
  { food_name: "Jam, strawberry", category: "Pantry Staples", calories_per_100g: 250, protein_per_100g: 0.4, fiber_per_100g: 0.6, sodium_per_100g: 32, serving_size_g: 100, usda_ndb_no: "19300" },
  { food_name: "Baking powder", category: "Pantry Staples", calories_per_100g: 53, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 10600, serving_size_g: 100, usda_ndb_no: "18371" },
  { food_name: "Baking soda", category: "Pantry Staples", calories_per_100g: 0, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 27360, serving_size_g: 100, usda_ndb_no: "18372" },
  { food_name: "Cocoa powder, unsweetened", category: "Pantry Staples", calories_per_100g: 228, protein_per_100g: 19.6, fiber_per_100g: 33.2, sodium_per_100g: 21, serving_size_g: 100, usda_ndb_no: "19165" },
  { food_name: "Vanilla extract", category: "Pantry Staples", calories_per_100g: 288, protein_per_100g: 0.1, fiber_per_100g: 0, sodium_per_100g: 9, serving_size_g: 100, usda_ndb_no: "02050" },
  { food_name: "Cornstarch", category: "Pantry Staples", calories_per_100g: 381, protein_per_100g: 0.3, fiber_per_100g: 0.9, sodium_per_100g: 9, serving_size_g: 100, usda_ndb_no: "20027" },
  { food_name: "Breadcrumbs, dry", category: "Pantry Staples", calories_per_100g: 395, protein_per_100g: 13.4, fiber_per_100g: 4.5, sodium_per_100g: 732, serving_size_g: 100, usda_ndb_no: "18079" },
  { food_name: "Chicken, canned", category: "Pantry Staples", calories_per_100g: 165, protein_per_100g: 25.3, fiber_per_100g: 0, sodium_per_100g: 427, serving_size_g: 100, usda_ndb_no: "05030" },
  { food_name: "Spam, canned", category: "Pantry Staples", calories_per_100g: 293, protein_per_100g: 12.0, fiber_per_100g: 0, sodium_per_100g: 1369, serving_size_g: 100, usda_ndb_no: "07071" },
  { food_name: "Cream of mushroom soup, canned", category: "Pantry Staples", calories_per_100g: 51, protein_per_100g: 0.7, fiber_per_100g: 0.3, sodium_per_100g: 365, serving_size_g: 100, usda_ndb_no: "06016" },
  { food_name: "Ramen noodles, dry", category: "Pantry Staples", calories_per_100g: 436, protein_per_100g: 9.9, fiber_per_100g: 2.0, sodium_per_100g: 1503, serving_size_g: 100, usda_ndb_no: "20114" },
  { food_name: "Mac and cheese, boxed, dry mix", category: "Pantry Staples", calories_per_100g: 391, protein_per_100g: 14.0, fiber_per_100g: 1.6, sodium_per_100g: 1061, serving_size_g: 100, usda_ndb_no: "32105" },
  { food_name: "Taco shells, baked", category: "Pantry Staples", calories_per_100g: 464, protein_per_100g: 6.7, fiber_per_100g: 4.6, sodium_per_100g: 457, serving_size_g: 100, usda_ndb_no: "18360" },
  { food_name: "Peanut butter, crunchy", category: "Pantry Staples", calories_per_100g: 589, protein_per_100g: 24.1, fiber_per_100g: 7.1, sodium_per_100g: 476, serving_size_g: 100, usda_ndb_no: "16097" },

  // ── Spices & Seasonings ──
  { food_name: "Salt, table", category: "Spices & Seasonings", calories_per_100g: 0, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 38758, serving_size_g: 100, usda_ndb_no: "02047" },
  { food_name: "Black pepper, ground", category: "Spices & Seasonings", calories_per_100g: 251, protein_per_100g: 10.4, fiber_per_100g: 25.3, sodium_per_100g: 20, serving_size_g: 100, usda_ndb_no: "02030" },
  { food_name: "Chili powder", category: "Spices & Seasonings", calories_per_100g: 282, protein_per_100g: 12.3, fiber_per_100g: 34.8, sodium_per_100g: 1010, serving_size_g: 100, usda_ndb_no: "02009" },
  { food_name: "Cumin, ground", category: "Spices & Seasonings", calories_per_100g: 375, protein_per_100g: 17.8, fiber_per_100g: 10.5, sodium_per_100g: 168, serving_size_g: 100, usda_ndb_no: "02014" },
  { food_name: "Paprika", category: "Spices & Seasonings", calories_per_100g: 282, protein_per_100g: 14.1, fiber_per_100g: 34.9, sodium_per_100g: 68, serving_size_g: 100, usda_ndb_no: "02028" },
  { food_name: "Garlic powder", category: "Spices & Seasonings", calories_per_100g: 331, protein_per_100g: 16.6, fiber_per_100g: 9.0, sodium_per_100g: 60, serving_size_g: 100, usda_ndb_no: "02020" },
  { food_name: "Onion powder", category: "Spices & Seasonings", calories_per_100g: 341, protein_per_100g: 10.4, fiber_per_100g: 15.2, sodium_per_100g: 73, serving_size_g: 100, usda_ndb_no: "02026" },
  { food_name: "Cinnamon, ground", category: "Spices & Seasonings", calories_per_100g: 247, protein_per_100g: 4.0, fiber_per_100g: 53.1, sodium_per_100g: 10, serving_size_g: 100, usda_ndb_no: "02010" },
  { food_name: "Oregano, dried", category: "Spices & Seasonings", calories_per_100g: 265, protein_per_100g: 9.0, fiber_per_100g: 42.5, sodium_per_100g: 25, serving_size_g: 100, usda_ndb_no: "02027" },
  { food_name: "Italian seasoning", category: "Spices & Seasonings", calories_per_100g: 272, protein_per_100g: 9.1, fiber_per_100g: 40.0, sodium_per_100g: 30, serving_size_g: 100, usda_ndb_no: null },
  { food_name: "Taco seasoning mix", category: "Spices & Seasonings", calories_per_100g: 290, protein_per_100g: 8.0, fiber_per_100g: 10.0, sodium_per_100g: 5110, serving_size_g: 100, usda_ndb_no: null },

  // ── Frozen Prepared ──
  { food_name: "Frozen pizza, cheese", category: "Frozen", calories_per_100g: 240, protein_per_100g: 10.3, fiber_per_100g: 1.6, sodium_per_100g: 522, serving_size_g: 100, usda_ndb_no: "21299" },
  { food_name: "Fish sticks, frozen", category: "Frozen", calories_per_100g: 224, protein_per_100g: 11.5, fiber_per_100g: 0.6, sodium_per_100g: 505, serving_size_g: 100, usda_ndb_no: "15027" },
  { food_name: "Chicken nuggets, frozen", category: "Frozen", calories_per_100g: 259, protein_per_100g: 14.0, fiber_per_100g: 1.6, sodium_per_100g: 555, serving_size_g: 100, usda_ndb_no: "05346" },
  { food_name: "French fries, frozen", category: "Frozen", calories_per_100g: 150, protein_per_100g: 2.2, fiber_per_100g: 2.0, sodium_per_100g: 32, serving_size_g: 100, usda_ndb_no: "11402" },
  { food_name: "Frozen burritos, bean and cheese", category: "Frozen", calories_per_100g: 200, protein_per_100g: 7.3, fiber_per_100g: 2.5, sodium_per_100g: 480, serving_size_g: 100, usda_ndb_no: "22905" },
  { food_name: "Waffles, frozen", category: "Frozen", calories_per_100g: 260, protein_per_100g: 5.8, fiber_per_100g: 1.0, sodium_per_100g: 550, serving_size_g: 100, usda_ndb_no: "18366" },

  // ── Beverages ──
  { food_name: "Apple juice, from concentrate", category: "Beverages", calories_per_100g: 46, protein_per_100g: 0.1, fiber_per_100g: 0.2, sodium_per_100g: 4, serving_size_g: 100, usda_ndb_no: "09016" },
  { food_name: "Coffee, brewed", category: "Beverages", calories_per_100g: 1, protein_per_100g: 0.1, fiber_per_100g: 0, sodium_per_100g: 2, serving_size_g: 100, usda_ndb_no: "14209" },
  { food_name: "Tea, brewed, unsweetened", category: "Beverages", calories_per_100g: 1, protein_per_100g: 0, fiber_per_100g: 0, sodium_per_100g: 3, serving_size_g: 100, usda_ndb_no: "14355" },

  // ── Snacks ──
  { food_name: "Tortilla chips", category: "Snacks", calories_per_100g: 489, protein_per_100g: 7.0, fiber_per_100g: 4.4, sodium_per_100g: 618, serving_size_g: 100, usda_ndb_no: "19056" },
  { food_name: "Popcorn, air-popped", category: "Snacks", calories_per_100g: 387, protein_per_100g: 12.9, fiber_per_100g: 14.5, sodium_per_100g: 8, serving_size_g: 100, usda_ndb_no: "19034" },
  { food_name: "Pretzels, hard", category: "Snacks", calories_per_100g: 381, protein_per_100g: 9.1, fiber_per_100g: 2.8, sodium_per_100g: 1357, serving_size_g: 100, usda_ndb_no: "19047" },
  { food_name: "Graham crackers", category: "Snacks", calories_per_100g: 428, protein_per_100g: 6.5, fiber_per_100g: 2.4, sodium_per_100g: 623, serving_size_g: 100, usda_ndb_no: "18172" },

  // ── Baked Goods ──
  { food_name: "Pancake mix, dry", category: "Baked Goods", calories_per_100g: 350, protein_per_100g: 8.9, fiber_per_100g: 1.5, sodium_per_100g: 863, serving_size_g: 100, usda_ndb_no: "18292" },
  { food_name: "Biscuit mix, dry", category: "Baked Goods", calories_per_100g: 378, protein_per_100g: 7.4, fiber_per_100g: 1.5, sodium_per_100g: 1219, serving_size_g: 100, usda_ndb_no: "18010" },
  { food_name: "Cornbread mix, dry", category: "Baked Goods", calories_per_100g: 361, protein_per_100g: 7.2, fiber_per_100g: 3.5, sodium_per_100g: 781, serving_size_g: 100, usda_ndb_no: "18023" },

  // ── Miscellaneous ──
  { food_name: "Gelatin, unflavored", category: "Miscellaneous", calories_per_100g: 335, protein_per_100g: 85.6, fiber_per_100g: 0, sodium_per_100g: 196, serving_size_g: 100, usda_ndb_no: "19177" },
  { food_name: "Chocolate chips, semisweet", category: "Miscellaneous", calories_per_100g: 479, protein_per_100g: 4.9, fiber_per_100g: 7.0, sodium_per_100g: 24, serving_size_g: 100, usda_ndb_no: "19081" },
  { food_name: "Evaporated milk, canned", category: "Miscellaneous", calories_per_100g: 134, protein_per_100g: 6.8, fiber_per_100g: 0, sodium_per_100g: 106, serving_size_g: 100, usda_ndb_no: "01095" },
  { food_name: "Condensed milk, sweetened", category: "Miscellaneous", calories_per_100g: 321, protein_per_100g: 7.9, fiber_per_100g: 0, sodium_per_100g: 127, serving_size_g: 100, usda_ndb_no: "01097" },
  { food_name: "Coconut milk, canned", category: "Miscellaneous", calories_per_100g: 197, protein_per_100g: 2.0, fiber_per_100g: 0, sodium_per_100g: 13, serving_size_g: 100, usda_ndb_no: "12117" },
  { food_name: "Hot sauce", category: "Miscellaneous", calories_per_100g: 11, protein_per_100g: 0.5, fiber_per_100g: 0.5, sodium_per_100g: 2643, serving_size_g: 100, usda_ndb_no: "06168" },
  { food_name: "BBQ sauce", category: "Miscellaneous", calories_per_100g: 150, protein_per_100g: 0.8, fiber_per_100g: 0.7, sodium_per_100g: 991, serving_size_g: 100, usda_ndb_no: "06150" },
  { food_name: "Ranch dressing", category: "Miscellaneous", calories_per_100g: 418, protein_per_100g: 1.3, fiber_per_100g: 0.2, sodium_per_100g: 768, serving_size_g: 100, usda_ndb_no: "04639" },
  { food_name: "Italian dressing", category: "Miscellaneous", calories_per_100g: 178, protein_per_100g: 0.4, fiber_per_100g: 0.1, sodium_per_100g: 965, serving_size_g: 100, usda_ndb_no: "04114" },
];

// ─────────────────────────────────────────────
// Price estimate seed data — Saint Paul, MN area
// All prices are rough estimates per 100 g (USD).
// Sources: Walmart.com, Aldi typical shelf prices, Feb 2026.
// ─────────────────────────────────────────────

const SRC = "Walmart/Aldi Saint Paul MN 2026-02 (estimate)";
const ZIP = "55101";

export const PRICE_ESTIMATE_SEED_DATA: PriceSeedRow[] = [
  // ── Poultry ──
  { food_name: "Chicken breast, boneless, skinless, raw", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Chicken thigh, boneless, skinless, raw", price_per_100g: 0.40, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Chicken drumstick, raw", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Chicken wings, raw", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Ground turkey, raw", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Turkey breast, raw", price_per_100g: 0.66, unit: "g", source: SRC, zip_code: ZIP },

  // ── Beef & Pork ──
  { food_name: "Ground beef, 80% lean, raw", price_per_100g: 0.77, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Ground beef, 90% lean, raw", price_per_100g: 0.99, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Beef stew meat, raw", price_per_100g: 1.10, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Pork chop, bone-in, raw", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Pork tenderloin, raw", price_per_100g: 0.77, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Pork shoulder, raw", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Hot dogs, beef", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Bacon, raw", price_per_100g: 1.10, unit: "g", source: SRC, zip_code: ZIP },

  // ── Seafood ──
  { food_name: "Salmon, Atlantic, raw", price_per_100g: 1.76, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tuna, canned in water, drained", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Shrimp, raw", price_per_100g: 1.54, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tilapia, raw", price_per_100g: 1.10, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Catfish, raw", price_per_100g: 1.21, unit: "g", source: SRC, zip_code: ZIP },

  // ── Eggs & Dairy ──
  { food_name: "Eggs, whole, raw", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Milk, whole, 3.25%", price_per_100g: 0.10, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Milk, 2% reduced fat", price_per_100g: 0.10, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Milk, skim", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cheddar cheese", price_per_100g: 0.88, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Mozzarella cheese", price_per_100g: 0.77, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cream cheese", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Yogurt, plain, low fat", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Greek yogurt, plain, nonfat", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Butter, salted", price_per_100g: 0.88, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Sour cream", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cottage cheese, low fat", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },

  // ── Grains & Cereals ──
  { food_name: "White rice, long grain, raw", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Brown rice, long grain, raw", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Oats, rolled, dry", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Pasta, dry", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Bread, white", price_per_100g: 0.15, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Bread, whole wheat", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tortillas, flour", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tortillas, corn", price_per_100g: 0.18, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cornmeal, yellow", price_per_100g: 0.07, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "All-purpose flour", price_per_100g: 0.06, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Quinoa, raw", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Barley, pearled, raw", price_per_100g: 0.18, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Couscous, dry", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cereal, corn flakes", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Granola, oats and honey", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Crackers, saltines", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },

  // ── Legumes ──
  { food_name: "Black beans, canned, drained", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Pinto beans, canned, drained", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Kidney beans, canned, drained", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Chickpeas, canned, drained", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Lentils, dry", price_per_100g: 0.15, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Split peas, dry", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Navy beans, dry", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Lima beans, canned, drained", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Refried beans, canned", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Peanut butter, smooth", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tofu, firm", price_per_100g: 0.28, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Edamame, frozen", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },

  // ── Vegetables ──
  { food_name: "Broccoli, raw", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Carrots, raw", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Spinach, raw", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Spinach, frozen", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tomatoes, raw", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tomatoes, canned, diced", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tomato paste, canned", price_per_100g: 0.18, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Onions, raw", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Garlic, raw", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Bell peppers, green, raw", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Bell peppers, red, raw", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Potatoes, russet, raw", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Sweet potatoes, raw", price_per_100g: 0.18, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Corn, sweet, canned, drained", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Corn, sweet, frozen", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Green beans, canned, drained", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Green beans, frozen", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Peas, green, frozen", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cabbage, raw", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Lettuce, iceberg, raw", price_per_100g: 0.15, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Lettuce, romaine, raw", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Celery, raw", price_per_100g: 0.15, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cucumber, raw", price_per_100g: 0.18, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Zucchini, raw", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cauliflower, raw", price_per_100g: 0.28, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Mushrooms, white, raw", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Mixed vegetables, frozen", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Kale, raw", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Collard greens, frozen", price_per_100g: 0.18, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Squash, butternut, raw", price_per_100g: 0.18, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Jalapeño peppers, raw", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Avocado, raw", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Beets, canned, drained", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },

  // ── Fruits ──
  { food_name: "Bananas, raw", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Apples, raw, with skin", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Oranges, raw", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Grapes, red, raw", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Strawberries, raw", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Blueberries, raw", price_per_100g: 0.66, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Blueberries, frozen", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Watermelon, raw", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Peaches, canned in juice", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Pears, raw", price_per_100g: 0.28, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Pineapple, canned in juice", price_per_100g: 0.15, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Mango, raw", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Raisins", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Applesauce, unsweetened", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Fruit cocktail, canned in juice", price_per_100g: 0.13, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Lemon juice, raw", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Lime juice, raw", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Orange juice, from concentrate", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },

  // ── Nuts & Seeds ──
  { food_name: "Almonds, raw", price_per_100g: 1.10, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Walnuts, raw", price_per_100g: 1.32, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Sunflower seeds, raw", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Peanuts, dry roasted", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Chia seeds", price_per_100g: 0.88, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Flaxseed, ground", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },

  // ── Oils & Fats ──
  { food_name: "Olive oil", price_per_100g: 0.66, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Vegetable oil, canola", price_per_100g: 0.18, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Margarine, regular", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Mayonnaise", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },

  // ── Pantry Staples ──
  { food_name: "Chicken broth, canned", price_per_100g: 0.06, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Vegetable broth", price_per_100g: 0.07, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tomato sauce, canned", price_per_100g: 0.07, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Salsa, ready to serve", price_per_100g: 0.15, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Soy sauce", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Ketchup", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Mustard, yellow", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Vinegar, distilled", price_per_100g: 0.04, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Sugar, granulated", price_per_100g: 0.07, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Brown sugar", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Honey", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Maple syrup", price_per_100g: 0.88, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Jam, strawberry", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Baking powder", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Baking soda", price_per_100g: 0.07, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cocoa powder, unsweetened", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Vanilla extract", price_per_100g: 3.30, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cornstarch", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Breadcrumbs, dry", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Chicken, canned", price_per_100g: 0.66, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Spam, canned", price_per_100g: 0.77, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cream of mushroom soup, canned", price_per_100g: 0.09, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Ramen noodles, dry", price_per_100g: 0.07, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Mac and cheese, boxed, dry mix", price_per_100g: 0.15, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Taco shells, baked", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Peanut butter, crunchy", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },

  // ── Spices & Seasonings ──
  { food_name: "Salt, table", price_per_100g: 0.04, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Black pepper, ground", price_per_100g: 1.10, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Chili powder", price_per_100g: 0.88, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cumin, ground", price_per_100g: 1.10, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Paprika", price_per_100g: 0.88, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Garlic powder", price_per_100g: 0.77, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Onion powder", price_per_100g: 0.77, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cinnamon, ground", price_per_100g: 0.88, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Oregano, dried", price_per_100g: 1.32, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Italian seasoning", price_per_100g: 1.10, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Taco seasoning mix", price_per_100g: 0.88, unit: "g", source: SRC, zip_code: ZIP },

  // ── Frozen ──
  { food_name: "Frozen pizza, cheese", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Fish sticks, frozen", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Chicken nuggets, frozen", price_per_100g: 0.44, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "French fries, frozen", price_per_100g: 0.15, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Frozen burritos, bean and cheese", price_per_100g: 0.28, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Waffles, frozen", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },

  // ── Beverages ──
  { food_name: "Apple juice, from concentrate", price_per_100g: 0.06, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Coffee, brewed", price_per_100g: 0.04, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Tea, brewed, unsweetened", price_per_100g: 0.02, unit: "g", source: SRC, zip_code: ZIP },

  // ── Snacks ──
  { food_name: "Tortilla chips", price_per_100g: 0.33, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Popcorn, air-popped", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Pretzels, hard", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Graham crackers", price_per_100g: 0.28, unit: "g", source: SRC, zip_code: ZIP },

  // ── Baked Goods ──
  { food_name: "Pancake mix, dry", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Biscuit mix, dry", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Cornbread mix, dry", price_per_100g: 0.11, unit: "g", source: SRC, zip_code: ZIP },

  // ── Miscellaneous ──
  { food_name: "Gelatin, unflavored", price_per_100g: 2.20, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Chocolate chips, semisweet", price_per_100g: 0.55, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Evaporated milk, canned", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Condensed milk, sweetened", price_per_100g: 0.28, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Coconut milk, canned", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Hot sauce", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "BBQ sauce", price_per_100g: 0.15, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Ranch dressing", price_per_100g: 0.28, unit: "g", source: SRC, zip_code: ZIP },
  { food_name: "Italian dressing", price_per_100g: 0.22, unit: "g", source: SRC, zip_code: ZIP },
];
