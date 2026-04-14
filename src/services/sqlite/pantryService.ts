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

/**
 * Removes pantry items that match the given recipe ingredient names.
 * Uses substring matching (same logic as suggestionService) so "Alho"
 * matches recipe ingredients like "Alho picado" or "Dentes de alho".
 * Returns the number of items removed.
 */
export async function deductRecipeIngredients(
  userId: string,
  ingredients: { name: string }[],
): Promise<number> {
  const pantryItems = await getItems(userId);
  if (pantryItems.length === 0 || ingredients.length === 0) return 0;

  const normalizedPantry = pantryItems.map(p => ({
    item: p,
    norm: normalizeForMatch(p.ingredientName),
  }));

  let removed = 0;
  const alreadyRemoved = new Set<string>();

  for (const ing of ingredients) {
    const normIng = normalizeForMatch(ing.name);
    const matched = normalizedPantry.find(
      p =>
        !alreadyRemoved.has(p.item.ingredientName) &&
        p.norm.length > 0 &&
        (normIng.includes(p.norm) || p.norm.includes(normIng)),
    );
    if (matched) {
      await removeItem(userId, matched.item.ingredientName);
      alreadyRemoved.add(matched.item.ingredientName);
      removed++;
    }
  }

  return removed;
}
