const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── Configuração ──────────────────────────────────────────────────────────────

// Charsets observados por domínio (referência — detecção é automática via header/meta):
//   tudogostoso.com.br      → utf-8
//   receitasnestle.com.br   → utf-8
//   panelinha.com.br        → utf-8
//   guiadacozinha.com.br    → utf-8 (alguns posts antigos podem servir como windows-1252)
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

function sanitizeText(text) {
  if (text == null) return '';
  return String(text)
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectCharset(contentType, htmlPeek) {
  const headerMatch = (contentType || '').match(/charset=([^\s;]+)/i);
  if (headerMatch) return headerMatch[1].toLowerCase();
  const metaMatch =
    htmlPeek.match(/<meta[^>]+charset=["']?([^\s"';>]+)/i) ||
    htmlPeek.match(/<meta[^>]+content=["'][^"']*charset=([^\s"';>]+)/i);
  if (metaMatch) return metaMatch[1].toLowerCase();
  return 'utf-8';
}

function normalizeCharsetAlias(charset) {
  const enc = String(charset).toLowerCase().replace(/[-_]/g, '');
  if (enc === 'utf8') return 'utf-8';
  if (enc === 'iso88591' || enc === 'latin1') return 'latin1';
  if (enc === 'windows1252' || enc === 'cp1252') return 'win1252';
  return charset;
}

async function fetchAndDecode(url) {
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

  const contentType = response.headers['content-type'] || '';
  const buffer = Buffer.from(response.data);
  const peek = iconv.decode(buffer, 'latin1').slice(0, 2048);
  const detected = detectCharset(contentType, peek);
  const safeCharset = normalizeCharsetAlias(detected);
  const html = iconv.decode(buffer, safeCharset);
  return { html, contentType, detectedCharset: detected };
}

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
  const title = sanitizeText(recipe.name);

  // Ingredients
  const ingredients = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient.map(s => sanitizeText(s)).filter(Boolean)
    : [];

  // Steps — can be strings, HowToStep, or HowToSection
  const steps = [];
  if (Array.isArray(recipe.recipeInstructions)) {
    for (const item of recipe.recipeInstructions) {
      if (typeof item === 'string') {
        const t = sanitizeText(item); if (t) steps.push(t);
      } else if (item['@type'] === 'HowToStep') {
        const t = sanitizeText(item.text || item.name); if (t) steps.push(t);
      } else if (item['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
        for (const sub of item.itemListElement) {
          const t = sanitizeText(sub.text || sub.name); if (t) steps.push(t);
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
        const t = sanitizeText($(el).text());
        if (t) items.push(t);
      });
      if (items.length > 0) return items;
    }
    return [];
  };

  const titleEl = sel.title.reduce((found, s) => found || sanitizeText($(s).first().text()), '');

  return {
    title:       titleEl || sanitizeText($('h1').first().text()),
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
    const decoded = await fetchAndDecode(url);
    html = decoded.html;
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return res.status(504).json({ message: 'O site demorou demais para responder. Tente novamente.' });
    }
    return res.status(502).json({ message: 'Não foi possível acessar a URL. Verifique o endereço e tente novamente.' });
  }

  const $ = cheerio.load(html, { decodeEntities: true });
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

  // Camada extra de segurança: garante NFC + colapso de espaços em todos os campos
  const sanitized = {
    title:       sanitizeText(result.title),
    ingredients: (result.ingredients || []).map(sanitizeText).filter(Boolean),
    steps:       (result.steps || []).map(sanitizeText).filter(Boolean),
    servings:    result.servings,
    prepTime:    result.prepTime,
  };

  return res.json(sanitized);
});

// ── Endpoint de diagnóstico de encoding ───────────────────────────────────────
// GET /api/scrape/test-encoding?url=...   → testa uma URL específica
// GET /api/scrape/test-encoding           → testa uma URL padrão de cada domínio

const DEFAULT_TEST_URLS = {
  'tudogostoso.com.br':      'https://www.tudogostoso.com.br/receita/636-brigadeiro.html',
  'receitasnestle.com.br':   'https://www.receitasnestle.com.br/receitas/bolo-de-cenoura',
  'panelinha.com.br':        'https://www.panelinha.com.br/receita/Pao-de-queijo',
  'guiadacozinha.com.br':    'https://www.guiadacozinha.com.br/receita/feijoada-completa/',
};

router.get('/test-encoding', async (req, res) => {
  const { url } = req.query;
  const targets = url ? [url] : Object.values(DEFAULT_TEST_URLS);

  const results = [];
  for (const target of targets) {
    const entry = { url: target };
    try {
      if (!isAllowedDomain(target)) {
        entry.error = 'domínio não permitido';
        results.push(entry);
        continue;
      }
      const { html, detectedCharset } = await fetchAndDecode(target);
      const $ = cheerio.load(html, { decodeEntities: true });
      const { hostname } = new URL(target);
      let extracted = extractFromJsonLd($);
      if (!extracted || !extracted.title) {
        extracted = extractFromSelectors($, hostname);
      }
      entry.domain           = hostname;
      entry.detectedCharset  = detectedCharset;
      entry.title            = sanitizeText(extracted.title);
      entry.firstIngredient  = sanitizeText((extracted.ingredients || [])[0] || '');
      entry.firstStep        = sanitizeText((extracted.steps || [])[0] || '');
    } catch (err) {
      entry.error = err.message || 'falha ao buscar';
    }
    results.push(entry);
  }

  return res.json({ results });
});

module.exports = router;
