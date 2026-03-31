import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('receitinha.db');
  }
  return db;
};

export const initDatabase = async (): Promise<void> => {
  try {
    const database = await getDatabase();
    
    await database.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, name TEXT, email TEXT, created_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT,
        prep_time INTEGER, servings INTEGER, category TEXT, photo_url TEXT,
        is_public INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY, recipe_id TEXT, quantity REAL, unit TEXT, name TEXT, "order" INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS steps (
        id TEXT PRIMARY KEY, recipe_id TEXT, instruction TEXT, timer_minutes INTEGER, "order" INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY, user_id TEXT, recipe_id TEXT, created_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY, user_id TEXT, name TEXT, created_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS collection_recipes (
        collection_id TEXT, recipe_id TEXT, PRIMARY KEY (collection_id, recipe_id)
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY, user_id TEXT, name TEXT, is_default INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1
      );
      
      CREATE TABLE IF NOT EXISTS cooking_history (
        id TEXT PRIMARY KEY, user_id TEXT, recipe_id TEXT, cooked_at INTEGER, notes TEXT
      );
      
      CREATE TABLE IF NOT EXISTS barcode_cache (
        barcode TEXT PRIMARY KEY, product_name TEXT, cached_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS shopping_lists (
        id TEXT PRIMARY KEY, user_id TEXT, name TEXT,
        is_active INTEGER DEFAULT 0, created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS shopping_items (
        id TEXT PRIMARY KEY, list_id TEXT, name TEXT,
        quantity REAL, unit TEXT, category TEXT,
        is_checked INTEGER DEFAULT 0, added_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS week_plan (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        week_start TEXT,
        day_index INTEGER,
        meal_type TEXT,
        recipe_id TEXT,
        UNIQUE(user_id, week_start, day_index, meal_type)
      );

      CREATE TABLE IF NOT EXISTS week_meal_slots (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        week_start TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        label TEXT NOT NULL,
        slot_order INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, week_start, meal_type)
      );
    `);
    
    // Migração: adiciona is_active se não existir
    const categoryColumns = await database.getAllAsync("PRAGMA table_info(categories)") as any[];
    if (!categoryColumns.some((c: any) => c.name === 'is_active')) {
      await database.execAsync('ALTER TABLE categories ADD COLUMN is_active INTEGER DEFAULT 1');
    }

    // Migração: adiciona brand ao barcode_cache se não existir
    const barcodeColumns = await database.getAllAsync("PRAGMA table_info(barcode_cache)") as any[];
    if (!barcodeColumns.some((c: any) => c.name === 'brand')) {
      await database.execAsync('ALTER TABLE barcode_cache ADD COLUMN brand TEXT');
    }

    console.log('✅ Banco de dados inicializado com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao inicializar o banco de dados:', error);
    throw error;
  }
};
