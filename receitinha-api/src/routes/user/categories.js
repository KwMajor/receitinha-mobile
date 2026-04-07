const { Router } = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../../db');
const auth = require('../../middleware/auth');

const router = Router();
router.use(auth);

const DEFAULT_CATEGORIES = [
  'Café da Manhã', 'Almoço', 'Jantar', 'Sobremesas', 'Snacks', 'Fit', 'Bebidas'
];

async function ensureDefaults(userId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM user_categories WHERE user_id = $1 AND is_default = TRUE LIMIT 1', [userId]
  );
  if (rows.length === 0) {
    for (const name of DEFAULT_CATEGORIES) {
      await pool.query(
        'INSERT INTO user_categories (id, user_id, name, is_default, is_active) VALUES ($1,$2,$3,TRUE,TRUE)',
        [randomUUID(), userId, name]
      );
    }
  }
}

// GET /api/user/categories
router.get('/', async (req, res) => {
  try {
    await ensureDefaults(req.user.uid);
    const { rows } = await pool.query(
      'SELECT * FROM user_categories WHERE user_id = $1 ORDER BY is_default DESC, name ASC',
      [req.user.uid]
    );
    res.json(rows.map(r => ({
      id: r.id, userId: r.user_id, name: r.name,
      isActive: r.is_active, isCustom: !r.is_default,
    })));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// POST /api/user/categories
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
    const id = randomUUID();
    await pool.query(
      'INSERT INTO user_categories (id, user_id, name, is_default, is_active) VALUES ($1,$2,$3,FALSE,TRUE)',
      [id, req.user.uid, name.trim()]
    );
    res.status(201).json({ id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// PATCH /api/user/categories/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { isActive } = req.body;
    if (!isActive) {
      const { rows: [cat] } = await pool.query(
        'SELECT name FROM user_categories WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]
      );
      if (cat) {
        const { rows } = await pool.query(
          'SELECT 1 FROM user_recipes WHERE category = $1 AND user_id = $2 LIMIT 1',
          [cat.name, req.user.uid]
        );
        if (rows.length > 0) return res.status(409).json({ message: 'Categoria em uso.' });
      }
    }
    await pool.query(
      'UPDATE user_categories SET is_active = $1 WHERE id = $2 AND user_id = $3',
      [isActive, req.params.id, req.user.uid]
    );
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// DELETE /api/user/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [cat] } = await pool.query(
      'SELECT name, is_default FROM user_categories WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.uid]
    );
    if (!cat) return res.status(404).json({ message: 'Categoria não encontrada.' });
    if (cat.is_default) return res.status(403).json({ message: 'Não é possível apagar categorias padrão.' });
    const { rows } = await pool.query(
      'SELECT 1 FROM user_recipes WHERE category = $1 AND user_id = $2 LIMIT 1',
      [cat.name, req.user.uid]
    );
    if (rows.length > 0) return res.status(409).json({ message: 'Categoria em uso por uma receita.' });
    await pool.query('DELETE FROM user_categories WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

module.exports = router;
