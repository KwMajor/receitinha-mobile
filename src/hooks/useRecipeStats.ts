import { useEffect, useState } from 'react';
import { getRecipeStats } from '../services/sqlite/cookingHistoryService';
import { useAuthStore } from '../store/authStore';

export const useRecipeStats = (recipeId: string) => {
  const { user } = useAuthStore();
  const [timesCooked, setTimesCooked] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getRecipeStats(user.id, recipeId).then(stats => {
      if (!cancelled) setTimesCooked(stats.timesCooked);
    });
    return () => { cancelled = true; };
  }, [recipeId, user?.id]);

  return { timesCooked };
};
