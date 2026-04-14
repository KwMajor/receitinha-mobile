require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { init } = require('./db');
const recipesRouter = require('./routes/recipes');
const userRecipesRouter = require('./routes/user/recipes');
const userFavoritesRouter = require('./routes/user/favorites');
const userCategoriesRouter = require('./routes/user/categories');
const userHistoryRouter = require('./routes/user/history');
const userShoppingRouter = require('./routes/user/shopping');
const userPlanningRouter = require('./routes/user/planning');
const userPhotosRouter = require('./routes/user/photos');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Segurança ────────────────────────────────────────────────────────────────
app.use(helmet());

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Apps mobile nativos não enviam Origin — sempre permitir
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Origem não permitida pelo CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// Rate limit para endpoints públicos (sem autenticação)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Rate limit para endpoints autenticados — mais generoso pois já exigem token válido.
// Backup/restore pode gerar dezenas de chamadas legítimas em sequência.
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Proteção geral mínima para qualquer rota não coberta acima
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

app.use(generalLimiter);

// ── Rotas ────────────────────────────────────────────────────────────────────
app.use('/api/recipes', publicLimiter, recipesRouter);
app.use('/api/user/recipes', userLimiter, userRecipesRouter);
app.use('/api/user/favorites', userLimiter, userFavoritesRouter);
app.use('/api/user/categories', userLimiter, userCategoriesRouter);
app.use('/api/user/history', userLimiter, userHistoryRouter);
app.use('/api/user/shopping', userLimiter, userShoppingRouter);
app.use('/api/user/planning', userLimiter, userPlanningRouter);
app.use('/api/user/photos', userLimiter, userPhotosRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Inicialização ─────────────────────────────────────────────────────────────
init()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ receitinha-api rodando em http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erro ao conectar no banco:', err.message);
    process.exit(1);
  });
