import { api } from '../api/client';
import { Recipe, Collection } from '../../types';

export const toggleFavorite = async (_userId: string, recipeId: string): Promise<boolean> => {
  const result = await api.post<{ isFavorite: boolean }>(`/api/user/favorites/${recipeId}/toggle`, {});
  return result.isFavorite;
};

export const getFavorites = async (_userId: string): Promise<Recipe[]> => {
  return api.get<Recipe[]>('/api/user/favorites');
};

export const isFavorite = async (_userId: string, recipeId: string): Promise<boolean> => {
  const result = await api.get<{ isFavorite: boolean }>(`/api/user/favorites/${recipeId}/check`);
  return result.isFavorite;
};

export const createCollection = async (_userId: string, name: string): Promise<string> => {
  const result = await api.post<{ id: string }>('/api/user/favorites/collections', { name });
  return result.id;
};

export const getCollections = async (_userId: string): Promise<Collection[]> => {
  return api.get<Collection[]>('/api/user/favorites/collections');
};

export const addToCollection = async (collectionId: string, recipeId: string): Promise<void> => {
  await api.post(`/api/user/favorites/collections/${collectionId}/recipes/${recipeId}`, {});
};

export const removeFromCollection = async (collectionId: string, recipeId: string): Promise<void> => {
  await api.delete(`/api/user/favorites/collections/${collectionId}/recipes/${recipeId}`);
};

export const getCollectionRecipes = async (collectionId: string): Promise<Recipe[]> => {
  return api.get<Recipe[]>(`/api/user/favorites/collections/${collectionId}/recipes`);
};

export const deleteCollection = async (id: string): Promise<void> => {
  await api.delete(`/api/user/favorites/collections/${id}`);
};
