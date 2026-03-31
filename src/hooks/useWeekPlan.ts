import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  getWeekPlan,
  getWeekMealSlots,
  addMealSlot as addMealSlotService,
  removeMealSlot as removeMealSlotService,
  reorderMealSlots as reorderMealSlotsService,
  setMeal as setMealService,
  removeMeal as removeMealService,
  getCurrentWeekStart,
  addWeeks,
  WeekPlan,
  MealType,
  MealSlotConfig,
} from '../services/sqlite/planningService';

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(weekStart + 'T12:00:00');
  end.setDate(end.getDate() + 6);

  const months = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ];

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];

  if (start.getMonth() === end.getMonth()) {
    return `${startDay}–${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}

export function getWeekDates(weekStart: string): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d;
  });
}

export const useWeekPlan = () => {
  const { user } = useAuthStore();
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart);
  const [weekPlan, setWeekPlan] = useState<WeekPlan>({});
  const [mealSlots, setMealSlots] = useState<MealSlotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async (ws = weekStart) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [plan, slots] = await Promise.all([
        getWeekPlan(user.id, ws),
        getWeekMealSlots(user.id, ws),
      ]);
      setWeekPlan(plan);
      setMealSlots(slots);
    } finally {
      setIsLoading(false);
    }
  }, [user, weekStart]);

  const goToNextWeek = () => {
    const next = addWeeks(weekStart, 1);
    setWeekStart(next);
    refresh(next);
  };

  const goToPreviousWeek = () => {
    const prev = addWeeks(weekStart, -1);
    setWeekStart(prev);
    refresh(prev);
  };

  const setMeal = async (dayIndex: number, mealType: MealType, recipeId: string) => {
    if (!user) return;
    await setMealService(user.id, weekStart, dayIndex, mealType, recipeId);
    await refresh(weekStart);
  };

  const removeMeal = async (dayIndex: number, mealType: MealType) => {
    if (!user) return;
    await removeMealService(user.id, weekStart, dayIndex, mealType);
    await refresh(weekStart);
  };

  const addMealSlot = async (label: string) => {
    if (!user) return;
    const slots = await addMealSlotService(user.id, weekStart, label);
    setMealSlots(slots);
    // refresh plan so new slot keys appear with null values
    const plan = await getWeekPlan(user.id, weekStart);
    setWeekPlan(plan);
  };

  const removeExtraMealSlot = async (mealType: string) => {
    if (!user) return;
    await removeMealSlotService(user.id, weekStart, mealType);
    await refresh(weekStart);
  };

  const moveMealSlotUp = async (mealType: string) => {
    if (!user) return;
    const idx = mealSlots.findIndex(s => s.mealType === mealType);
    if (idx <= 0) return;
    const newOrder = [...mealSlots];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    await reorderMealSlotsService(user.id, weekStart, newOrder.map(s => s.mealType));
    setMealSlots(newOrder.map((s, i) => ({ ...s, order: i })));
  };

  const moveMealSlotDown = async (mealType: string) => {
    if (!user) return;
    const idx = mealSlots.findIndex(s => s.mealType === mealType);
    if (idx < 0 || idx >= mealSlots.length - 1) return;
    const newOrder = [...mealSlots];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    await reorderMealSlotsService(user.id, weekStart, newOrder.map(s => s.mealType));
    setMealSlots(newOrder.map((s, i) => ({ ...s, order: i })));
  };

  return {
    weekPlan,
    mealSlots,
    weekStart,
    weekLabel: formatWeekRange(weekStart),
    weekDates: getWeekDates(weekStart),
    isLoading,
    refresh,
    goToNextWeek,
    goToPreviousWeek,
    setMeal,
    removeMeal,
    addMealSlot,
    removeExtraMealSlot,
    moveMealSlotUp,
    moveMealSlotDown,
  };
};
