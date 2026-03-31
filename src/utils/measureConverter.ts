// ─────────────────────────────────────────────
//  RF17 — Conversor de Medidas Culinárias
// ─────────────────────────────────────────────

export type UnitGroup = 'volume' | 'weight' | 'contextual';

export interface ConversionUnit {
  label: string;
  group: UnitGroup;
  /** Fator para a base: ml (volume) ou g (weight). Undefined para contextual. */
  toBase?: number;
}

// ── UNIDADES DE VOLUME (base: ml) ──────────────────────────────────────────
export const VOLUME_UNITS: Record<string, ConversionUnit> = {
  ml:                { label: 'ml',              group: 'volume', toBase: 1 },
  l:                 { label: 'l',               group: 'volume', toBase: 1000 },
  xícara:            { label: 'xícara (chá)',     group: 'volume', toBase: 240 },
  'xícara (café)':   { label: 'xícara (café)',    group: 'volume', toBase: 60 },
  'colher de sopa':  { label: 'colher de sopa',  group: 'volume', toBase: 15 },
  'colher de chá':   { label: 'colher de chá',   group: 'volume', toBase: 5 },
  'fl oz':           { label: 'fl oz',            group: 'volume', toBase: 29.57 },
};

// ── UNIDADES DE PESO (base: g) ─────────────────────────────────────────────
export const WEIGHT_UNITS: Record<string, ConversionUnit> = {
  g:  { label: 'g',  group: 'weight', toBase: 1 },
  kg: { label: 'kg', group: 'weight', toBase: 1000 },
  oz: { label: 'oz', group: 'weight', toBase: 28.35 },
  lb: { label: 'lb', group: 'weight', toBase: 453.6 },
};

// ── UNIDADES CONTEXTUAIS (sem conversão direta volume↔peso) ───────────────
export const CONTEXTUAL_UNITS: Record<string, ConversionUnit> = {
  unidade: { label: 'unidade', group: 'contextual' },
  fatia:   { label: 'fatia',   group: 'contextual' },
  pitada:  { label: 'pitada',  group: 'contextual' },
};

export const ALL_UNITS: Record<string, ConversionUnit> = {
  ...VOLUME_UNITS,
  ...WEIGHT_UNITS,
  ...CONTEXTUAL_UNITS,
};

// ── TABELA DE DENSIDADE (g/ml) ─────────────────────────────────────────────
// Usada para conversões cruzadas volume ↔ peso
const DENSITY: Record<string, number> = {
  agua: 1.00,
  leite: 1.03,
  'leite desnatado': 1.03,
  'leite integral': 1.03,
  'leite condensado': 1.30,
  azeite: 0.91,
  oleo: 0.91,
  'oleo de coco': 0.92,
  'oleo de girassol': 0.92,
  mel: 1.42,
  vinagre: 1.01,
  acucar: 0.85,
  'acucar refinado': 0.85,
  'acucar mascavo': 0.77,
  'acucar demerara': 0.80,
  'acucar de coco': 0.70,
  farinha: 0.53,
  'farinha de trigo': 0.53,
  'farinha de mandioca': 0.67,
  'farinha de aveia': 0.38,
  'farinha de rosca': 0.46,
  sal: 1.20,
  manteiga: 0.91,
  margarina: 0.91,
  creme: 0.99,
  'creme de leite': 0.99,
  'molho de tomate': 1.02,
  'extrato de tomate': 1.05,
  'molho shoyu': 1.10,
  'molho de soja': 1.10,
  requeijao: 0.98,
  iogurte: 1.03,
  suco: 1.04,
  cacau: 0.54,
  'chocolate em po': 0.54,
  amido: 0.65,
  'amido de milho': 0.65,
  aveia: 0.38,
  arroz: 0.85,
  feijao: 0.75,
  lentilha: 0.80,
  granola: 0.48,
  amendoim: 0.64,
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '');
}

function findDensity(ingredient: string): number | null {
  const norm = normalize(ingredient);
  if (DENSITY[norm] !== undefined) return DENSITY[norm];
  for (const [key, val] of Object.entries(DENSITY)) {
    if (norm.includes(key) || key.includes(norm)) return val;
  }
  return null;
}

// ── API PÚBLICA ────────────────────────────────────────────────────────────

/**
 * Retorna as unidades compatíveis para conversão direta (sem ingrediente).
 * Para o mesmo grupo, todas as outras unidades são compatíveis.
 */
