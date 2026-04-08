const { Router } = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../../db');
const auth = require('../../middleware/auth');

const router = Router();
router.use(auth);

function mapRecipe(r) {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description ?? '',
    prepTime: r.prep_time,
    servings: r.servings,
    category: r.category ?? '',
    photoUrl: r.photo_url ?? null,
    is_public: r.is_public ? 1 : 0,
    createdAt: r.created_at,
  };
}

async function fetchFull(recipeId) {
  const { rows: [r] } = await pool.query('SELECT * FROM user_recipes WHERE id = $1', [recipeId]);
  if (!r) return null;
  const { rows: ings } = await pool.query(
    'SELECT * FROM user_ingredients WHERE recipe_id = $1 ORDER BY sort_order', [recipeId]
  );
  const { rows: steps } = await pool.query(
    'SELECT * FROM user_steps WHERE recipe_id = $1 ORDER BY sort_order', [recipeId]
  );
  return {
    ...mapRecipe(r),
    ingredients: ings.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, order: i.sort_order })),
    steps: steps.map(s => ({ id: s.id, instruction: s.instruction, timer_minutes: s.timer_minutes, order: s.sort_order })),
  };
}

// GET /api/user/recipes
router.get('/', async (req, res) => {
  try {
    const { query, maxPrepTime } = req.query;
    const categories = req.query['categories[]'] || req.query.categories;
    const cats = categories ? (Array.isArray(categories) ? categories : [categories]) : [];

    let sql = 'SELECT DISTINCT r.* FROM user_recipes r WHERE r.user_id = $1';
    const params = [req.user.uid];
    let i = 2;

    if (query && typeof query === 'string') {
      const safeQuery = query.trim().slice(0, 200);
      sql += ` AND (r.title ILIKE $${i} OR EXISTS (
        SELECT 1 FROM user_ingredients ing WHERE ing.recipe_id = r.id AND ing.name ILIKE $${i}
      ))`;
      params.push(`%${safeQuery}%`); i++;
    }
    const validCats = Array.isArray(cats)
      ? cats.filter(c => typeof c === 'string' && c.trim().length > 0).slice(0, 50)
      : [];
    if (validCats.length) {
      const ph = validCats.map((_, j) => `$${i + j}`).join(',');
      sql += ` AND r.category IN (${ph})`;
      params.push(...validCats); i += validCats.length;
    }
    const prepTimeNum = parseInt(maxPrepTime);
    if (!isNaN(prepTimeNum) && prepTimeNum > 0 && prepTimeNum <= 1440) {
      sql += ` AND r.prep_time <= $${i}`;
      params.push(prepTimeNum);
    }

    sql += ' ORDER BY r.created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows.map(mapRecipe));
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Erro interno.' });
  }
});

// GET /api/user/recipes/:id
router.get('/:id', async (req, res) => {
  try {
    const recipe = await fetchFull(req.params.id);
    if (!recipe || recipe.userId !== req.user.uid) return res.status(404).json({ message: 'Receita não encontrada.' });
    res.json(recipe);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Erro interno.' });
  }
});

