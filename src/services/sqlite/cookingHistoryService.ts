import { api } from '../api/client';
import { HistoryEntry } from '../../types';

export interface GroupedHistory {
  title: string;
  data: HistoryEntry[];
}

export const addToHistory = async (_userId: string, recipeId: string, notes?: string): Promise<void> => {
  await api.post('/api/user/history', { recipeId, notes });
};

export const getHistory = async (_userId: string, limit = 100, offset = 0): Promise<HistoryEntry[]> => {
  return api.get<HistoryEntry[]>(`/api/user/history?limit=${limit}&offset=${offset}`);
};

export const getHistoryGrouped = async (_userId: string): Promise<GroupedHistory[]> => {
  const entries = await getHistory(_userId);
  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString();

  const map = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const ds = new Date(entry.cookedAt).toDateString();
    let label: string;
    if (ds === todayStr) label = 'Hoje';
    else if (ds === yesterdayStr) label = 'Ontem';
    else label = new Date(entry.cookedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(entry);
  }

  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
};

export const deleteHistoryEntry = async (id: string): Promise<void> => {
  await api.delete(`/api/user/history/${id}`);
};

export const getRecipeStats = async (
  _userId: string,
  recipeId: string
): Promise<{ timesCooked: number; lastCooked: string | null }> => {
  return api.get(`/api/user/history/stats/${recipeId}`);
};

export const countHistory = async (_userId: string): Promise<number> => {
  const result = await api.get<{ count: number }>('/api/user/history/count');
  return result.count;
};
