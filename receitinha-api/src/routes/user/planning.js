const { Router } = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../../db');
const auth = require('../../middleware/auth');

const router = Router();
router.use(auth);

const DEFAULT_MEAL_SLOTS = [
  { mealType: 'breakfast', label: 'Café', order: 0 },
  { mealType: 'lunch',     label: 'Almoço', order: 1 },
  { mealType: 'dinner',    label: 'Jantar', order: 2 },
];

async function ensureSlots(userId, weekStart) {
  const { rows } = await pool.query(
    'SELECT 1 FROM user_week_meal_slots WHERE user_id = $1 AND week_start = $2 LIMIT 1',
    [userId, weekStart]
  );
  if (rows.length === 0) {
    for (const s of DEFAULT_MEAL_SLOTS) {
      await pool.query(
        `INSERT INTO user_week_meal_slots (id, user_id, week_start, meal_type, label, slot_order)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [`${userId}_${weekStart}_${s.mealType}`, userId, weekStart, s.mealType, s.label, s.order]
      );
    }
  }
}

// GET /api/user/planning/slots?weekStart=YYYY-MM-DD
router.get('/slots', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) return res.status(400).json({ message: 'weekStart é obrigatório.' });
    await ensureSlots(req.user.uid, weekStart);
    const { rows } = await pool.query(
      'SELECT meal_type, label, slot_order FROM user_week_meal_slots WHERE user_id = $1 AND week_start = $2 ORDER BY slot_order',
      [req.user.uid, weekStart]
    );
    res.json(rows.map(r => ({ mealType: r.meal_type, label: r.label, order: r.slot_order })));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// POST /api/user/planning/slots - add extra meal slot
router.post('/slots', async (req, res) => {
  try {
    const { weekStart, label } = req.body;
    if (!weekStart || !label?.trim()) return res.status(400).json({ message: 'weekStart e label são obrigatórios.' });
    await ensureSlots(req.user.uid, weekStart);
    const { rows: [max] } = await pool.query(
      'SELECT MAX(slot_order) as max_order FROM user_week_meal_slots WHERE user_id = $1 AND week_start = $2',
      [req.user.uid, weekStart]
    );
    const newOrder = (max?.max_order ?? 2) + 1;
    const mealType = `extra_${Date.now()}`;
    await pool.query(
      'INSERT INTO user_week_meal_slots (id, user_id, week_start, meal_type, label, slot_order) VALUES ($1,$2,$3,$4,$5,$6)',
      [`${req.user.uid}_${weekStart}_${mealType}`, req.user.uid, weekStart, mealType, label.trim(), newOrder]
    );
    const { rows } = await pool.query(
      'SELECT meal_type, label, slot_order FROM user_week_meal_slots WHERE user_id = $1 AND week_start = $2 ORDER BY slot_order',
      [req.user.uid, weekStart]
    );
    res.json(rows.map(r => ({ mealType: r.meal_type, label: r.label, order: r.slot_order })));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// DELETE /api/user/planning/slots/:mealType?weekStart=YYYY-MM-DD
router.delete('/slots/:mealType', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) return res.status(400).json({ message: 'weekStart é obrigatório.' });
    await pool.query(
      'DELETE FROM user_week_meal_slots WHERE user_id = $1 AND week_start = $2 AND meal_type = $3',
      [req.user.uid, weekStart, req.params.mealType]
    );
    await pool.query(
      'DELETE FROM user_week_plan WHERE user_id = $1 AND week_start = $2 AND meal_type = $3',
      [req.user.uid, weekStart, req.params.mealType]
    );
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// PUT /api/user/planning/slots/reorder - body: { weekStart, orderedTypes: string[] }
router.put('/slots/reorder', async (req, res) => {
  try {
    const { weekStart, orderedTypes } = req.body;
    if (!weekStart || !Array.isArray(orderedTypes)) return res.status(400).json({ message: 'Parâmetros inválidos.' });
    for (let i = 0; i < orderedTypes.length; i++) {
      await pool.query(
        'UPDATE user_week_meal_slots SET slot_order = $1 WHERE user_id = $2 AND week_start = $3 AND meal_type = $4',
        [i, req.user.uid, weekStart, orderedTypes[i]]
      );
    }
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// GET /api/user/planning?weekStart=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) return res.status(400).json({ message: 'weekStart é obrigatório.' });
    await ensureSlots(req.user.uid, weekStart);
    const { rows } = await pool.query(
      `SELECT wp.day_index, wp.meal_type, wp.recipe_id,
              r.title, r.description, r.prep_time, r.servings, r.category, r.photo_url, r.is_public, r.created_at
       FROM user_week_plan wp
       LEFT JOIN user_recipes r ON r.id = wp.recipe_id
       WHERE wp.user_id = $1 AND wp.week_start = $2`,
      [req.user.uid, weekStart]
    );
    // Return as { dayIndex: { mealType: recipe } }
    const plan = {};
    for (let i = 0; i < 7; i++) plan[i] = {};
    for (const row of rows) {
      plan[row.day_index][row.meal_type] = row.title ? {
        id: row.recipe_id, userId: req.user.uid, title: row.title,
        description: row.description ?? '', prepTime: row.prep_time,
        servings: row.servings, category: row.category ?? '',
        photoUrl: row.photo_url ?? null, is_public: row.is_public ? 1 : 0,
        createdAt: row.created_at,
      } : null;
    }
    res.json(plan);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// PUT /api/user/planning/meal - set a meal
router.put('/meal', async (req, res) => {
  try {
    const { weekStart, dayIndex, mealType, recipeId } = req.body;
    if (!weekStart || dayIndex === undefined || !mealType || !recipeId)
      return res.status(400).json({ message: 'Parâmetros inválidos.' });
    const id = `${req.user.uid}_${weekStart}_${dayIndex}_${mealType}`;
    await pool.query(
      `INSERT INTO user_week_plan (id, user_id, week_start, day_index, meal_type, recipe_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, week_start, day_index, meal_type) DO UPDATE SET recipe_id = EXCLUDED.recipe_id`,
      [id, req.user.uid, weekStart, dayIndex, mealType, recipeId]
    );
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

// DELETE /api/user/planning/meal - remove a meal
router.delete('/meal', async (req, res) => {
  try {
    const { weekStart, dayIndex, mealType } = req.body;
    if (!weekStart || dayIndex === undefined || !mealType)
      return res.status(400).json({ message: 'Parâmetros inválidos.' });
    await pool.query(
      'DELETE FROM user_week_plan WHERE user_id = $1 AND week_start = $2 AND day_index = $3 AND meal_type = $4',
      [req.user.uid, weekStart, dayIndex, mealType]
    );
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erro interno.' }); }
});

module.exports = router;
