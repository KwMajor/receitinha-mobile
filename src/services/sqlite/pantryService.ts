import { getDatabase } from './database';
import { getItems as getShoppingItems } from './shoppingService';

export interface PantryItem {
  id: string;
  userId: string;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  addedAt: number;
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export async function addItem(
  userId: string,
  name: string,
  quantity?: number,
  unit?: string,
): Promise<void> {
  const db = await getDatabase();
  const normalized = normalizeName(name);
  // INSERT OR REPLACE preserving the original id when the row already exists
  await db.runAsync(
    `INSERT INTO pantry (id, user_id, ingredient_name, quantity, unit, added_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, ingredient_name)
     DO UPDATE SET quantity = excluded.quantity, unit = excluded.unit, added_at = excluded.added_at`,
    [userId, normalized, quantity ?? null, unit ?? null, Date.now()],
  );
}

export async function removeItem(userId: string, ingredientName: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM pantry WHERE user_id = ? AND ingredient_name = ?',
    [userId, ingredientName],
  );
}

export async function getItems(userId: string): Promise<PantryItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM pantry WHERE user_id = ? ORDER BY ingredient_name ASC',
    [userId],
  );
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    ingredientName: r.ingredient_name,
    quantity: r.quantity ?? undefined,
    unit: r.unit ?? undefined,
    addedAt: r.added_at,
  }));
}

export async function importFromShoppingList(userId: string, listId: string): Promise<number> {
  const shoppingItems = await getShoppingItems(listId);
  const checked = shoppingItems.filter(i => i.isChecked);
  for (const item of checked) {
    await addItem(userId, item.name, item.quantity ?? undefined, item.unit ?? undefined);
  }
  return checked.length;
}

export async function clearPantry(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM pantry WHERE user_id = ?', [userId]);
}

// ── Ingredient matching helper ─────────────────────────────────────────────────

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents
}

async function updateQuantity(userId: string, ingredientName: string, newQty: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE pantry SET quantity = ? WHERE user_id = ? AND ingredient_name = ?',
    [newQty, userId, ingredientName],
  );
}

// Maps unit strings (including full words) to a canonical short form
const UNIT_CANON: Record<string, string> = {
  un: 'un', und: 'un', unidade: 'un', unidades: 'un',
  l: 'l', litro: 'l', litros: 'l',
  ml: 'ml', mililitro: 'ml', mililitros: 'ml',
  kg: 'kg', quilograma: 'kg', quilogramas: 'kg', quilo: 'kg', quilos: 'kg',
  g: 'g', grama: 'g', gramas: 'g',
  cx: 'cx', caixa: 'cx', caixas: 'cx',
  pct: 'pct', pacote: 'pct', pacotes: 'pct',
  dz: 'dz', duzia: 'dz', dúzia: 'dz',
  xic: 'xic', xicara: 'xic', xícaras: 'xic', xicaras: 'xic',
  col: 'col', colher: 'col', colheres: 'col',
  pit: 'pit', pitada: 'pit', pitadas: 'pit',
};

function canonicalUnit(unit?: string): string {
  if (!unit) return '';
  const key = unit.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return UNIT_CANON[key] ?? key;
}

/**
 * Deducts recipe ingredients from the pantry:
 * - Both have quantity + compatible units → subtract; remove only if remainder ≤ 0
 * - Both have quantity but incompatible units → skip (can't convert, don't touch)
 * - Either is missing quantity → remove the pantry entry (item was used up)
 *
 * Uses substring matching so "Alho" matches "Alho picado", etc.
 * Returns the number of pantry items affected.
 */
export async function deductRecipeIngredients(
  userId: string,
  ingredients: { name: string; quantity?: number; unit?: string }[],
): Promise<number> {
  const pantryItems = await getItems(userId);
  if (pantryItems.length === 0 || ingredients.length === 0) return 0;

  const normalizedPantry = pantryItems.map(p => ({
    item: p,
    norm: normalizeForMatch(p.ingredientName),
  }));

  let affected = 0;
  const alreadyProcessed = new Set<string>();

  for (const ing of ingredients) {
    const normIng = normalizeForMatch(ing.name);
    if (!normIng) continue;

    const matched = normalizedPantry.find(
      p =>
        !alreadyProcessed.has(p.item.ingredientName) &&
        p.norm.length > 0 &&
        (normIng.includes(p.norm) || p.norm.includes(normIng)),
    );
    if (!matched) continue;

    alreadyProcessed.add(matched.item.ingredientName);

    const pantryQty  = matched.item.quantity;
    const usedQty    = ing.quantity;
    const pantryUnit = canonicalUnit(matched.item.unit);
    const recipeUnit = canonicalUnit(ing.unit);
    const sameUnit   = pantryUnit === recipeUnit;

    if (pantryQty != null && usedQty != null) {
      if (!sameUnit) {
        // Incompatible units — leave the pantry item untouched
        continue;
      }
      const remaining = pantryQty - usedQty;
      affected++;
      if (remaining > 0) {
        await updateQuantity(userId, matched.item.ingredientName, remaining);
      } else {
        await removeItem(userId, matched.item.ingredientName);
      }
    } else {
      // No quantity info on one or both sides — remove the entry
      affected++;
      await removeItem(userId, matched.item.ingredientName);
    }
  }

  return affected;
}
