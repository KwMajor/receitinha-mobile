import { getDatabase } from './database';
import { ShoppingList, ShoppingItem } from '../../types';
import { categorizeIngredient } from '../../utils/ingredientCategorizer';

const genId = () =>
  Date.now().toString() + Math.random().toString(36).substring(2, 9);

// ── List management ──────────────────────────────────────────────────────────

export async function createList(userId: string, name: string): Promise<string> {
  const db = await getDatabase();
  const id = genId();
  await db.runAsync(
    'INSERT INTO shopping_lists (id, user_id, name, is_active, created_at) VALUES (?, ?, ?, 0, ?)',
    [id, userId, name, Date.now()]
  );
  return id;
}

export async function getLists(userId: string): Promise<ShoppingList[]> {
  const db = await getDatabase();

  const lists = await db.getAllAsync<{
    id: string; user_id: string; name: string;
    is_active: number; created_at: number;
  }>(
    'SELECT * FROM shopping_lists WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  return Promise.all(
    lists.map(async (l) => {
      const [{ total }] = await db.getAllAsync<{ total: number }>(
        'SELECT COUNT(*) as total FROM shopping_items WHERE list_id = ?', [l.id]
      );
      const [{ pending }] = await db.getAllAsync<{ pending: number }>(
        'SELECT COUNT(*) as pending FROM shopping_items WHERE list_id = ? AND is_checked = 0', [l.id]
      );
      return {
        id: l.id,
        userId: l.user_id,
        name: l.name,
        isActive: l.is_active === 1,
        createdAt: new Date(l.created_at),
        itemCount: total,
        pendingCount: pending,
      };
    })
  );
}

export async function getListById(id: string): Promise<ShoppingList | null> {
  const db = await getDatabase();
  const l = await db.getFirstAsync<{
    id: string; user_id: string; name: string;
    is_active: number; created_at: number;
  }>('SELECT * FROM shopping_lists WHERE id = ?', [id]);

  if (!l) return null;

  const [{ total }] = await db.getAllAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM shopping_items WHERE list_id = ?', [id]
  );
  const [{ pending }] = await db.getAllAsync<{ pending: number }>(
    'SELECT COUNT(*) as pending FROM shopping_items WHERE list_id = ? AND is_checked = 0', [id]
  );

  return {
    id: l.id,
    userId: l.user_id,
    name: l.name,
    isActive: l.is_active === 1,
    createdAt: new Date(l.created_at),
    itemCount: total,
    pendingCount: pending,
  };
}

export async function renameList(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE shopping_lists SET name = ? WHERE id = ?', [name, id]);
}

export async function duplicateList(id: string, newName: string): Promise<string> {
  const db = await getDatabase();

  const original = await db.getFirstAsync<{ user_id: string }>(
    'SELECT user_id FROM shopping_lists WHERE id = ?', [id]
  );
  if (!original) throw new Error('List not found');

  const newId = genId();
  await db.runAsync(
    'INSERT INTO shopping_lists (id, user_id, name, is_active, created_at) VALUES (?, ?, ?, 0, ?)',
    [newId, original.user_id, newName, Date.now()]
  );

  const items = await db.getAllAsync<{
    name: string; quantity: number | null; unit: string | null;
    category: string; is_checked: number;
  }>('SELECT name, quantity, unit, category, is_checked FROM shopping_items WHERE list_id = ?', [id]);

  for (const item of items) {
    const itemId = genId();
    await db.runAsync(
      'INSERT INTO shopping_items (id, list_id, name, quantity, unit, category, is_checked, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [itemId, newId, item.name, item.quantity, item.unit, item.category, item.is_checked, Date.now()]
    );
  }

  return newId;
}

export async function deleteList(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shopping_items WHERE list_id = ?', [id]);
  await db.runAsync('DELETE FROM shopping_lists WHERE id = ?', [id]);
}

export async function setActiveList(userId: string, listId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE shopping_lists SET is_active = 0 WHERE user_id = ?', [userId]);
  await db.runAsync('UPDATE shopping_lists SET is_active = 1 WHERE id = ?', [listId]);
}

export async function getActiveListId(userId: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM shopping_lists WHERE user_id = ? AND is_active = 1 LIMIT 1', [userId]
  );
  return row?.id ?? null;
}

