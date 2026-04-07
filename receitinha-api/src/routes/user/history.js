const { Router } = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../../db');
const auth = require('../../middleware/auth');

const router = Router();
router.use(auth);

// GET /api/user/history
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { rows } = await pool.query(
      `SELECT ch.id, ch.user_id, ch.recipe_id, ch.cooked_at, ch.notes,
              r.title, r.photo_url, r.category
       FROM user_cooking_history ch
       LEFT JOIN user_recipes r ON r.id = ch.recipe_id
       WHERE ch.user_id = $1
       ORDER BY ch.cooked_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.uid, limit, offset]
    );
    res.json(rows.map(r => ({
      id: r.id, userId: r.user_id, recipeId: r.recipe_id,
      cookedAt: r.cooked_at, notes: r.notes ?? undefined,
      recipe: r.title ? { id: r.recipe_id, title: r.title, photoUrl: r.photo_url ?? null, category: r.category ?? '' } : undefined,
    })));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// POST /api/user/history
router.post('/', async (req, res) => {
  try {
    const { recipeId, notes } = req.body;
    if (!recipeId) return res.status(400).json({ message: 'recipeId é obrigatório.' });
    const id = randomUUID();
    await pool.query(
      'INSERT INTO user_cooking_history (id, user_id, recipe_id, notes) VALUES ($1,$2,$3,$4)',
      [id, req.user.uid, recipeId, notes ?? null]
    );
    res.status(201).json({ id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// DELETE /api/user/history/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM user_cooking_history WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.uid]);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// GET /api/user/history/stats/:recipeId
router.get('/stats/:recipeId', async (req, res) => {
  try {
    const { rows: [row] } = await pool.query(
      'SELECT COUNT(*) as count, MAX(cooked_at) as last FROM user_cooking_history WHERE user_id = $1 AND recipe_id = $2',
      [req.user.uid, req.params.recipeId]
    );
    res.json({ timesCooked: parseInt(row.count), lastCooked: row.last ?? null });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// GET /api/user/history/count
router.get('/count', async (req, res) => {
  try {
    const { rows: [row] } = await pool.query(
      'SELECT COUNT(*) as count FROM user_cooking_history WHERE user_id = $1', [req.user.uid]
    );
    res.json({ count: parseInt(row.count) });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

module.exports = router;
