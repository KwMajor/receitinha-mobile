import { create } from 'zustand';
import { PublicRecipe } from '../types';

interface CommunityState {
  feed: PublicRecipe[];
  nextCursor: string | null;
  isLoading: boolean;
  error: string | null;
  setFeed: (recipes: PublicRecipe[]) => void;
  appendFeed: (recipes: PublicRecipe[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCursor: (cursor: string | null) => void;
  /** Atualiza média e contagem de avaliações de um item do feed após submissão */
  updateFeedRating: (recipeId: string, averageRating: number, ratingCount: number) => void;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  feed: [],
  nextCursor: null,
  isLoading: false,
  error: null,
  setFeed: (recipes) => set({ feed: recipes }),
  appendFeed: (recipes) =>
    set((state) => ({ feed: [...state.feed, ...recipes] })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setCursor: (nextCursor) => set({ nextCursor }),
  updateFeedRating: (recipeId, averageRating, ratingCount) =>
    set((state) => ({
      feed: state.feed.map((r) =>
        r.id === recipeId ? { ...r, averageRating, ratingCount } : r,
      ),
    })),
}));