// ── Item management ──────────────────────────────────────────────────────────

export async function addItem(
  listId: string,
  name: string,
  quantity?: number,
  unit?: string,
  category?: string
): Promise<string> {
  const db = await getDatabase();
  const id = genId();
  const cat = category ?? categorizeIngredient(name);
  await db.runAsync(
    'INSERT INTO shopping_items (id, list_id, name, quantity, unit, category, is_checked, added_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
    [id, listId, name.trim(), quantity ?? null, unit ?? null, cat, Date.now()]
  );
  return id;
}

export async function toggleItem(itemId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE shopping_items SET is_checked = CASE WHEN is_checked = 1 THEN 0 ELSE 1 END WHERE id = ?',
    [itemId]
  );
}

export async function removeItem(itemId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shopping_items WHERE id = ?', [itemId]);
}

export async function clearChecked(listId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shopping_items WHERE list_id = ? AND is_checked = 1', [listId]);
}

export async function getItems(listId: string): Promise<ShoppingItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string; list_id: string; name: string;
    quantity: number | null; unit: string | null;
    category: string; is_checked: number; added_at: number;
  }>(
    'SELECT * FROM shopping_items WHERE list_id = ? ORDER BY category ASC, name ASC',
    [listId]
  );
  return rows.map((r) => ({
    id: r.id,
    listId: r.list_id,
    name: r.name,
    quantity: r.quantity ?? undefined,
    unit: r.unit ?? undefined,
    category: r.category,
    isChecked: r.is_checked === 1,
    addedAt: new Date(r.added_at),
  }));
}

// ── Auto-generation from week plan ──────────────────────────────────────────

interface IngredientRow {
  name: string;
  quantity: number;
  unit: string;
}

interface AggregatedItem {
  name: string;
  quantities: Map<string, number>; // unit → total quantity
}

export async function generateFromWeekPlan(
  userId: string,
  weekStart: string
): Promise<string> {
  const db = await getDatabase();

  // 1. Get all recipe IDs in the week plan (deduplicated)
  const planRows = await db.getAllAsync<{ recipe_id: string }>(
    'SELECT DISTINCT recipe_id FROM week_plan WHERE user_id = ? AND week_start = ?',
    [userId, weekStart]
  );

  if (planRows.length === 0) {
    // Create empty list even if week has no meals
    const [day, month] = weekStart.slice(5).split('-');
    return createList(userId, `Semana ${day}/${month}`);
  }

  // 2. Fetch all ingredients for those recipes in one query
  const recipeIds = planRows.map((r) => r.recipe_id);
  const placeholders = recipeIds.map(() => '?').join(',');
  const ingredients = await db.getAllAsync<IngredientRow>(
    `SELECT name, quantity, unit FROM ingredients WHERE recipe_id IN (${placeholders})`,
    recipeIds
  );

  // 3. Aggregate: group by normalizedName_unit, sum quantities
  const aggregated = new Map<string, AggregatedItem>();

  for (const ing of ingredients) {
    const normalizedName = ing.name.trim().toLowerCase();
    const normalizedUnit = (ing.unit ?? '').trim().toLowerCase();

    if (!aggregated.has(normalizedName)) {
      aggregated.set(normalizedName, {
        name: ing.name.trim(), // preserve original casing from first occurrence
        quantities: new Map(),
      });
    }

    const entry = aggregated.get(normalizedName)!;
    const currentQty = entry.quantities.get(normalizedUnit) ?? 0;
    entry.quantities.set(normalizedUnit, currentQty + (ing.quantity ?? 0));
  }

  // 4. Create the list
  const [day, month] = weekStart.slice(5).split('-');
  const listId = await createList(userId, `Semana ${day}/${month}`);

  // 5. Insert aggregated items (one row per name+unit combination)
  for (const [, item] of aggregated) {
    const category = categorizeIngredient(item.name);

    for (const [unit, quantity] of item.quantities) {
      const itemId = genId();
      await db.runAsync(
        'INSERT INTO shopping_items (id, list_id, name, quantity, unit, category, is_checked, added_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
        [itemId, listId, item.name, quantity > 0 ? quantity : null, unit || null, category, Date.now()]
      );
    }
  }

  return listId;
}
