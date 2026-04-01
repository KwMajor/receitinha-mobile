import { api } from '../api/client';
import { Category } from '../../types';

export const initDefaultCategories = async (_userId: string): Promise<void> => {
  // Server auto-creates defaults on first GET /api/user/categories
};

export const getCategories = async (_userId: string): Promise<Category[]> => {
  return api.get<Category[]>('/api/user/categories');
};

export const createCustomCategory = async (_userId: string, name: string): Promise<string> => {
  const result = await api.post<{ id: string }>('/api/user/categories', { name });
  return result.id;
};

export const toggleCategoryActive = async (_userId: string, categoryId: string, isActive: boolean): Promise<void> => {
  await api.patch(`/api/user/categories/${categoryId}/toggle`, { isActive });
};

export const deleteCustomCategory = async (categoryId: string): Promise<boolean> => {
  await api.delete(`/api/user/categories/${categoryId}`);
  return true;
};
