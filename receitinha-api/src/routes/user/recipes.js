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

    if (query) {
      sql += ` AND (r.title ILIKE $${i} OR EXISTS (
        SELECT 1 FROM user_ingredients ing WHERE ing.recipe_id = r.id AND ing.name ILIKE $${i}
      ))`;
      params.push(`%${query}%`); i++;
    }
    if (cats.length) {
      const ph = cats.map((_, j) => `$${i + j}`).join(',');
      sql += ` AND r.category IN (${ph})`;
      params.push(...cats); i += cats.length;
    }
    if (maxPrepTime && parseInt(maxPrepTime) < 120) {
      sql += ` AND r.prep_time <= $${i}`;
      params.push(parseInt(maxPrepTime));
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
    const { title, description, prepTime, servings, category, photoUrl, isPublic, ingredients = [], steps = [] } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Título é obrigatório.' });

    const id = randomUUID();
    await pool.query(
      `INSERT INTO user_recipes (id, user_id, title, description, prep_time, servings, category, photo_url, is_public)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, req.user.uid, title.trim(), description ?? '', prepTime ?? 0, servings ?? 1, category ?? '', photoUrl ?? null, isPublic ?? false]
    );

    for (let j = 0; j < ingredients.length; j++) {
      const ing = ingredients[j];
      await pool.query(
        'INSERT INTO user_ingredients (id, recipe_id, name, quantity, unit, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
        [randomUUID(), id, ing.name, ing.quantity, ing.unit, j]
      );
    }
    for (let j = 0; j < steps.length; j++) {
      const step = steps[j];
      await pool.query(
        'INSERT INTO user_steps (id, recipe_id, instruction, timer_minutes, sort_order) VALUES ($1,$2,$3,$4,$5)',
        [randomUUID(), id, step.instruction, step.timerMinutes ?? null, j]
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
    if (title !== undefined)       { fields.push(`title=$${i++}`);       vals.push(title.trim()); }
    if (description !== undefined) { fields.push(`description=$${i++}`); vals.push(description); }
    if (prepTime !== undefined)    { fields.push(`prep_time=$${i++}`);   vals.push(prepTime); }
    if (servings !== undefined)    { fields.push(`servings=$${i++}`);    vals.push(servings); }
    if (category !== undefined)    { fields.push(`category=$${i++}`);    vals.push(category); }
    if (photoUrl !== undefined)    { fields.push(`photo_url=$${i++}`);   vals.push(photoUrl); }
    if (isPublic !== undefined)    { fields.push(`is_public=$${i++}`);   vals.push(isPublic); }

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
