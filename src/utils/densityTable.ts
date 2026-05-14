// Approximate gram/ml equivalents for common culinary units.
// Maps: normalizedUnit → { ingredientKeyword → grams, default → grams }

type UnitMap = { default: number; [key: string]: number };

const TABLE: Record<string, UnitMap> = {
  xicara: {
    default: 200,
    farinha: 120,
    'farinha de trigo': 120,
    'farinha de mandioca': 160,
    'farinha de rosca': 100,
    acucar: 200,
    'acucar refinado': 200,
    arroz: 200,
    leite: 240,
    oleo: 220,
    azeite: 220,
    agua: 240,
    aveia: 90,
    amendoim: 150,
    granola: 100,
    'chocolate em po': 80,
    cacau: 80,
    amido: 120,
    'feijao': 180,
    'lentilha': 200,
  },
  copo: {
    default: 200,
    leite: 200,
    agua: 200,
    suco: 200,
  },
  'colher de sopa': {
    default: 15,
    acucar: 15,
    farinha: 8,
    azeite: 13,
    oleo: 13,
    manteiga: 14,
    margarina: 14,
    sal: 18,
    mel: 20,
    amido: 12,
    'amido de milho': 12,
    'chocolate em po': 7,
    cacau: 7,
    fermento: 12,
    'fermento em po': 12,
    'extrato de tomate': 20,
    'molho de soja': 15,
    'molho shoyu': 15,
    vinagre: 15,
    requeijao: 20,
    creme: 15,
  },
  'colher de cha': {
    default: 5,
    sal: 6,
    fermento: 4,
    'fermento em po': 4,
    acucar: 4,
    bicarbonato: 4,
    canela: 3,
    'orégano': 2,
    oregano: 2,
    pimenta: 3,
    'pimenta do reino': 3,
    'colorau': 4,
    'paprica': 3,
    curcuma: 3,
    'curry': 3,
  },
  unidade: {
    default: 100,
    ovo: 50,
    tomate: 100,
    banana: 100,
    maca: 130,
    'maca fuji': 130,
    batata: 150,
    'batata doce': 150,
    'batata-doce': 150,
    laranja: 130,
    limao: 90,
    cebola: 100,
    cenoura: 80,
    pimentao: 150,
    chuchu: 200,
    'pao frances': 50,
    'pao': 50,
    'fatia de pao': 25,
    abacate: 200,
    mamao: 500,
    manga: 300,
    abacaxi: 1500,
    melao: 1000,
    'dente de alho': 6,
    alho: 5,
    'folha de louro': 1,
  },
  dente: {
    default: 6,
    alho: 6,
  },
  folha: {
    default: 5,
    alface: 10,
    louro: 1,
    'hortelã': 1,
    'hortela': 1,
    menta: 1,
    manjericao: 2,
    'manjericão': 2,
  },
  pitada: {
    default: 1,
  },
  fatia: {
    default: 30,
    pao: 25,
    'pao de forma': 25,
    queijo: 30,
    presunto: 30,
    peito: 30,
    bacon: 20,
  },
  lata: {
    default: 400,
    atum: 170,
    sardinha: 125,
    milho: 200,
    'ervilha': 200,
    'extrato de tomate': 340,
  },
  pacote: {
    default: 500,
    gelatin: 12,
    gelatina: 12,
    'sache': 10,
  },
  maço: {
    default: 100,
    'cheiro-verde': 50,
    salsa: 50,
    cebolinha: 50,
    coentro: 50,
    manjericao: 40,
  },
  maco: {
    default: 100,
    'cheiro-verde': 50,
    salsa: 50,
    cebolinha: 50,
    coentro: 50,
  },
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '');
}

/**
 * Converts a culinary quantity + unit to approximate grams.
 * Falls back to quantity × 100 if unit is unrecognized.
 */
export function convertToGrams(
  quantity: number,
  unit: string,
  ingredientName: string
): number {
  const normUnit = normalize(unit);
  const normIngredient = normalize(ingredientName);

  // Direct mass/volume units — assume water density for ml/l
  if (['g', 'grama', 'gramas'].includes(normUnit)) return quantity;
  if (['ml', 'mililitro', 'mililitros'].includes(normUnit)) return quantity;
  if (['kg', 'quilograma', 'quilogramas', 'kilo', 'kilograma'].includes(normUnit)) return quantity * 1000;
  if (['l', 'litro', 'litros'].includes(normUnit)) return quantity * 1000;

  const densities = TABLE[normUnit];
  if (!densities) return quantity * 100; // unknown unit — assume 100 g/unit

  // Try to find a matching ingredient keyword
  for (const [key, grams] of Object.entries(densities)) {
    if (key === 'default') continue;
    if (normIngredient.includes(key) || key.includes(normIngredient)) {
      return quantity * grams;
    }
  }

  return quantity * densities.default;
}
