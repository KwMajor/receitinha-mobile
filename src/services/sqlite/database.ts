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

      CREATE TABLE IF NOT EXISTS barcode_cache (
        barcode TEXT PRIMARY KEY, product_name TEXT, cached_at INTEGER
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
