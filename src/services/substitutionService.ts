import substitutionsData from '../assets/data/substitutions.json';
import { Ingredient } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubstituteOption {
  name: string;
  ratio: string;
  notes: string;
}

export interface SubstitutionEntry {
  id: string;
  original: string;
  aliases: string[];
  substitutes: SubstituteOption[];
  tags: string[];
}

// ── Singleton cache ───────────────────────────────────────────────────────────

let _cache: SubstitutionEntry[] | null = null;

export function loadSubstitutions(): SubstitutionEntry[] {
  if (!_cache) {
    _cache = substitutionsData as SubstitutionEntry[];
  }
  return _cache;
}

// ── Normalisation ─────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ── Lookup ────────────────────────────────────────────────────────────────────

/**
 * Finds a substitution entry for a given ingredient name.
 * Matches against the entry's original name and all aliases.
 * Also does partial/substring matching so "alho picado" finds "alho".
 */
export function findSubstitutions(ingredientName: string): SubstitutionEntry | null {
  const entries = loadSubstitutions();
  const normInput = normalize(ingredientName);

  // 1. Exact match on original
  let found = entries.find(e => normalize(e.original) === normInput);
  if (found) return found;

  // 2. Exact match on any alias
  found = entries.find(e => e.aliases.some(a => normalize(a) === normInput));
  if (found) return found;

  // 3. Partial match: ingredient name contains the original (e.g. "alho picado" ⊃ "alho")
  found = entries.find(e => normInput.includes(normalize(e.original)));
  if (found) return found;

  // 4. Partial match on any alias
  found = entries.find(e => e.aliases.some(a => normInput.includes(normalize(a))));
  if (found) return found;

  return null;
}

/**
 * Returns a Map of ingredientName → SubstitutionEntry for all recipe
 * ingredients that have at least one substitution available.
 */
export function getSubstitutionsForRecipe(
  ingredients: Ingredient[],
): Map<string, SubstitutionEntry> {
  const map = new Map<string, SubstitutionEntry>();
  for (const ing of ingredients) {
    const entry = findSubstitutions(ing.name);
    if (entry) {
      map.set(ing.name, entry);
    }
  }
  return map;
}

/**
 * Returns all unique tags present in the substitutions database.
 */
export function getAllTags(): string[] {
  const entries = loadSubstitutions();
  const tagSet = new Set<string>();
  for (const e of entries) {
    for (const t of e.tags) tagSet.add(t);
  }
  return Array.from(tagSet).sort();
}
