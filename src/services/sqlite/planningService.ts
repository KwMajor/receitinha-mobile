import { getDatabase } from './database';
import { getRecipeById } from './recipeService';
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
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export function addWeeks(weekStart: string, delta: number): string {
  const date = new Date(weekStart + 'T12:00:00');
  date.setDate(date.getDate() + delta * 7);
  return date.toISOString().split('T')[0];
}

export async function getWeekMealSlots(userId: string, weekStart: string): Promise<MealSlotConfig[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ meal_type: string; label: string; slot_order: number }>(
    'SELECT meal_type, label, slot_order FROM week_meal_slots WHERE user_id = ? AND week_start = ? ORDER BY slot_order',
    [userId, weekStart]
  );

  if (rows.length === 0) {
    for (const slot of DEFAULT_MEAL_SLOTS) {
      const id = `${userId}_${weekStart}_${slot.mealType}_slot`;
      await db.runAsync(
        'INSERT OR IGNORE INTO week_meal_slots (id, user_id, week_start, meal_type, label, slot_order) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, weekStart, slot.mealType, slot.label, slot.order]
      );
    }
    return DEFAULT_MEAL_SLOTS.map(s => ({ mealType: s.mealType, label: s.label, order: s.order }));
  }

  return rows.map(r => ({ mealType: r.meal_type, label: r.label, order: r.slot_order }));
}

export async function addMealSlot(userId: string, weekStart: string, label: string): Promise<MealSlotConfig[]> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ max_order: number }>(
    'SELECT MAX(slot_order) as max_order FROM week_meal_slots WHERE user_id = ? AND week_start = ?',
    [userId, weekStart]
  );
  const newOrder = (result?.max_order ?? 2) + 1;
  const mealType = `extra_${Date.now()}`;
  const id = `${userId}_${weekStart}_${mealType}_slot`;
  await db.runAsync(
    'INSERT INTO week_meal_slots (id, user_id, week_start, meal_type, label, slot_order) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, weekStart, mealType, label, newOrder]
  );
  return getWeekMealSlots(userId, weekStart);
}

export async function removeMealSlot(userId: string, weekStart: string, mealType: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM week_meal_slots WHERE user_id = ? AND week_start = ? AND meal_type = ?',
    [userId, weekStart, mealType]
  );
  await db.runAsync(
    'DELETE FROM week_plan WHERE user_id = ? AND week_start = ? AND meal_type = ?',
    [userId, weekStart, mealType]
  );
}

export async function reorderMealSlots(userId: string, weekStart: string, orderedTypes: string[]): Promise<void> {
  const db = await getDatabase();
  for (let i = 0; i < orderedTypes.length; i++) {
    await db.runAsync(
      'UPDATE week_meal_slots SET slot_order = ? WHERE user_id = ? AND week_start = ? AND meal_type = ?',
      [i, userId, weekStart, orderedTypes[i]]
    );
  }
}

export async function getWeekPlan(userId: string, weekStart: string): Promise<WeekPlan> {
  const db = await getDatabase();
  const slots = await getWeekMealSlots(userId, weekStart);
  const validTypes = new Set(slots.map(s => s.mealType));

  const rows = await db.getAllAsync<{
    day_index: number;
    meal_type: string;
    recipe_id: string;
  }>(
    'SELECT day_index, meal_type, recipe_id FROM week_plan WHERE user_id = ? AND week_start = ?',
    [userId, weekStart]
  );

  const plan: WeekPlan = {};
  for (let i = 0; i < 7; i++) {
    plan[i] = {};
    for (const slot of slots) {
      plan[i][slot.mealType] = null;
    }
  }

  await Promise.all(
    rows.map(async (row) => {
      if (validTypes.has(row.meal_type)) {
        const recipe = await getRecipeById(row.recipe_id);
        if (recipe) {
          plan[row.day_index][row.meal_type] = recipe;
        }
      }
    })
  );

  return plan;
}

export async function setMeal(
  userId: string,
  weekStart: string,
  dayIndex: number,
  mealType: MealType,
  recipeId: string
): Promise<void> {
  const db = await getDatabase();
  const id = `${userId}_${weekStart}_${dayIndex}_${mealType}`;

  await db.runAsync(
    `INSERT INTO week_plan (id, user_id, week_start, day_index, meal_type, recipe_id)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, week_start, day_index, meal_type)
     DO UPDATE SET recipe_id = excluded.recipe_id`,
    [id, userId, weekStart, dayIndex, mealType, recipeId]
  );
}

export async function removeMeal(
  userId: string,
  weekStart: string,
  dayIndex: number,
  mealType: MealType
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM week_plan WHERE user_id = ? AND week_start = ? AND day_index = ? AND meal_type = ?',
    [userId, weekStart, dayIndex, mealType]
  );
}
