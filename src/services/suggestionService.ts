import { Recipe } from '../types';
import { getRecipes, getRecipeById } from './sqlite/recipeService';
import { getItems, PantryItem } from './sqlite/pantryService';

export interface MatchResult {
  recipe: Recipe;
  score: number;           // 0–1: matched / total
  matchCount: number;
  totalCount: number;
  missingIngredients: string[];
}

// ── Normalisation ─────────────────────────────────────────────────────────────

const ACCENT_MAP: [RegExp, string][] = [
  [/[àáâãä]/g, 'a'],
  [/[èéêë]/g,  'e'],
  [/[ìíîï]/g,  'i'],
  [/[òóôõö]/g, 'o'],
  [/[ùúûü]/g,  'u'],
  [/[ç]/g,     'c'],
  [/[ñ]/g,     'n'],
];

export function normalizeIngredientName(name: string): string {
  let n = name.toLowerCase().trim();
  for (const [re, rep] of ACCENT_MAP) n = n.replace(re, rep);
  // remove simple plural suffixes (es, s) — Portuguese heuristic
  n = n.replace(/oes$/, 'ao').replace(/eis$/, 'el').replace(/es$/, '').replace(/s$/, '');
  return n.trim();
}

// ── Score calculation ─────────────────────────────────────────────────────────

export function calculateMatchScore(
  recipe: Recipe,
  pantryItems: PantryItem[],
): MatchResult {
  const normalizedPantry = pantryItems.map(p => normalizeIngredientName(p.ingredientName));

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const totalCount = ingredients.length;
  const missingIngredients: string[] = [];
  let matchCount = 0;

  for (const ing of ingredients) {
    const normalizedIng = normalizeIngredientName(ing.name);
    // Match if any pantry item name is a substring of the ingredient name, or vice versa
    const matched = normalizedPantry.some(
      p => p.length > 0 && (normalizedIng.includes(p) || p.includes(normalizedIng)),
    );
    if (matched) {
      matchCount++;
    } else {
      missingIngredients.push(ing.name);
    }
  }

  const score = totalCount > 0 ? matchCount / totalCount : 0;

  return { recipe, score, matchCount, totalCount, missingIngredients };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MIN_SCORE = 0.5;
const TOP_N    = 20;

export async function getSuggestions(userId: string): Promise<MatchResult[]> {
  const [recipesRaw, pantryItems] = await Promise.all([
    getRecipes(userId),
    getItems(userId),
  ]);
  const recipeList = Array.isArray(recipesRaw) ? recipesRaw : [];

  if (pantryItems.length === 0) return [];

  // The list endpoint may not include ingredients — fetch full details for each recipe
  const fullRecipes = await Promise.all(
    recipeList.map(r =>
      Array.isArray(r.ingredients) && r.ingredients.length > 0
        ? Promise.resolve(r)
        : getRecipeById(r.id).then(full => full ?? r),
    ),
  );

  return fullRecipes
    .map(r => calculateMatchScore(r, pantryItems))
    .filter(m => m.score >= MIN_SCORE && m.totalCount > 0)
    .sort((a, b) => b.score - a.score || b.matchCount - a.matchCount)
    .slice(0, TOP_N);
}
