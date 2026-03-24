import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { getRecipes, deleteRecipe as deleteRecipeService, RecipeFilters } from '../services/sqlite/recipeService';
import { Recipe } from '../types';

export const useRecipes = () => {
  const { user } = useAuthStore();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Omit<RecipeFilters, 'query'>>({});

  const fetchRecipes = useCallback(async (currentQuery: string, currentFilters: Omit<RecipeFilters, 'query'>) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecipes(user.id, {
        query: currentQuery,
        ...currentFilters
      });
      setRecipes(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar receitas');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const search = (query: string) => {
    setSearchQuery(query);
  };

  const applyFilters = (newFilters: Omit<RecipeFilters, 'query'>) => {
    setFilters(newFilters);
    fetchRecipes(searchQuery, newFilters);
  };

  const refresh = () => {
    fetchRecipes(searchQuery, filters);
  };

  const removeRecipe = async (id: string) => {
    try {
      await deleteRecipeService(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar receita');
      throw err;
    }
  };

  return {
    recipes,
    isLoading,
    error,
    searchQuery,
    filters,
    search,
    applyFilters,
    refresh,
    removeRecipe,
    fetchRecipes // exposed if needed to trigger manually after debounce
  };
};