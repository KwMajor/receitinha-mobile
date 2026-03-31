import { api } from './client';
import { getDatabase } from '../sqlite/database';
import { getRecipeById, createRecipe } from '../sqlite/recipeService';
import { PublicRecipe, Rating } from '../../types';
import { auth } from '../firebase/config';

interface FeedResponse {
  recipes: PublicRecipe[];
  nextCursor: string | null;
}

// ─── Feed ────────────────────────────────────────────────────────────────────

export const getFeed = async (
  cursor?: string,
  limit = 20,
): Promise<FeedResponse> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  return api.get<FeedResponse>(`/api/recipes/feed?${params}`);
};

// ─── Receita pública individual ───────────────────────────────────────────────

export const getPublicRecipe = async (id: string): Promise<PublicRecipe> => {
  return api.get<PublicRecipe>(`/api/recipes/${id}`);
};

// ─── Publicar ─────────────────────────────────────────────────────────────────

export const publishRecipe = async (recipeId: string): Promise<void> => {
  const recipe = await getRecipeById(recipeId);
  if (!recipe) throw new Error('Receita não encontrada.');

  await api.post('/api/recipes', {
    localId: recipe.id,
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    prepTime: recipe.prepTime,
    servings: recipe.servings,
    photoUrl: recipe.photoUrl ?? null,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
    })),
    steps: recipe.steps.map((step) => ({
      instruction: step.instruction,
      timerMinutes: step.timer_minutes ?? null,
      order: step.order,
    })),
  });

  // Marca como pública no SQLite local
  const db = await getDatabase();
  await db.runAsync('UPDATE recipes SET is_public = 1 WHERE id = ?', [recipeId]);
};

// ─── Despublicar ──────────────────────────────────────────────────────────────

export const unpublishRecipe = async (recipeId: string): Promise<void> => {
  await api.delete(`/api/recipes/${recipeId}/publish`);

  const db = await getDatabase();
  await db.runAsync('UPDATE recipes SET is_public = 0 WHERE id = ?', [recipeId]);
};

// ─── Denunciar ────────────────────────────────────────────────────────────────

export const flagRecipe = async (recipeId: string): Promise<void> => {
  await api.post(`/api/recipes/${recipeId}/flag`, {});
};

// ─── Avaliações ───────────────────────────────────────────────────────────────

export const getRatings = async (
  recipeId: string,
  cursor?: string,
  limit = 15,
): Promise<{ ratings: Rating[]; nextCursor: string | null }> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  return api.get(`/api/recipes/${recipeId}/ratings?${params}`);
};

export const submitRating = async (
  recipeId: string,
  stars: number,
  comment?: string,
): Promise<Rating> => {
  return api.post(`/api/recipes/${recipeId}/ratings`, {
    stars,
    comment: comment?.trim() || null,
  });
};

export const getUserRating = async (recipeId: string): Promise<Rating | null> => {
  return api.get(`/api/recipes/${recipeId}/ratings?userId=me`);
};

// ─── Salvar receita pública no SQLite local ───────────────────────────────────

export const savePublicRecipeLocally = async (recipe: PublicRecipe): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Usuário não autenticado.');

  await createRecipe(userId, {
    title: recipe.title,
    description: recipe.description ?? '',
    prepTime: recipe.prepTime,
    servings: recipe.servings,
    category: recipe.category,
    photoUrl: recipe.photoUrl,
    isPublic: false,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
    })),
    steps: recipe.steps.map((step) => ({
      instruction: step.instruction,
      timerMinutes: step.timer_minutes,
    })),
  });
};
