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
  videoUrl?: string;
  is_public?: number; // 0 = privada, 1 = pública
  createdAt: Date;
}

export interface PublicRecipe extends Recipe {
  authorName: string;
  authorId: string;
  averageRating: number;
  ratingCount: number;
  is_public: 1;
}

export interface Rating {
  id: string;
  recipeId: string;
  userId: string;
  authorName: string;
  stars: number; // 1-5
  comment?: string;
  createdAt: string; // ISO string da API
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

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  itemCount?: number;
  pendingCount?: number;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  quantity?: number;
  unit?: string;
  category: string;
  isChecked: boolean;
  addedAt: Date;
  price?: number;
}

export interface BudgetMonth {
  month: string; // 'YYYY-MM'
  total: number;
}

export interface BudgetCategory {
  category: string;
  total: number;
  percentage: number;
}

export interface BudgetReport {
  months: BudgetMonth[];
  categories: BudgetCategory[];
}

export interface SpendingRecord {
  id: string;
  itemName: string;
  category: string;
  price: number;
  listName?: string;
  recordedAt: string;
}

export interface SpendingMonth {
  month: string; // 'YYYY-MM'
  total: number;
  records: SpendingRecord[];
}
