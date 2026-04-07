const { Router } = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../../db');
const auth = require('../../middleware/auth');

const router = Router();
router.use(auth);

function mapRecipe(r) {
  return { id: r.id, userId: r.user_id, title: r.title, description: r.description ?? '',
    prepTime: r.prep_time, servings: r.servings, category: r.category ?? '',
    photoUrl: r.photo_url ?? null, is_public: r.is_public ? 1 : 0, createdAt: r.created_at };
}

// GET /api/user/favorites
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.* FROM user_recipes r
       INNER JOIN user_favorites f ON r.id = f.recipe_id
       WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
      [req.user.uid]
    );
    res.json(rows.map(mapRecipe));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// GET /api/user/favorites/:recipeId/check
router.get('/:recipeId/check', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM user_favorites WHERE user_id = $1 AND recipe_id = $2',
      [req.user.uid, req.params.recipeId]
    );
    res.json({ isFavorite: rows.length > 0 });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// POST /api/user/favorites/:recipeId/toggle
router.post('/:recipeId/toggle', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND recipe_id = $2',
      [req.user.uid, req.params.recipeId]
    );
    if (rows[0]) {
      await pool.query('DELETE FROM user_favorites WHERE user_id = $1 AND recipe_id = $2',
        [req.user.uid, req.params.recipeId]);
      return res.json({ isFavorite: false });
    }
    await pool.query(
      'INSERT INTO user_favorites (id, user_id, recipe_id) VALUES ($1,$2,$3)',
      [randomUUID(), req.user.uid, req.params.recipeId]
    );
    res.json({ isFavorite: true });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// GET /api/user/collections
router.get('/collections', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_collections WHERE user_id = $1 ORDER BY created_at DESC', [req.user.uid]
    );
    const collections = await Promise.all(rows.map(async (col) => {
      const { rows: rIds } = await pool.query(
        'SELECT recipe_id FROM user_collection_recipes WHERE collection_id = $1', [col.id]
      );
      return { id: col.id, userId: col.user_id, name: col.name,
        createdAt: col.created_at, recipeIds: rIds.map(r => r.recipe_id) };
    }));
    res.json(collections);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// POST /api/user/collections
router.post('/collections', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
    const id = randomUUID();
    await pool.query('INSERT INTO user_collections (id, user_id, name) VALUES ($1,$2,$3)',
      [id, req.user.uid, name.trim()]);
    res.status(201).json({ id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// PUT /api/user/collections/:id
router.put('/collections/:id', async (req, res) => {
  try {
    const { name } = req.body;
    await pool.query('UPDATE user_collections SET name = $1 WHERE id = $2 AND user_id = $3',
      [name.trim(), req.params.id, req.user.uid]);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// DELETE /api/user/collections/:id
router.delete('/collections/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM user_collections WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.uid]);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// Helper: verifica que a coleção pertence ao usuário autenticado
async function requireCollectionOwnership(collectionId, userId, res) {
  const { rows: [col] } = await pool.query(
    'SELECT id FROM user_collections WHERE id = $1 AND user_id = $2', [collectionId, userId]
  );
  if (!col) { res.status(403).json({ message: 'Sem permissão.' }); return false; }
  return true;
}

// GET /api/user/collections/:id/recipes
router.get('/collections/:id/recipes', async (req, res) => {
  try {
    if (!await requireCollectionOwnership(req.params.id, req.user.uid, res)) return;
    const { rows } = await pool.query(
      `SELECT r.* FROM user_recipes r
       INNER JOIN user_collection_recipes cr ON r.id = cr.recipe_id
       WHERE cr.collection_id = $1`,
      [req.params.id]
    );
    res.json(rows.map(mapRecipe));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// POST /api/user/collections/:id/recipes/:recipeId
router.post('/collections/:id/recipes/:recipeId', async (req, res) => {
  try {
    if (!await requireCollectionOwnership(req.params.id, req.user.uid, res)) return;
    await pool.query(
      'INSERT INTO user_collection_recipes (collection_id, recipe_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, req.params.recipeId]
    );
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// DELETE /api/user/collections/:id/recipes/:recipeId
router.delete('/collections/:id/recipes/:recipeId', async (req, res) => {
  try {
    if (!await requireCollectionOwnership(req.params.id, req.user.uid, res)) return;
    await pool.query('DELETE FROM user_collection_recipes WHERE collection_id=$1 AND recipe_id=$2',
      [req.params.id, req.params.recipeId]);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

module.exports = router;
