import { Ingredient } from '../types';
import { convertToGrams } from '../utils/densityTable';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TacoEntry {
  id: number;
  name: string;
  aliases: string[];
  per100g: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

export interface NutritionInfo {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** How many ingredients were matched in the TACO table */
  coveredCount: number;
  /** Total number of ingredients in the recipe */
  totalCount: number;
}

// ── Data loading ──────────────────────────────────────────────────────────────

let _cache: TacoEntry[] | null = null;

export function loadTacoData(): TacoEntry[] {
  if (_cache) return _cache;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _cache = require('../assets/data/taco.json') as TacoEntry[];
  return _cache;
}

// ── String normalization ──────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[,.()\[\]]/g, '')       // strip punctuation
    .replace(/\s+/g, ' ');
}

// ── Ingredient lookup ─────────────────────────────────────────────────────────

/**
 * Finds the best TACO entry for a given ingredient name.
 * Search order:
 *   1. Exact match on normalized entry name
 *   2. Exact match in aliases
 *   3. Substring match (query ⊆ name or name ⊆ query)
 */
export function findIngredient(name: string): TacoEntry | null {
  const taco = loadTacoData();
  const query = normalize(name);

  // 1. Exact match on normalized name
  for (const entry of taco) {
    if (normalize(entry.name) === query) return entry;
  }

  // 2. Exact match in aliases
  for (const entry of taco) {
    for (const alias of entry.aliases) {
      if (normalize(alias) === query) return entry;
    }
  }

  // 3. Substring match — query is contained in entry name/alias or vice-versa
  for (const entry of taco) {
    const entryNorm = normalize(entry.name);
    if (entryNorm.includes(query) || query.includes(entryNorm)) return entry;
    for (const alias of entry.aliases) {
      const aliasNorm = normalize(alias);
      if (aliasNorm.includes(query) || query.includes(aliasNorm)) return entry;
    }
  }

  return null;
}

// ── Nutrition calculation ─────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculates the nutritional information per serving for a recipe.
 *
 * @param ingredients - The (possibly adjusted) ingredient list
 * @param servings    - Number of servings to divide the total by
 */
export function calculateRecipeNutrition(
  ingredients: Ingredient[],
  servings: number
): NutritionInfo {
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let coveredCount = 0;

  const divisor = servings > 0 ? servings : 1;

  for (const ing of ingredients) {
    const entry = findIngredient(ing.name);
    if (!entry) continue;

    const grams = convertToGrams(ing.quantity ?? 0, ing.unit ?? 'g', ing.name);
    const factor = grams / 100;

    totalKcal    += entry.per100g.kcal    * factor;
    totalProtein += entry.per100g.protein * factor;
    totalCarbs   += entry.per100g.carbs   * factor;
    totalFat     += entry.per100g.fat     * factor;
    totalFiber   += entry.per100g.fiber   * factor;
    coveredCount++;
  }

  return {
    kcal:         round2(totalKcal    / divisor),
    protein:      round2(totalProtein / divisor),
    carbs:        round2(totalCarbs   / divisor),
    fat:          round2(totalFat     / divisor),
    fiber:        round2(totalFiber   / divisor),
    coveredCount,
    totalCount:   ingredients.length,
  };
}
