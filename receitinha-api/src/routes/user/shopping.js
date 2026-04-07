const { Router } = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../../db');
const auth = require('../../middleware/auth');

const router = Router();
router.use(auth);

function mapList(l, itemCount = 0, pendingCount = 0) {
  return {
    id: l.id, userId: l.user_id, name: l.name,
    isActive: l.is_active, createdAt: l.created_at,
    itemCount, pendingCount,
  };
}

function mapItem(i) {
  return {
    id: i.id, listId: i.list_id, name: i.name,
    quantity: i.quantity ?? undefined, unit: i.unit ?? undefined,
    category: i.category, isChecked: i.is_checked, addedAt: i.added_at,
  };
}

// GET /api/user/shopping/lists
router.get('/lists', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_shopping_lists WHERE user_id = $1 ORDER BY created_at DESC', [req.user.uid]
    );
    const lists = await Promise.all(rows.map(async (l) => {
      const { rows: [counts] } = await pool.query(
        `SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_checked = FALSE) as pending
         FROM user_shopping_items WHERE list_id = $1`, [l.id]
      );
      return mapList(l, parseInt(counts.total), parseInt(counts.pending));
    }));
    res.json(lists);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// POST /api/user/shopping/lists
router.post('/lists', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
    const id = randomUUID();
    await pool.query(
      'INSERT INTO user_shopping_lists (id, user_id, name, is_active) VALUES ($1,$2,$3,FALSE)',
      [id, req.user.uid, name.trim()]
    );
    res.status(201).json({ id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// PUT /api/user/shopping/lists/:id
router.put('/lists/:id', async (req, res) => {
  try {
    const { name } = req.body;
    await pool.query(
      'UPDATE user_shopping_lists SET name = $1 WHERE id = $2 AND user_id = $3',
      [name.trim(), req.params.id, req.user.uid]
    );
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// DELETE /api/user/shopping/lists/:id
router.delete('/lists/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM user_shopping_lists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.uid]);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// PATCH /api/user/shopping/lists/:id/activate
router.patch('/lists/:id/activate', async (req, res) => {
  try {
    await pool.query('UPDATE user_shopping_lists SET is_active = FALSE WHERE user_id = $1', [req.user.uid]);
    await pool.query('UPDATE user_shopping_lists SET is_active = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.uid]);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// GET /api/user/shopping/lists/active
router.get('/lists/active', async (req, res) => {
  try {
    const { rows: [row] } = await pool.query(
      'SELECT id FROM user_shopping_lists WHERE user_id = $1 AND is_active = TRUE LIMIT 1', [req.user.uid]
    );
    res.json({ id: row?.id ?? null });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// GET /api/user/shopping/lists/:id/items
router.get('/lists/:id/items', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_shopping_items WHERE list_id = $1 ORDER BY category ASC, name ASC',
      [req.params.id]
    );
    res.json(rows.map(mapItem));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// Helper: verifica que a lista pertence ao usuário autenticado
async function requireListOwnership(listId, userId, res) {
  const { rows: [list] } = await pool.query(
    'SELECT user_id FROM user_shopping_lists WHERE id = $1', [listId]
  );
  if (!list) { res.status(404).json({ message: 'Lista não encontrada.' }); return false; }
  if (list.user_id !== userId) { res.status(403).json({ message: 'Sem permissão.' }); return false; }
  return true;
}

// Helper: verifica que o item pertence ao usuário autenticado
async function requireItemOwnership(itemId, userId, res) {
  const { rows: [item] } = await pool.query(
    `SELECT sl.user_id FROM user_shopping_items si
     JOIN user_shopping_lists sl ON sl.id = si.list_id
     WHERE si.id = $1`, [itemId]
  );
  if (!item) { res.status(404).json({ message: 'Item não encontrado.' }); return false; }
  if (item.user_id !== userId) { res.status(403).json({ message: 'Sem permissão.' }); return false; }
  return true;
}

// POST /api/user/shopping/lists/:id/items
router.post('/lists/:id/items', async (req, res) => {
  try {
    if (!await requireListOwnership(req.params.id, req.user.uid, res)) return;
    const { name, quantity, unit, category } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
    const id = randomUUID();
    await pool.query(
      'INSERT INTO user_shopping_items (id, list_id, name, quantity, unit, category, is_checked) VALUES ($1,$2,$3,$4,$5,$6,FALSE)',
      [id, req.params.id, name.trim(), quantity ?? null, unit ?? null, category ?? 'Outros']
    );
    res.status(201).json({ id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// PATCH /api/user/shopping/items/:id/toggle
router.patch('/items/:id/toggle', async (req, res) => {
  try {
    if (!await requireItemOwnership(req.params.id, req.user.uid, res)) return;
    await pool.query(
      'UPDATE user_shopping_items SET is_checked = NOT is_checked WHERE id = $1', [req.params.id]
    );
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// DELETE /api/user/shopping/items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    if (!await requireItemOwnership(req.params.id, req.user.uid, res)) return;
    await pool.query('DELETE FROM user_shopping_items WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// DELETE /api/user/shopping/lists/:id/checked
router.delete('/lists/:id/checked', async (req, res) => {
  try {
    if (!await requireListOwnership(req.params.id, req.user.uid, res)) return;
    await pool.query('DELETE FROM user_shopping_items WHERE list_id = $1 AND is_checked = TRUE', [req.params.id]);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// POST /api/user/shopping/generate - generate list from week plan
router.post('/generate', async (req, res) => {
  try {
    const { weekStart } = req.body;
    if (!weekStart) return res.status(400).json({ message: 'weekStart é obrigatório.' });

    const { rows: planRows } = await pool.query(
      'SELECT DISTINCT recipe_id FROM user_week_plan WHERE user_id = $1 AND week_start = $2',
      [req.user.uid, weekStart]
    );

    const [day, month] = weekStart.slice(5).split('-');
    const listId = randomUUID();
    await pool.query(
      'INSERT INTO user_shopping_lists (id, user_id, name, is_active) VALUES ($1,$2,$3,FALSE)',
      [listId, req.user.uid, `Semana ${day}/${month}`]
    );

    if (planRows.length > 0) {
      const recipeIds = planRows.map(r => r.recipe_id);
      const ph = recipeIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: ings } = await pool.query(
        `SELECT name, quantity, unit FROM user_ingredients WHERE recipe_id IN (${ph})`, recipeIds
      );

      const aggregated = new Map();
      for (const ing of ings) {
        const key = ing.name.trim().toLowerCase();
        const unit = (ing.unit ?? '').trim().toLowerCase();
        if (!aggregated.has(key)) aggregated.set(key, { name: ing.name.trim(), quantities: new Map() });
        const entry = aggregated.get(key);
        entry.quantities.set(unit, (entry.quantities.get(unit) ?? 0) + (ing.quantity ?? 0));
      }

      for (const [, item] of aggregated) {
        for (const [unit, qty] of item.quantities) {
          await pool.query(
            'INSERT INTO user_shopping_items (id, list_id, name, quantity, unit, category, is_checked) VALUES ($1,$2,$3,$4,$5,$6,FALSE)',
            [randomUUID(), listId, item.name, qty > 0 ? qty : null, unit || null, 'Outros']
          );
        }
      }
    }

    res.status(201).json({ id: listId });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

module.exports = router;
