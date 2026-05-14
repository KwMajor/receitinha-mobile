import {
  collection as fsCollection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { getRecipes, getRecipeById, createRecipe } from '../sqlite/recipeService';
import {
  getFavorites,
  getCollections,
  toggleFavorite,
  createCollection,
  addToCollection,
} from '../sqlite/favoriteService';
import {
  getWeekPlan,
  setMeal,
  getCurrentWeekStart,
  addWeeks,
} from '../sqlite/planningService';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface BackupResult {
  recipesCount: number;
  favoritesCount: number;
  collectionsCount: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface RestoreResult {
  restored: number;
  skipped: number;
  errors: number;
}

// ── Refs helpers ───────────────────────────────────────────────────────────────

const subCol = (userId: string, col: string) =>
  fsCollection(db, 'users', userId, col);

const subDoc = (userId: string, col: string, id: string) =>
  doc(db, 'users', userId, col, id);

// ── BACKUP ─────────────────────────────────────────────────────────────────────

export async function backupRecipes(userId: string): Promise<number> {
  const recipes = await getRecipes(userId);
  if (!recipes.length) return 0;

  // Busca detalhes completos (ingredientes + passos) de cada receita sequencialmente
  const fullRecipes = [];
  for (const r of recipes) {
    const full = await getRecipeById(r.id);
    if (full) fullRecipes.push(full);
  }

  // writeBatch suporta até 500 operações — usa chunks de 400 para folga
  for (let i = 0; i < fullRecipes.length; i += 400) {
    const batch = writeBatch(db);
    fullRecipes.slice(i, i + 400).forEach((r) =>
      batch.set(
        subDoc(userId, 'recipes', r.id),
        {
          ...r,
          createdAt:
            r.createdAt instanceof Date
              ? r.createdAt.toISOString()
              : r.createdAt,
          backedUpAt: Date.now(),
        },
        { merge: true }
      )
    );
    await batch.commit();
  }
  return fullRecipes.length;
}

export async function backupFavorites(userId: string): Promise<number> {
  const favorites = await getFavorites(userId);
  if (!favorites.length) return 0;

  const batch = writeBatch(db);
  favorites.forEach((r) =>
    batch.set(subDoc(userId, 'favorites', r.id), {
      recipeId: r.id,
      backedUpAt: Date.now(),
    })
  );
  await batch.commit();
  return favorites.length;
}

export async function backupCollections(userId: string): Promise<number> {
  const collections = await getCollections(userId);
  if (!collections.length) return 0;

  const batch = writeBatch(db);
  collections.forEach((c) =>
    batch.set(subDoc(userId, 'collections', c.id), {
      id: c.id,
      name: c.name,
      recipeIds: c.recipeIds ?? [],
      backedUpAt: Date.now(),
    })
  );
  await batch.commit();
  return collections.length;
}

export async function backupWeekPlans(userId: string): Promise<number> {
  const currentWeek = getCurrentWeekStart();
  // Faz backup das últimas 4 semanas (atual + 3 anteriores) — sequencial para evitar rate limit
  const weeks = [0, -1, -2, -3].map((delta) => addWeeks(currentWeek, delta));
  let count = 0;

  for (const weekStart of weeks) {
    try {
      const plan = await getWeekPlan(userId, weekStart);
      const slots: Record<string, string> = {};

      Object.entries(plan).forEach(([dayIdx, dayPlan]) => {
        Object.entries(dayPlan).forEach(([mealType, recipeOrNull]) => {
          const r = recipeOrNull as { id: string } | null;
          if (r?.id) slots[`${dayIdx}_${mealType}`] = r.id;
        });
      });

      if (Object.keys(slots).length) {
        await setDoc(subDoc(userId, 'weekPlans', weekStart), {
          slots,
          weekStart,
          backedUpAt: Date.now(),
        });
        count++;
      }
    } catch {
      // Semana sem plano — ignora silenciosamente
    }
  }
  return count;
}

export async function fullBackup(userId: string): Promise<BackupResult> {
  const timestamp = Date.now();
  try {
    // Sequencial para respeitar o rate limit da API
    const recipesCount = await backupRecipes(userId);
    const favoritesCount = await backupFavorites(userId);
    const collectionsCount = await backupCollections(userId);
    await backupWeekPlans(userId);

    // Persiste o timestamp do último backup
    await setDoc(
      subDoc(userId, 'settings', 'preferences'),
      { lastBackup: timestamp },
      { merge: true }
    );

    return { recipesCount, favoritesCount, collectionsCount, timestamp, success: true };
  } catch (error: any) {
    console.error('[Backup] fullBackup falhou:', error?.code, error?.message, error);
    return {
      recipesCount: 0,
      favoritesCount: 0,
      collectionsCount: 0,
      timestamp,
      success: false,
      error: error?.code ?? error?.message ?? 'Erro desconhecido',
    };
  }
}

// ── RESTORE ────────────────────────────────────────────────────────────────────

async function restoreRecipes(
  userId: string
): Promise<{ restored: number; skipped: number; errors: number; idMap: Map<string, string> }> {
  const [firestoreDocs, currentRecipes] = await Promise.all([
    getDocs(subCol(userId, 'recipes')),
    getRecipes(userId),
  ]);

  const currentIds = new Set(currentRecipes.map((r) => r.id));
  const idMap = new Map<string, string>();
  let restored = 0, skipped = 0, errors = 0;

  for (const snap of firestoreDocs.docs) {
    const r = snap.data() as any;

    if (currentIds.has(r.id)) {
      // Receita já existe no servidor — apenas mapeia o ID
      idMap.set(r.id, r.id);
      skipped++;
      continue;
    }

    try {
      const newId = await createRecipe(userId, {
        title: r.title,
        description: r.description ?? '',
        prepTime: r.prepTime ?? 0,
        servings: r.servings ?? 1,
        category: r.category ?? 'Outros',
        photoUrl: r.photoUrl,
        isPublic: false,
        ingredients: (r.ingredients ?? []).map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
        })),
        steps: (r.steps ?? []).map((s: any) => ({
          instruction: s.instruction,
          timerMinutes: s.timer_minutes ?? s.timerMinutes,
        })),
      });
      idMap.set(r.id, newId);
      restored++;
    } catch {
      errors++;
    }
  }

  return { restored, skipped, errors, idMap };
}

