import { getDatabase } from './database';
import { Recipe, Ingredient, Step } from '../../types';

export interface CreateRecipeInput {
  title: string;
  description: string;
  prepTime: number;
  servings: number;
  category: string;
  photoUrl?: string;
  isPublic?: boolean;
  ingredients: { name: string; quantity: number; unit: string }[];
  steps: { instruction: string; timerMinutes?: number }[];
}

export const createRecipe = async (userId: string, data: CreateRecipeInput): Promise<string> => {
  const db = await getDatabase();
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  const now = Date.now();

  try {
    await db.execAsync('BEGIN TRANSACTION;');
    
    await db.runAsync(
      `INSERT INTO recipes (id, user_id, title, description, prep_time, servings, category, photo_url, is_public, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, data.title, data.description, data.prepTime, data.servings, data.category, data.photoUrl || null, data.isPublic ? 1 : 0, now, now]
    );

    for (let i = 0; i < data.ingredients.length; i++) {
      const ing = data.ingredients[i];
      const ingId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      await db.runAsync(
        `INSERT INTO ingredients (id, recipe_id, quantity, unit, name, "order") VALUES (?, ?, ?, ?, ?, ?)`,
        [ingId, id, ing.quantity, ing.unit, ing.name, i]
      );
    }

    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];
      const stepId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      await db.runAsync(
        `INSERT INTO steps (id, recipe_id, instruction, timer_minutes, "order") VALUES (?, ?, ?, ?, ?)`,
        [stepId, id, step.instruction, step.timerMinutes || null, i]
      );
    }

    await db.execAsync('COMMIT;');
    return id;
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
};

export interface RecipeFilters {
  query?: string;
  categories?: string[];
  maxPrepTime?: number;
}

export const getRecipes = async (userId: string, filters?: RecipeFilters): Promise<Recipe[]> => {
  const db = await getDatabase();
  
  let qStr = 'SELECT DISTINCT r.* FROM recipes r ';
  const params: any[] = [userId];
  const conditions = ['r.user_id = ?'];

  if (filters?.query) {
    qStr += 'LEFT JOIN ingredients i ON i.recipe_id = r.id ';
    conditions.push(`(r.title LIKE ? OR i.name LIKE ?)`);
    params.push(`%${filters.query}%`, `%${filters.query}%`);
  }

  if (filters?.categories && filters.categories.length > 0) {
    const placeholders = filters.categories.map(() => '?').join(',');
    conditions.push(`r.category IN (${placeholders})`);
    params.push(...filters.categories);
  }

  if (filters?.maxPrepTime && filters.maxPrepTime > 0 && filters.maxPrepTime < 120) {
    conditions.push('r.prep_time <= ?');
    params.push(filters.maxPrepTime);
  }

  qStr += `WHERE ${conditions.join(' AND ')} ORDER BY r.created_at DESC`;

  const result = await db.getAllAsync(qStr, params);
  return (result as any[]).map(r => ({
    ...r,
    photoUrl: r.photo_url,
    prepTime: r.prep_time,
    userId: r.user_id,
    createdAt: new Date(r.created_at),
  })) as any;
};

export const getRecipeById = async (id: string, userId?: string): Promise<Recipe | null> => {
  const db = await getDatabase();
  const recipe = userId
    ? await db.getFirstAsync('SELECT * FROM recipes WHERE id = ? AND user_id = ?', [id, userId])
    : await db.getFirstAsync('SELECT * FROM recipes WHERE id = ?', [id]);
  if (!recipe) return null;

  const ingredients = await db.getAllAsync('SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY "order" ASC', [id]);
  const steps = await db.getAllAsync('SELECT * FROM steps WHERE recipe_id = ? ORDER BY "order" ASC', [id]);

  const r = recipe as any;
  return {
    ...r,
    photoUrl: r.photo_url,
    prepTime: r.prep_time,
    userId: r.user_id,
    createdAt: new Date(r.created_at),
    ingredients,
    steps
  } as any;
};

export const updateRecipe = async (id: string, data: Partial<CreateRecipeInput>, userId?: string): Promise<void> => {
  const db = await getDatabase();
  const now = Date.now();

  if (userId) {
    const owner = await db.getFirstAsync('SELECT id FROM recipes WHERE id = ? AND user_id = ?', [id, userId]);
    if (!owner) throw new Error('Acesso negado: receita não pertence ao usuário.');
  }

  try {
    await db.execAsync('BEGIN TRANSACTION;');

    // Update root table
    const mappedData: any = {};
    if (data.title !== undefined) mappedData.title = data.title;
    if (data.description !== undefined) mappedData.description = data.description;
    if (data.prepTime !== undefined) mappedData.prep_time = data.prepTime;
    if (data.servings !== undefined) mappedData.servings = data.servings;
    if (data.category !== undefined) mappedData.category = data.category;
    if (data.photoUrl !== undefined) mappedData.photo_url = data.photoUrl;

    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(mappedData)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    
    if (fields.length > 0) {
      values.push(now, id);
      await db.runAsync(`UPDATE recipes SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`, values as any);
    }

    // Overwrite ingredients
    if (data.ingredients) {
      await db.runAsync('DELETE FROM ingredients WHERE recipe_id = ?', [id]);
      for (let i = 0; i < data.ingredients.length; i++) {
        const ing = data.ingredients[i];
        const ingId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        await db.runAsync(
          `INSERT INTO ingredients (id, recipe_id, quantity, unit, name, "order") VALUES (?, ?, ?, ?, ?, ?)`,
          [ingId, id, ing.quantity, ing.unit, ing.name, i]
        );
      }
    }

    // Overwrite steps
    if (data.steps) {
      await db.runAsync('DELETE FROM steps WHERE recipe_id = ?', [id]);
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i];
        const stepId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        await db.runAsync(
          `INSERT INTO steps (id, recipe_id, instruction, timer_minutes, "order") VALUES (?, ?, ?, ?, ?)`,
          [stepId, id, step.instruction, step.timerMinutes || null, i]
        );
      }
    }

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
};

export const deleteRecipe = async (id: string, userId?: string): Promise<void> => {
  const db = await getDatabase();

  if (userId) {
    const owner = await db.getFirstAsync('SELECT id FROM recipes WHERE id = ? AND user_id = ?', [id, userId]);
    if (!owner) throw new Error('Acesso negado: receita não pertence ao usuário.');
  }

  try {
    await db.execAsync('BEGIN TRANSACTION;');
    await db.runAsync('DELETE FROM steps WHERE recipe_id = ?', [id]);
    await db.runAsync('DELETE FROM ingredients WHERE recipe_id = ?', [id]);
    await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
};
