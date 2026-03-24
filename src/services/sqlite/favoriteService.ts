import { getDatabase } from './database';
import { Recipe, Collection } from '../../types';

export const toggleFavorite = async (userId: string, recipeId: string): Promise<boolean> => {
  const db = await getDatabase();
  const existing = await db.getFirstAsync('SELECT * FROM favorites WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);

  if (existing) {
    await db.runAsync('DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);
    return false; // desfavoritou
  } else {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    await db.runAsync('INSERT INTO favorites (id, user_id, recipe_id, created_at) VALUES (?, ?, ?, ?)', [id, userId, recipeId, Date.now()]);
    return true; // favoritou
  }
};

export const getFavorites = async (userId: string): Promise<Recipe[]> => {
  const db = await getDatabase();
  const recipes = await db.getAllAsync(`
    SELECT r.* FROM recipes r
    INNER JOIN favorites f ON r.id = f.recipe_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `, [userId]);
  return (recipes as any[]).map(r => ({ ...r, photoUrl: r.photo_url, prepTime: r.prep_time })) as Recipe[];
};

export const isFavorite = async (userId: string, recipeId: string): Promise<boolean> => {
  const db = await getDatabase();
  const result = await db.getFirstAsync('SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);
  return !!result;
};

export const createCollection = async (userId: string, name: string): Promise<string> => {
  const db = await getDatabase();
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  await db.runAsync('INSERT INTO collections (id, user_id, name, created_at) VALUES (?, ?, ?, ?)', [id, userId, name, Date.now()]);
  return id;
};

export const getCollections = async (userId: string): Promise<Collection[]> => {
  const db = await getDatabase();
  const collections = await db.getAllAsync('SELECT * FROM collections WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  
  // Para cada coleção, vamos buscar a quantidade de receitas apenas (ou as receitas se precisar)
  return Promise.all(collections.map(async (col: any) => {
    const recipes = await db.getAllAsync('SELECT recipe_id FROM collection_recipes WHERE collection_id = ?', [col.id]);
    return {
      ...col,
      recipeIds: recipes.map((r: any) => r.recipe_id)
    };
  }));
};

export const addToCollection = async (collectionId: string, recipeId: string): Promise<void> => {
  const db = await getDatabase();
  const existing = await db.getFirstAsync('SELECT 1 FROM collection_recipes WHERE collection_id = ? AND recipe_id = ?', [collectionId, recipeId]);
  if (!existing) {
    await db.runAsync('INSERT INTO collection_recipes (collection_id, recipe_id) VALUES (?, ?)', [collectionId, recipeId]);
  }
};

export const removeFromCollection = async (collectionId: string, recipeId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM collection_recipes WHERE collection_id = ? AND recipe_id = ?', [collectionId, recipeId]);
};

export const getCollectionRecipes = async (collectionId: string): Promise<Recipe[]> => {
  const db = await getDatabase();
  const recipes = await db.getAllAsync(`
    SELECT r.* FROM recipes r
    INNER JOIN collection_recipes cr ON r.id = cr.recipe_id
    WHERE cr.collection_id = ?
  `, [collectionId]);
  return (recipes as any[]).map(r => ({ ...r, photoUrl: r.photo_url, prepTime: r.prep_time })) as Recipe[];
};

export const deleteCollection = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM collection_recipes WHERE collection_id = ?', [id]);
  await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
};
