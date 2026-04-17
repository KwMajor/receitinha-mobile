import { api } from '../api/client';
import { ShoppingList, ShoppingItem, BudgetReport, SpendingMonth } from '../../types';

// ── List management ──────────────────────────────────────────────────────────

export async function createList(_userId: string, name: string): Promise<string> {
  const result = await api.post<{ id: string }>('/api/user/shopping/lists', { name });
  return result.id;
}

export async function getLists(_userId: string): Promise<ShoppingList[]> {
  return api.get<ShoppingList[]>('/api/user/shopping/lists');
}

export async function getListById(id: string): Promise<ShoppingList | null> {
  const lists = await getLists('');
  return lists.find(l => l.id === id) ?? null;
}

export async function renameList(id: string, name: string): Promise<void> {
  await api.put(`/api/user/shopping/lists/${id}`, { name });
}

export async function duplicateList(id: string, newName: string): Promise<string> {
  const [items, original] = await Promise.all([
    getItems(id),
    getListById(id),
  ]);
  if (!original) throw new Error('List not found');
  const newId = await createList(original.userId, newName);
  for (const item of items) {
    await addItem(newId, item.name, item.quantity, item.unit, item.category);
  }
  return newId;
}

export async function deleteList(id: string): Promise<void> {
  await api.delete(`/api/user/shopping/lists/${id}`);
}

export async function setActiveList(_userId: string, listId: string): Promise<void> {
  await api.patch(`/api/user/shopping/lists/${listId}/activate`, {});
}

export async function getActiveListId(_userId: string): Promise<string | null> {
  const result = await api.get<{ id: string | null }>('/api/user/shopping/lists/active');
  return result.id;
}

// ── Item management ──────────────────────────────────────────────────────────

export async function addItem(
  listId: string,
  name: string,
  quantity?: number,
  unit?: string,
  category?: string
): Promise<string> {
  const result = await api.post<{ id: string }>(`/api/user/shopping/lists/${listId}/items`, {
    name, quantity, unit, category,
  });
  return result.id;
}

export async function toggleItem(itemId: string): Promise<void> {
  await api.patch(`/api/user/shopping/items/${itemId}/toggle`, {});
}

export async function removeItem(itemId: string): Promise<void> {
  await api.delete(`/api/user/shopping/items/${itemId}`);
}

export async function clearChecked(listId: string): Promise<void> {
  await api.delete(`/api/user/shopping/lists/${listId}/checked`);
}

export async function getItems(listId: string): Promise<ShoppingItem[]> {
  return api.get<ShoppingItem[]>(`/api/user/shopping/lists/${listId}/items`);
}

export async function setItemPrice(itemId: string, price: number | null): Promise<void> {
  await api.patch(`/api/user/shopping/items/${itemId}/price`, { price });
}

export async function getBudgetReport(months = 4): Promise<BudgetReport> {
  return api.get<BudgetReport>(`/api/user/shopping/budget?months=${months}`);
}

export async function getSpendingHistory(months = 6): Promise<SpendingMonth[]> {
  return api.get<SpendingMonth[]>(`/api/user/shopping/spending?months=${months}`);
}

// ── Auto-generation from week plan ──────────────────────────────────────────

export async function generateFromWeekPlan(_userId: string, weekStart: string): Promise<string> {
  const result = await api.post<{ id: string }>('/api/user/shopping/generate', { weekStart });
  return result.id;
}
