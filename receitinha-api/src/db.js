const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id          TEXT PRIMARY KEY,
      local_id    TEXT NOT NULL,
      author_id   TEXT NOT NULL,
      author_name TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT,
      category    TEXT,
      prep_time   INTEGER DEFAULT 0,
      servings    INTEGER DEFAULT 1,
      photo_url   TEXT,
      ingredients JSONB NOT NULL DEFAULT '[]',
      steps       JSONB NOT NULL DEFAULT '[]',
      flag_count  INTEGER NOT NULL DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(author_id, local_id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id          TEXT PRIMARY KEY,
      recipe_id   TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL,
      author_name TEXT NOT NULL,
      stars       INTEGER NOT NULL CHECK(stars >= 0 AND stars <= 5),
      comment     TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(recipe_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_created ON recipes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ratings_recipe  ON ratings(recipe_id);

    -- ── Receitas do usuário ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_recipes (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      prep_time   INTEGER DEFAULT 0,
      servings    INTEGER DEFAULT 1,
      category    TEXT DEFAULT '',
      photo_url   TEXT,
      is_public   BOOLEAN DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_ingredients (
      id          TEXT PRIMARY KEY,
      recipe_id   TEXT NOT NULL REFERENCES user_recipes(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      quantity    REAL DEFAULT 0,
      unit        TEXT DEFAULT '',
      sort_order  INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_steps (
      id            TEXT PRIMARY KEY,
      recipe_id     TEXT NOT NULL REFERENCES user_recipes(id) ON DELETE CASCADE,
      instruction   TEXT NOT NULL,
      timer_minutes INTEGER,
      sort_order    INTEGER DEFAULT 0
    );

    -- ── Favoritos e coleções ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_favorites (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      recipe_id  TEXT NOT NULL REFERENCES user_recipes(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, recipe_id)
    );

    CREATE TABLE IF NOT EXISTS user_collections (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      name       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_collection_recipes (
      collection_id TEXT NOT NULL REFERENCES user_collections(id) ON DELETE CASCADE,
      recipe_id     TEXT NOT NULL REFERENCES user_recipes(id) ON DELETE CASCADE,
      PRIMARY KEY (collection_id, recipe_id)
    );

    -- ── Categorias ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_categories (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      name       TEXT NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      is_active  BOOLEAN DEFAULT TRUE
    );

    -- ── Histórico de preparo ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_cooking_history (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      recipe_id  TEXT REFERENCES user_recipes(id) ON DELETE SET NULL,
      cooked_at  TIMESTAMPTZ DEFAULT NOW(),
      notes      TEXT
    );

    -- ── Listas de compras ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_shopping_lists (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      name       TEXT NOT NULL,
      is_active  BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_shopping_items (
      id         TEXT PRIMARY KEY,
      list_id    TEXT NOT NULL REFERENCES user_shopping_lists(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      quantity   REAL,
      unit       TEXT,
      category   TEXT DEFAULT 'Outros',
      is_checked BOOLEAN DEFAULT FALSE,
      added_at   TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Planejamento semanal ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_week_plan (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      week_start TEXT NOT NULL,
      day_index  INTEGER NOT NULL,
      meal_type  TEXT NOT NULL,
      recipe_id  TEXT REFERENCES user_recipes(id) ON DELETE CASCADE,
      UNIQUE(user_id, week_start, day_index, meal_type)
    );

    CREATE TABLE IF NOT EXISTS user_week_meal_slots (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      week_start TEXT NOT NULL,
      meal_type  TEXT NOT NULL,
      label      TEXT NOT NULL,
      slot_order INTEGER DEFAULT 0,
      UNIQUE(user_id, week_start, meal_type)
    );

    CREATE INDEX IF NOT EXISTS idx_ur_user     ON user_recipes(user_id);
    CREATE INDEX IF NOT EXISTS idx_uh_user     ON user_cooking_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_usl_user    ON user_shopping_lists(user_id);
    CREATE INDEX IF NOT EXISTS idx_uwp_user    ON user_week_plan(user_id, week_start);
  `);

  // Migration: add video_url column to user_recipes if not exists
  await pool.query(`
    ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS video_url TEXT;
  `);

  // Migration: add price column to user_shopping_items if not exists
  await pool.query(`
    ALTER TABLE user_shopping_items ADD COLUMN IF NOT EXISTS price REAL DEFAULT NULL;
  `);

  // Migration: persistent spending records (survives list deletion)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_spending_records (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      item_name    TEXT NOT NULL,
      category     TEXT DEFAULT 'Outros',
      price        REAL NOT NULL,
      list_name    TEXT,
      list_id      TEXT,
      recorded_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_usp_user ON user_spending_records(user_id, recorded_at DESC);
  `);

  // Migration: troca ON DELETE CASCADE → SET NULL em user_week_plan.recipe_id
  // Isso evita que deletar uma receita remova as entradas do plano semanal.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'user_week_plan'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND rc.delete_rule = 'CASCADE'
      ) THEN
        ALTER TABLE user_week_plan
          DROP CONSTRAINT IF EXISTS user_week_plan_recipe_id_fkey;
        ALTER TABLE user_week_plan
          ADD CONSTRAINT user_week_plan_recipe_id_fkey
          FOREIGN KEY (recipe_id) REFERENCES user_recipes(id) ON DELETE SET NULL;
      END IF;
    END$$;
  `);
}

module.exports = { pool, init };
