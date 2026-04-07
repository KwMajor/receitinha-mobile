const { Router } = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getStats(recipeId) {
  const { rows } = await pool.query(
    'SELECT COALESCE(AVG(stars), 0) AS avg, COUNT(*) AS count FROM ratings WHERE recipe_id = $1',
    [recipeId]
  );
  return {
    averageRating: Math.round(parseFloat(rows[0].avg) * 10) / 10,
    ratingCount: parseInt(rows[0].count),
  };
}

async function formatRecipe(row) {
  const stats = await getStats(row.id);
  return {
    id: row.id,
    localId: row.local_id,
    userId: row.author_id,
    authorId: row.author_id,
    authorName: row.author_name,
    title: row.title,
    description: row.description ?? '',
    category: row.category ?? '',
    prepTime: row.prep_time ?? 0,
    servings: row.servings ?? 1,
    photoUrl: row.photo_url ?? null,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    is_public: 1,
    createdAt: row.created_at,
    ...stats,
  };
}

// ── GET /api/recipes/feed ─────────────────────────────────────────────────────

router.get('/feed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    let rows;
    if (cursor) {
      ({ rows } = await pool.query(
        `SELECT * FROM recipes WHERE is_active = TRUE AND created_at < $1
         ORDER BY created_at DESC LIMIT $2`,
        [cursor, limit + 1]
      ));
    } else {
      ({ rows } = await pool.query(
        `SELECT * FROM recipes WHERE is_active = TRUE
         ORDER BY created_at DESC LIMIT $1`,
        [limit + 1]
      ));
    }

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].created_at : null;
    const recipes = await Promise.all(page.map(formatRecipe));

    res.json({ recipes, nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno.' });
  }
});

// ── GET /api/recipes/:id ──────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM recipes WHERE id = $1 AND is_active = TRUE',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Receita não encontrada.' });
    res.json(await formatRecipe(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno.' });
  }
});

// ── POST /api/recipes ─────────────────────────────────────────────────────────

router.post('/', auth, async (req, res) => {
  try {
    const { localId, title, description, category, prepTime, servings, photoUrl, ingredients, steps } =
      req.body;

    if (!title?.trim()) return res.status(400).json({ message: 'Título é obrigatório.' });

    const { rows: existing } = await pool.query(
      'SELECT id FROM recipes WHERE author_id = $1 AND local_id = $2',
      [req.user.uid, localId]
    );

    if (existing[0]) {
      const { rows } = await pool.query(
        `UPDATE recipes SET
          title = $1, description = $2, category = $3, prep_time = $4,
          servings = $5, photo_url = $6, ingredients = $7, steps = $8,
          author_name = $9, is_active = TRUE, updated_at = NOW()
         WHERE id = $10 RETURNING *`,
        [
          title.trim(), description ?? '', category ?? '', prepTime ?? 0,
          servings ?? 1, photoUrl ?? null,
          JSON.stringify(ingredients ?? []), JSON.stringify(steps ?? []),
          req.user.name, existing[0].id,
        ]
      );
      return res.json(await formatRecipe(rows[0]));
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO recipes
        (id, local_id, author_id, author_name, title, description, category,
         prep_time, servings, photo_url, ingredients, steps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        id, localId ?? id, req.user.uid, req.user.name, title.trim(),
        description ?? '', category ?? '', prepTime ?? 0, servings ?? 1,
        photoUrl ?? null,
        JSON.stringify(ingredients ?? []), JSON.stringify(steps ?? []),
      ]
    );
    res.status(201).json(await formatRecipe(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno.' });
  }
});

// ── DELETE /api/recipes/:id/publish ──────────────────────────────────────────

router.delete('/:id/publish', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT author_id FROM recipes WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Receita não encontrada.' });
    if (rows[0].author_id !== req.user.uid) return res.status(403).json({ message: 'Sem permissão.' });

    await pool.query('UPDATE recipes SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno.' });
  }
});

// ── GET /api/recipes/:id/ratings ─────────────────────────────────────────────

router.get('/:id/ratings', auth, async (req, res) => {
  try {
    if (req.query.userId === 'me') {
      const { rows } = await pool.query(
        'SELECT * FROM ratings WHERE recipe_id = $1 AND user_id = $2',
        [req.params.id, req.user.uid]
      );
      return res.json(rows[0] ?? null);
    }

    const limit = Math.min(parseInt(req.query.limit) || 15, 50);
    const cursor = req.query.cursor;

    let rows;
    if (cursor) {
      ({ rows } = await pool.query(
        `SELECT * FROM ratings WHERE recipe_id = $1 AND created_at < $2
         ORDER BY created_at DESC LIMIT $3`,
        [req.params.id, cursor, limit + 1]
      ));
    } else {
      ({ rows } = await pool.query(
        `SELECT * FROM ratings WHERE recipe_id = $1
         ORDER BY created_at DESC LIMIT $2`,
        [req.params.id, limit + 1]
      ));
    }

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].created_at : null;

    res.json({ ratings: page, nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno.' });
  }
});

// ── POST /api/recipes/:id/ratings ────────────────────────────────────────────

router.post('/:id/ratings', auth, async (req, res) => {
  try {
    const { rows: recipe } = await pool.query(
      'SELECT id FROM recipes WHERE id = $1 AND is_active = TRUE',
      [req.params.id]
    );
    if (!recipe[0]) return res.status(404).json({ message: 'Receita não encontrada.' });

    const { stars, comment } = req.body;
    if (typeof stars !== 'number' || stars < 0 || stars > 5) {
      return res.status(400).json({ message: 'Estrelas deve ser entre 0 e 5.' });
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM ratings WHERE recipe_id = $1 AND user_id = $2',
      [req.params.id, req.user.uid]
    );

    if (existing[0]) {
      const { rows } = await pool.query(
        'UPDATE ratings SET stars = $1, comment = $2, author_name = $3 WHERE id = $4 RETURNING *',
        [stars, comment ?? null, req.user.name, existing[0].id]
      );
      return res.json(rows[0]);
    }

    const { rows } = await pool.query(
      `INSERT INTO ratings (id, recipe_id, user_id, author_name, stars, comment)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [randomUUID(), req.params.id, req.user.uid, req.user.name, stars, comment ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno.' });
  }
});

// ── POST /api/recipes/:id/flag ────────────────────────────────────────────────

router.post('/:id/flag', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE recipes SET flag_count = flag_count + 1,
        is_active = CASE WHEN flag_count + 1 >= 10 THEN FALSE ELSE is_active END
       WHERE id = $1 AND is_active = TRUE RETURNING id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Receita não encontrada.' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno.' });
  }
});

module.exports = router;
