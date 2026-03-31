import { getDatabase } from './database';
import { getRecipeById } from './recipeService';
import { Recipe } from '../../types';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface DayPlan {
  breakfast: Recipe | null;
  lunch: Recipe | null;
  dinner: Recipe | null;
}

export interface WeekPlan {
  [dayIndex: number]: DayPlan;
}

const EMPTY_DAY: DayPlan = { breakfast: null, lunch: null, dinner: null };

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

export async function getWeekPlan(userId: string, weekStart: string): Promise<WeekPlan> {
  const db = await getDatabase();

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
    plan[i] = { ...EMPTY_DAY };
  }

  await Promise.all(
    rows.map(async (row) => {
      const recipe = await getRecipeById(row.recipe_id);
      if (recipe && row.meal_type in EMPTY_DAY) {
        plan[row.day_index][row.meal_type as MealType] = recipe;
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
