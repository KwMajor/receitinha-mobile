export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Step {
  id: string;
  order: number;
  instruction: string;
  timer_minutes?: number;
}

export interface HistoryEntry {
  id: string;
  userId: string;
  recipeId: string;
  cookedAt: Date;
  notes?: string;
  recipe?: Recipe;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  isCustom: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  userId: string;
  category: string;
  ingredients: Ingredient[];
  steps: Step[];
  prepTime: number; // in minutes
  servings: number;
  photoUrl?: string;
  createdAt: Date;
}

export interface Collection {
  id: string;
  name: string;
  userId: string;
  recipeIds: string[];
}

export interface Favorite {
  id: string;
  userId: string;
  recipeId: string;
  createdAt: Date;
}
