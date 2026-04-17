import { api } from '../api/client';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { Recipe } from '../../types';

export interface CreateRecipeInput {
  title: string;
  description: string;
  prepTime: number;
  servings: number;
  category: string;
  photoUrl?: string;
  videoUrl?: string;
  isPublic?: boolean;
  ingredients: { name: string; quantity: number; unit: string }[];
  steps: { instruction: string; timerMinutes?: number }[];
}

export interface RecipeFilters {
  query?: string;
  categories?: string[];
  maxPrepTime?: number;
}

export const createRecipe = async (_userId: string, data: CreateRecipeInput): Promise<string> => {
  const result = await api.post<{ id: string }>('/api/user/recipes', data);
  return result.id;
};

export const getRecipes = async (_userId: string, filters?: RecipeFilters): Promise<Recipe[]> => {
  const params = new URLSearchParams();
  if (filters?.query) params.set('query', filters.query);
  if (filters?.maxPrepTime) params.set('maxPrepTime', String(filters.maxPrepTime));
  if (filters?.categories?.length) {
    filters.categories.forEach(c => params.append('categories[]', c));
  }
  const qs = params.toString() ? `?${params.toString()}` : '';
  return api.get<Recipe[]>(`/api/user/recipes${qs}`);
};

export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  try {
    return await api.get<Recipe>(`/api/user/recipes/${id}`);
  } catch {
    return null;
  }
};

export const updateRecipe = async (id: string, data: Partial<CreateRecipeInput>): Promise<void> => {
  await api.put(`/api/user/recipes/${id}`, data);
};

export const deleteRecipe = async (id: string): Promise<void> => {
  await api.delete(`/api/user/recipes/${id}`);
};

export const attachVideo = async (recipeId: string, localUri: string): Promise<string> => {
  const { signature, timestamp, apiKey, cloudName, folder } = await api.get<{
    signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string;
  }>('/api/user/photos/sign?type=video');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

  const result = await uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'video/mp4',
    parameters: {
      api_key: apiKey,
      timestamp: String(timestamp),
      signature,
      folder,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload do vídeo falhou com status ${result.status}`);
  }

  const { secure_url } = JSON.parse(result.body);
  await api.patch(`/api/user/recipes/${recipeId}/video`, { videoUrl: secure_url });
  return secure_url;
};
