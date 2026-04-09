import { api } from '../api/client';
import { Recipe } from '../../types';

export type MealType = string;

export interface MealSlotConfig {
  mealType: string;
  label: string;
  order: number;
}

export const DEFAULT_MEAL_SLOTS: MealSlotConfig[] = [
  { mealType: 'breakfast', label: 'Café', order: 0 },
  { mealType: 'lunch', label: 'Almoço', order: 1 },
  { mealType: 'dinner', label: 'Jantar', order: 2 },
];

export interface DayPlan {
  [mealType: string]: Recipe | null;
}

export interface WeekPlan {
  [dayIndex: number]: DayPlan;
}

export function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  return sunday.toISOString().split('T')[0];
}

export function addWeeks(weekStart: string, delta: number): string {
  const date = new Date(weekStart + 'T12:00:00');
  date.setDate(date.getDate() + delta * 7);
  return date.toISOString().split('T')[0];
}

export async function getWeekMealSlots(_userId: string, weekStart: string): Promise<MealSlotConfig[]> {
  return api.get<MealSlotConfig[]>(`/api/user/planning/slots?weekStart=${weekStart}`);
}

export async function addMealSlot(_userId: string, weekStart: string, label: string): Promise<MealSlotConfig[]> {
  return api.post<MealSlotConfig[]>('/api/user/planning/slots', { weekStart, label });
}

export async function removeMealSlot(_userId: string, weekStart: string, mealType: string): Promise<void> {
  await api.delete(`/api/user/planning/slots/${encodeURIComponent(mealType)}?weekStart=${weekStart}`);
}

export async function reorderMealSlots(_userId: string, weekStart: string, orderedTypes: string[]): Promise<void> {
  await api.put('/api/user/planning/slots/reorder', { weekStart, orderedTypes });
}

export async function getWeekPlan(_userId: string, weekStart: string): Promise<WeekPlan> {
  return api.get<WeekPlan>(`/api/user/planning?weekStart=${weekStart}`);
}

export async function setMeal(
  _userId: string,
  weekStart: string,
  dayIndex: number,
  mealType: MealType,
  recipeId: string
): Promise<void> {
  await api.put('/api/user/planning/meal', { weekStart, dayIndex, mealType, recipeId });
}

export async function removeMeal(
  _userId: string,
  weekStart: string,
  dayIndex: number,
  mealType: MealType
): Promise<void> {
  await api.deleteBody('/api/user/planning/meal', { weekStart, dayIndex, mealType });
}