async function restoreFavorites(
  userId: string,
  idMap: Map<string, string>
): Promise<{ restored: number; skipped: number }> {
  const [firestoreDocs, currentFavorites] = await Promise.all([
    getDocs(subCol(userId, 'favorites')),
    getFavorites(userId),
  ]);

  // Uma única busca para saber quais já são favoritos
  const currentFavIds = new Set(currentFavorites.map((r) => r.id));
  let restored = 0, skipped = 0;

  for (const snap of firestoreDocs.docs) {
    const { recipeId } = snap.data() as { recipeId: string };
    const mappedId = idMap.get(recipeId) ?? recipeId;

    if (currentFavIds.has(mappedId)) { skipped++; continue; }

    try {
      await toggleFavorite(userId, mappedId);
      restored++;
    } catch {
      // Receita pode não existir ainda — ignora
    }
  }

  return { restored, skipped };
}

async function restoreCollections(
  userId: string,
  idMap: Map<string, string>
): Promise<{ restored: number; skipped: number }> {
  const [firestoreDocs, currentCollections] = await Promise.all([
    getDocs(subCol(userId, 'collections')),
    getCollections(userId),
  ]);

  const existingNames = new Set(currentCollections.map((c) => c.name.toLowerCase()));
  let restored = 0, skipped = 0;

  for (const snap of firestoreDocs.docs) {
    const col = snap.data() as { name: string; recipeIds: string[] };

    if (existingNames.has(col.name.toLowerCase())) { skipped++; continue; }

    try {
      const newColId = await createCollection(userId, col.name);
      for (const oldId of col.recipeIds ?? []) {
        await addToCollection(newColId, idMap.get(oldId) ?? oldId).catch(() => null);
      }
      restored++;
    } catch {
      skipped++;
    }
  }

  return { restored, skipped };
}

async function restoreWeekPlans(
  userId: string,
  idMap: Map<string, string>
): Promise<void> {
  const firestoreDocs = await getDocs(subCol(userId, 'weekPlans'));

  for (const snap of firestoreDocs.docs) {
    const { weekStart, slots } = snap.data() as {
      weekStart: string;
      slots: Record<string, string>;
    };
    if (!weekStart || !slots) continue;

    for (const [key, oldRecipeId] of Object.entries(slots)) {
      const separatorIdx = key.indexOf('_');
      if (separatorIdx === -1) continue;
      const dayIndex = parseInt(key.slice(0, separatorIdx), 10);
      const mealType = key.slice(separatorIdx + 1);
      const mappedId = idMap.get(oldRecipeId) ?? oldRecipeId;
      try {
        await setMeal(userId, weekStart, dayIndex, mealType, mappedId);
      } catch {
        // Receita pode não existir no servidor — ignora
      }
    }
  }
}

export async function restoreAll(userId: string): Promise<RestoreResult> {
  const { restored: rR, skipped: sR, errors, idMap } = await restoreRecipes(userId);

  const favs = await restoreFavorites(userId, idMap);
  const cols = await restoreCollections(userId, idMap);
  await restoreWeekPlans(userId, idMap).catch(() => null);

  return {
    restored: rR + favs.restored + cols.restored,
    skipped: sR + favs.skipped + cols.skipped,
    errors,
  };
}

// ── TIMESTAMP ──────────────────────────────────────────────────────────────────

export async function getLastBackupTimestamp(userId: string): Promise<number | null> {
  try {
    const snap = await getDoc(subDoc(userId, 'settings', 'preferences'));
    return snap.exists() ? (snap.data()?.lastBackup ?? null) : null;
  } catch {
    return null;
  }
}

// ── DELETE BACKUP ──────────────────────────────────────────────────────────────

export async function deleteBackup(userId: string): Promise<void> {
  const collections = ['recipes', 'favorites', 'collections', 'weekPlans'];

  for (const colName of collections) {
    const snap = await getDocs(subCol(userId, colName));
    if (snap.empty) continue;

    // Deleta em chunks de 400 (limite do writeBatch é 500)
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // Remove o timestamp do último backup
  await deleteDoc(subDoc(userId, 'settings', 'preferences')).catch(() => null);
}
