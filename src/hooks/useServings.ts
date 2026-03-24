import { useState, useMemo, useEffect } from 'react';
import { Ingredient } from '../types';

export const useServings = (ingredients: Ingredient[], baseServings: number) => {
  const [currentServings, setCurrentServings] = useState(baseServings > 0 ? baseServings : 1);
  useEffect(() => {
    setCurrentServings(baseServings > 0 ? baseServings : 1);
  }, [baseServings]);

  const adjustQuantity = (originalQty: number): number => {
    if (baseServings <= 0) return originalQty;
    const ratio = currentServings / baseServings;
    const computed = originalQty * ratio;
    return Math.round(computed * 100) / 100;
  };

  const adjustedIngredients = useMemo(() => {
    return ingredients.map(ing => ({
      ...ing,
      quantity: adjustQuantity(ing.quantity),
      isAdjusted: currentServings !== baseServings
    }));
  }, [ingredients, currentServings, baseServings]);

  return {
    currentServings,
    setServings: setCurrentServings,
    adjustedIngredients,
    adjustQuantity
  };
};
