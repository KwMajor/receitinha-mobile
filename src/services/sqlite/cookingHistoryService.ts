import { getDatabase } from './database';
import { HistoryEntry, Recipe } from '../../types';
import { getRecipeById } from './recipeService';

export const addToHistory = async (userId: string, recipeId: string, notes?: string): Promise<void> => {
  const db = await getDatabase();
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  const cookedAt = Date.now();
  
  await db.runAsync(
    'INSERT INTO cooking_history (id, user_id, recipe_id, cooked_at, notes) VALUES (?, ?, ?, ?, ?)',
    [id, userId, recipeId, cookedAt, notes || null]
  );
};

export const getHistory = async (userId: string, limit: number = 20): Promise<HistoryEntry[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM cooking_history WHERE user_id = ? ORDER BY cooked_at DESC LIMIT ?',
    [userId, limit]
  ) as any[];

  const history: HistoryEntry[] = [];
  
  for (const row of rows) {
    let recipe: Recipe | undefined;
    try {
      recipe = await getRecipeById(row.recipe_id);
    } catch (e) {
      // Recipe might have been deleted, ignore or handle
    }

    history.push({
      id: row.id,
      userId: row.user_id,
      recipeId: row.recipe_id,
      cookedAt: new Date(row.cooked_at),
      notes: row.notes,
      recipe
    } as HistoryEntry);
  }

  return history;
};

export const deleteFromHistory = async (id: string, userId?: string): Promise<void> => {
  const db = await getDatabase();
  if (userId) {
    const owner = await db.getFirstAsync('SELECT 1 FROM cooking_history WHERE id = ? AND user_id = ?', [id, userId]);
    if (!owner) throw new Error('Acesso negado: entrada não pertence ao usuário.');
  }
  await db.runAsync('DELETE FROM cooking_history WHERE id = ?', [id]);
};