export function getCompatibleUnits(unitKey: string): string[] {
  const unit = ALL_UNITS[unitKey];
  if (!unit || unit.group === 'contextual') return [];
  return Object.keys(ALL_UNITS).filter(
    k => ALL_UNITS[k].group === unit.group && k !== unitKey,
  );
}

/**
 * Converte `qty` de `from` para `to`.
 * - Retorna null se a conversão volume↔peso exige ingrediente não informado.
 * - Retorna null se as unidades são desconhecidas.
 */
export function convert(
  qty: number,
  from: string,
  to: string,
  ingredient?: string,
): number | null {
  if (isNaN(qty) || qty < 0) return null;
  const fromUnit = ALL_UNITS[from];
  const toUnit = ALL_UNITS[to];
  if (!fromUnit || !toUnit) return null;
  if (from === to) return qty;

  // Mesmo grupo (ambos volume ou ambos peso)
  if (
    fromUnit.group === toUnit.group &&
    fromUnit.toBase !== undefined &&
    toUnit.toBase !== undefined
  ) {
    return (qty * fromUnit.toBase) / toUnit.toBase;
  }

  // Conversão cruzada volume ↔ peso — exige ingrediente + densidade
  if (
    ((fromUnit.group === 'volume' && toUnit.group === 'weight') ||
      (fromUnit.group === 'weight' && toUnit.group === 'volume')) &&
    fromUnit.toBase !== undefined &&
    toUnit.toBase !== undefined
  ) {
    if (!ingredient?.trim()) return null;
    const density = findDensity(ingredient);
    if (density === null) return null;

    if (fromUnit.group === 'volume') {
      // volume → g → target weight unit
      const ml = qty * fromUnit.toBase;
      const grams = ml * density;
      return grams / toUnit.toBase;
    } else {
      // weight → g → ml → target volume unit
      const grams = qty * fromUnit.toBase;
      const ml = grams / density;
      return ml / toUnit.toBase;
    }
  }

  return null;
}

/**
 * Formata um número de resultado:
 * - Sem zeros desnecessários
 * - Máximo 3 casas decimais para valores pequenos
 */
export function formatResult(value: number): string {
  if (value === 0) return '0';
  if (value >= 1000) return value.toFixed(0);
  if (value >= 100) return parseFloat(value.toFixed(1)).toString();
  if (value >= 1) return parseFloat(value.toFixed(2)).toString();
  return parseFloat(value.toFixed(3)).toString();
}

/**
 * Ingredientes com densidade conhecida — usado para autocomplete.
 * Retornados em formato de exibição (com acentos).
 */
export const KNOWN_INGREDIENTS: string[] = [
  'água', 'leite', 'leite condensado', 'azeite', 'óleo', 'mel', 'vinagre',
  'açúcar', 'açúcar mascavo', 'açúcar demerara', 'farinha de trigo',
  'farinha de mandioca', 'farinha de aveia', 'sal', 'manteiga', 'margarina',
  'creme de leite', 'extrato de tomate', 'molho de soja', 'requeijão',
  'iogurte', 'cacau', 'amido de milho', 'aveia', 'arroz', 'feijão',
  'lentilha', 'granola', 'amendoim',
];

// ── TABELA DE REFERÊNCIA RÁPIDA ────────────────────────────────────────────
export interface QuickRef {
  label: string;
  value: string;
}

export const QUICK_REFS: QuickRef[] = [
  { label: '1 xícara (chá)',         value: '240 ml' },
  { label: '1 xícara (café)',         value: '60 ml' },
  { label: '1 colher de sopa',        value: '15 ml' },
  { label: '1 colher de chá',         value: '5 ml' },
  { label: '1 xícara de farinha',     value: '120 g' },
  { label: '1 xícara de açúcar',      value: '200 g' },
  { label: '1 xícara de arroz',       value: '200 g' },
  { label: '1 xícara de aveia',       value: '90 g' },
  { label: '1 col. sopa de azeite',   value: '13 g' },
  { label: '1 col. sopa de manteiga', value: '14 g' },
  { label: '1 col. sopa de açúcar',   value: '15 g' },
  { label: '1 col. sopa de farinha',  value: '8 g' },
  { label: '1 col. sopa de sal',      value: '18 g' },
  { label: '1 col. chá de sal',       value: '6 g' },
  { label: '1 col. chá de fermento',  value: '4 g' },
  { label: '1 kg',                    value: '1000 g' },
  { label: '1 oz',                    value: '28,35 g' },
  { label: '1 lb',                    value: '453,6 g' },
];
