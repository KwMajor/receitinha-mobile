import { getDatabase } from './database';
import { HistoryEntry, Recipe } from '../../types';

export interface GroupedHistory {
  title: string;
  data: HistoryEntry[];
}

export const addToHistory = async (userId: string, recipeId: string, notes?: string): Promise<void> => {
  const db = await getDatabase();
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  await db.runAsync(
    'INSERT INTO cooking_history (id, user_id, recipe_id, cooked_at, notes) VALUES (?, ?, ?, ?, ?)',
    [id, userId, recipeId, Date.now(), notes || null]
  );
};

export const getHistory = async (userId: string, limit = 100, offset = 0): Promise<HistoryEntry[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT ch.id, ch.user_id, ch.recipe_id, ch.cooked_at, ch.notes,
            r.title, r.photo_url, r.category
     FROM cooking_history ch
     LEFT JOIN recipes r ON r.id = ch.recipe_id
     WHERE ch.user_id = ?
     ORDER BY ch.cooked_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    recipeId: row.recipe_id,
    cookedAt: new Date(row.cooked_at),
    notes: row.notes ?? undefined,
    recipe: row.title
      ? ({ id: row.recipe_id, title: row.title, photoUrl: row.photo_url ?? undefined, category: row.category ?? '' } as unknown as Recipe)
      : undefined,
  }));
};

export const getHistoryGrouped = async (userId: string): Promise<GroupedHistory[]> => {
  const entries = await getHistory(userId);
  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString();

  const map = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const ds = new Date(entry.cookedAt).toDateString();
    let label: string;
    if (ds === todayStr) label = 'Hoje';
    else if (ds === yesterdayStr) label = 'Ontem';
    else label = new Date(entry.cookedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(entry);
  }

  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
};

export const deleteHistoryEntry = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM cooking_history WHERE id = ?', [id]);
};

/** @deprecated use deleteHistoryEntry */
export const deleteFromHistory = deleteHistoryEntry;

export const getRecipeStats = async (
  userId: string,
  recipeId: string
): Promise<{ timesCooked: number; lastCooked: string | null }> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT COUNT(*) as count, MAX(cooked_at) as last FROM cooking_history WHERE user_id = ? AND recipe_id = ?',
    [userId, recipeId]
  );
  return {
    timesCooked: row?.count ?? 0,
    lastCooked: row?.last ? new Date(row.last).toISOString() : null,
  };
};

export const countHistory = async (userId: string): Promise<number> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT COUNT(*) as count FROM cooking_history WHERE user_id = ?',
    [userId]
  );
  return row?.count ?? 0;
};