// POST /api/user/recipes
router.post('/', async (req, res) => {
  try {
    const title = req.body.title?.trim();
    if (!title) return res.status(400).json({ message: 'Título é obrigatório.' });
    if (title.length > 200) return res.status(400).json({ message: 'Título muito longo (máx. 200 caracteres).' });

    const description = typeof req.body.description === 'string' ? req.body.description.trim().slice(0, 5000) : '';
    const prepTime = Number(req.body.prepTime ?? 0);
    if (isNaN(prepTime) || prepTime < 0 || prepTime > 1440) return res.status(400).json({ message: 'Tempo de preparo inválido (0–1440 min).' });
    const servings = Number(req.body.servings ?? 1);
    if (isNaN(servings) || servings < 1 || servings > 100) return res.status(400).json({ message: 'Porções inválidas (1–100).' });
    const category = typeof req.body.category === 'string' ? req.body.category.trim().slice(0, 100) : '';
    const photoUrl = typeof req.body.photoUrl === 'string' ? req.body.photoUrl.slice(0, 500) : null;
    const isPublic = req.body.isPublic === true;
    const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients.slice(0, 100) : [];
    const steps = Array.isArray(req.body.steps) ? req.body.steps.slice(0, 100) : [];

    const id = randomUUID();
    await pool.query(
      `INSERT INTO user_recipes (id, user_id, title, description, prep_time, servings, category, photo_url, is_public)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, req.user.uid, title, description, prepTime, servings, category, photoUrl, isPublic]
    );

    for (let j = 0; j < ingredients.length; j++) {
      const ing = ingredients[j];
      const ingName = typeof ing.name === 'string' ? ing.name.trim().slice(0, 200) : '';
      if (!ingName) continue;
      const ingQty = Number(ing.quantity ?? 0);
      const ingUnit = typeof ing.unit === 'string' ? ing.unit.trim().slice(0, 50) : '';
      await pool.query(
        'INSERT INTO user_ingredients (id, recipe_id, name, quantity, unit, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
        [randomUUID(), id, ingName, isNaN(ingQty) ? 0 : ingQty, ingUnit, j]
      );
    }
    for (let j = 0; j < steps.length; j++) {
      const step = steps[j];
      const instruction = typeof step.instruction === 'string' ? step.instruction.trim().slice(0, 2000) : '';
      if (!instruction) continue;
      const timerMinutes = step.timerMinutes != null ? Number(step.timerMinutes) : null;
      await pool.query(
        'INSERT INTO user_steps (id, recipe_id, instruction, timer_minutes, sort_order) VALUES ($1,$2,$3,$4,$5)',
        [randomUUID(), id, instruction, (timerMinutes != null && !isNaN(timerMinutes) && timerMinutes > 0) ? timerMinutes : null, j]
      );
    }

    res.status(201).json(await fetchFull(id));
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Erro interno.' });
  }
});

// PUT /api/user/recipes/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, prepTime, servings, category, photoUrl, isPublic, ingredients, steps } = req.body;
    const fields = []; const vals = [];
    let i = 1;
    if (title !== undefined) {
      const t = title?.trim();
      if (!t || t.length > 200) return res.status(400).json({ message: 'Título inválido (1–200 caracteres).' });
      fields.push(`title=$${i++}`); vals.push(t);
    }
    if (description !== undefined) { fields.push(`description=$${i++}`); vals.push(typeof description === 'string' ? description.trim().slice(0, 5000) : ''); }
    if (prepTime !== undefined) {
      const pt = Number(prepTime);
      if (isNaN(pt) || pt < 0 || pt > 1440) return res.status(400).json({ message: 'Tempo de preparo inválido (0–1440 min).' });
      fields.push(`prep_time=$${i++}`); vals.push(pt);
    }
    if (servings !== undefined) {
      const sv = Number(servings);
      if (isNaN(sv) || sv < 1 || sv > 100) return res.status(400).json({ message: 'Porções inválidas (1–100).' });
      fields.push(`servings=$${i++}`); vals.push(sv);
    }
    if (category !== undefined)    { fields.push(`category=$${i++}`);    vals.push(typeof category === 'string' ? category.trim().slice(0, 100) : ''); }
    if (photoUrl !== undefined)    { fields.push(`photo_url=$${i++}`);   vals.push(typeof photoUrl === 'string' ? photoUrl.slice(0, 500) : null); }
    if (isPublic !== undefined)    { fields.push(`is_public=$${i++}`);   vals.push(isPublic === true); }

    if (fields.length) {
      fields.push(`updated_at=NOW()`);
      vals.push(req.params.id, req.user.uid);
      await pool.query(`UPDATE user_recipes SET ${fields.join(',')} WHERE id=$${i} AND user_id=$${i + 1}`, vals);
    }

    if (ingredients !== undefined) {
      await pool.query('DELETE FROM user_ingredients WHERE recipe_id = $1', [req.params.id]);
      for (let j = 0; j < ingredients.length; j++) {
        const ing = ingredients[j];
        await pool.query(
          'INSERT INTO user_ingredients (id, recipe_id, name, quantity, unit, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
          [randomUUID(), req.params.id, ing.name, ing.quantity, ing.unit, j]
        );
      }
    }
    if (steps !== undefined) {
      await pool.query('DELETE FROM user_steps WHERE recipe_id = $1', [req.params.id]);
      for (let j = 0; j < steps.length; j++) {
        const step = steps[j];
        await pool.query(
          'INSERT INTO user_steps (id, recipe_id, instruction, timer_minutes, sort_order) VALUES ($1,$2,$3,$4,$5)',
          [randomUUID(), req.params.id, step.instruction, step.timerMinutes ?? null, j]
        );
      }
    }

    res.json(await fetchFull(req.params.id));
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Erro interno.' });
  }
});

// DELETE /api/user/recipes/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM user_recipes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]);
    res.status(204).send();
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Erro interno.' });
  }
});

module.exports = router;
