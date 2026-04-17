const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── Configuração ──────────────────────────────────────────────────────────────

const ALLOWED_DOMAINS = [
  'tudogostoso.com.br',
  'receitasnestle.com.br',
  'panelinha.com.br',
  'guiadacozinha.com.br',
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAllowedDomain(urlStr) {
  try {
    const { hostname } = new URL(urlStr);
    return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/** Parse ISO 8601 duration (e.g. "PT1H30M") → minutes */
function parseDuration(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const total = (parseInt(m[1] || '0', 10) * 60) + parseInt(m[2] || '0', 10);
  return total > 0 ? total : null;
}

/** Extract recipe data from schema.org JSON-LD (most reliable strategy). */
function extractFromJsonLd($) {
  let recipe = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipe) return;
    try {
      const data = JSON.parse($(el).html() || '{}');
      const candidates = Array.isArray(data)
        ? data
        : data['@graph']
        ? data['@graph']
        : [data];
      recipe = candidates.find(c => {
        if (!c || !c['@type']) return false;
        const t = c['@type'];
        return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
      });
    } catch { /* malformed JSON — skip */ }
  });

  if (!recipe) return null;

  // Title
  const title = String(recipe.name || '').trim();

  // Ingredients
  const ingredients = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient.map(s => String(s).trim()).filter(Boolean)
    : [];

  // Steps — can be strings, HowToStep, or HowToSection
  const steps = [];
  if (Array.isArray(recipe.recipeInstructions)) {
    for (const item of recipe.recipeInstructions) {
      if (typeof item === 'string') {
        const t = item.trim(); if (t) steps.push(t);
      } else if (item['@type'] === 'HowToStep') {
        const t = (item.text || item.name || '').trim(); if (t) steps.push(t);
      } else if (item['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
        for (const sub of item.itemListElement) {
          const t = (sub.text || sub.name || '').trim(); if (t) steps.push(t);
        }
      }
    }
  }

  // Servings
  let servings = null;
  const yieldRaw = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield;
  if (yieldRaw) {
    const m = String(yieldRaw).match(/\d+/);
    if (m) servings = parseInt(m[0], 10);
  }

  // PrepTime (totalTime preferred, then cookTime, then prepTime)
  const prepTime =
    parseDuration(recipe.totalTime) ||
    parseDuration(recipe.cookTime) ||
    parseDuration(recipe.prepTime);

  return { title, ingredients, steps, servings, prepTime };
}

/** Per-site CSS selector fallback (used when JSON-LD is absent or incomplete). */
const SITE_SELECTORS = {
  'tudogostoso.com.br': {
    title:       ['h1.recipe__title', 'h1[class*="title"]', 'h1'],
    ingredients: ['[class*="ingredient-item"]', '[class*="ingredients"] li', 'ul[class*="ingredient"] li'],
    steps:       ['[class*="step__text"]', '[class*="preparation"] li', '[class*="step"] p'],
  },
  'receitasnestle.com.br': {
    title:       ['h1.recipe-title', 'h1[class*="title"]', 'h1'],
    ingredients: ['.recipe-ingredients li', '[class*="ingredient"] li', '.ingredients li'],
    steps:       ['.recipe-steps li', '[class*="step"] li', '.preparation li'],
  },
  'panelinha.com.br': {
    title:       ['h1.recipe-single__title', 'h1[class*="title"]', 'h1'],
    ingredients: ['.recipe-ingredient', '[class*="ingredient"]', '.ingredients li'],
    steps:       ['.recipe-step-description', '[class*="step"]', '.preparation li'],
  },
  'guiadacozinha.com.br': {
    title:       ['h1.entry-title', 'h1[class*="title"]', 'h1'],
    ingredients: ['.wprm-recipe-ingredient', '[class*="ingredient"] li', '.ingredients li'],
    steps:       ['.wprm-recipe-instruction-text', '[class*="instruction"] li', '[class*="step"] li'],
  },
};

function extractFromSelectors($, hostname) {
  const domain = ALLOWED_DOMAINS.find(d => hostname === d || hostname.endsWith('.' + d));
  const sel = SITE_SELECTORS[domain] || {
    title:       ['h1'],
    ingredients: ['[class*="ingredient"] li', '.ingredients li'],
    steps:       ['[class*="preparation"] li', '[class*="step"] li'],
  };

  const pickFirst = (selectors) => {
    for (const s of selectors) {
      const items = [];
      $(s).each((_, el) => {
        const t = $(el).text().trim();
        if (t) items.push(t);
      });
      if (items.length > 0) return items;
    }
    return [];
  };

  const titleEl = sel.title.reduce((found, s) => found || $(s).first().text().trim(), '');

  return {
    title:       titleEl || $('h1').first().text().trim(),
    ingredients: pickFirst(sel.ingredients),
    steps:       pickFirst(sel.steps),
    servings:    null,
    prepTime:    null,
  };
}

// ── Route ──────────────────────────────────────────────────────────────────────

router.post('/', authMiddleware, async (req, res) => {
  const { url } = req.body ?? {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'Informe uma URL válida.' });
  }

  if (!isAllowedDomain(url)) {
    return res.status(422).json({
      message: `Domínio não permitido. Sites suportados: ${ALLOWED_DOMAINS.join(', ')}`,
    });
  }

  let html;
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10_000,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Accept-Charset': 'utf-8, iso-8859-1;q=0.5',
      },
      maxRedirects: 5,
    });

    // Detecta charset do Content-Type header
    const contentType = response.headers['content-type'] || '';
    const headerCharset = (contentType.match(/charset=([^\s;]+)/i) || [])[1];

    // Se não veio no header, faz uma leitura rápida como latin1 para achar <meta charset>
    let charset = headerCharset;
    if (!charset) {
      const peek = iconv.decode(Buffer.from(response.data), 'latin1').slice(0, 2048);
      const metaMatch =
        peek.match(/<meta[^>]+charset=["']?([^\s"';>]+)/i) ||
        peek.match(/<meta[^>]+content=["'][^"']*charset=([^\s"';>]+)/i);
      charset = metaMatch ? metaMatch[1] : 'utf-8';
    }

    // Normaliza aliases comuns
    const enc = charset.toLowerCase().replace(/[-_]/g, '');
    const safeCharset =
      enc === 'utf8'                               ? 'utf-8'   :
      enc === 'iso88591' || enc === 'latin1'       ? 'latin1'  :
      enc === 'windows1252' || enc === 'cp1252'    ? 'win1252' :
      charset;

    html = iconv.decode(Buffer.from(response.data), safeCharset);
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return res.status(504).json({ message: 'O site demorou demais para responder. Tente novamente.' });
    }
    return res.status(502).json({ message: 'Não foi possível acessar a URL. Verifique o endereço e tente novamente.' });
  }

  const $ = cheerio.load(html);
  const { hostname } = new URL(url);

  // Strategy 1 — JSON-LD (schema.org Recipe)
  let result = extractFromJsonLd($);

  // Strategy 2 — CSS selectors, if JSON-LD missing or empty
  if (!result || !result.title || (result.ingredients.length === 0 && result.steps.length === 0)) {
    result = extractFromSelectors($, hostname);
  }

  if (!result.title && result.ingredients.length === 0) {
    return res.status(422).json({
      message: 'Não foi possível extrair a receita desta página. Verifique se a URL leva diretamente a uma receita.',
    });
  }

  return res.json(result);
});

module.exports = router;
