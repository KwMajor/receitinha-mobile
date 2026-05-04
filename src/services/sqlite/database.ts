import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('receitinha.db', { enableChangeListener: false });
  }
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync().catch(() => {});
    db = null;
  }
};

export const initDatabase = async (): Promise<void> => {
  try {
    const database = await getDatabase();

    await database.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS barcode_cache (
        barcode TEXT PRIMARY KEY, product_name TEXT, cached_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS pantry (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        ingredient_name TEXT NOT NULL,
        quantity REAL,
        unit TEXT,
        added_at INTEGER NOT NULL,
        UNIQUE(user_id, ingredient_name)
      );
    `);

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
