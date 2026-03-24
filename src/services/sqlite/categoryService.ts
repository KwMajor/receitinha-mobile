import { getDatabase } from './database';
import { Category } from '../../types';

const DEFAULT_CATEGORIES = [
  'Café da Manhã', 'Almoço', 'Jantar', 'Sobremesas', 'Snacks', 'Fit', 'Bebidas'
];

const mapRow = (row: any): Category => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  isActive: row.is_active !== 0,
  isCustom: row.is_default === 0,
});

export const initDefaultCategories = async (userId: string): Promise<void> => {
  const db = await getDatabase();
  const existing = await db.getAllAsync('SELECT 1 FROM categories WHERE user_id = ? AND is_default = 1', [userId]);
  if (existing.length === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      await db.runAsync('INSERT INTO categories (id, user_id, name, is_default, is_active) VALUES (?, ?, ?, 1, 1)', [id, userId, cat]);
    }
  }
};

export const getCategories = async (userId: string): Promise<Category[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM categories WHERE user_id = ? ORDER BY is_default DESC, name ASC', [userId]);
  return (rows as any[]).map(mapRow);
};

export const createCustomCategory = async (userId: string, name: string): Promise<string> => {
  const db = await getDatabase();
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  await db.runAsync('INSERT INTO categories (id, user_id, name, is_default, is_active) VALUES (?, ?, ?, 0, 1)', [id, userId, name]);
  return id;
};

export const toggleCategoryActive = async (userId: string, categoryId: string, isActive: boolean): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('UPDATE categories SET is_active = ? WHERE id = ? AND user_id = ?', [isActive ? 1 : 0, categoryId, userId]);
};

export const deleteCustomCategory = async (categoryId: string): Promise<boolean> => {
  const db = await getDatabase();
  const category = await db.getFirstAsync('SELECT name FROM categories WHERE id = ? AND is_default = 0', [categoryId]) as any;
  if (!category) return false;

  const inUse = await db.getFirstAsync('SELECT 1 FROM recipes WHERE category = ?', [category.name]);
  if (inUse) throw new Error('Categoria em uso por uma receita e não pode ser apagada.');

  await db.runAsync('DELETE FROM categories WHERE id = ?', [categoryId]);
  return true;
};
