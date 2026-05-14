import { getDatabase } from '../sqlite/database';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TIMEOUT_MS = 8000;

export interface ProductResult {
  name: string;
  brand?: string;
}

async function getCached(barcode: string): Promise<ProductResult | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    product_name: string;
    brand: string | null;
    cached_at: number;
  }>(
    'SELECT product_name, brand, cached_at FROM barcode_cache WHERE barcode = ?',
    [barcode]
  );

  if (!row) return null;
  if (Date.now() - row.cached_at > CACHE_TTL_MS) return null;

  return { name: row.product_name, brand: row.brand ?? undefined };
}

async function saveCache(barcode: string, result: ProductResult): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO barcode_cache (barcode, product_name, brand, cached_at) VALUES (?, ?, ?, ?)',
    [barcode, result.name, result.brand ?? null, Date.now()]
  );
}

export async function lookupBarcode(barcode: string): Promise<ProductResult | null> {
  if (!/^\d{8,14}$/.test(barcode)) {
    throw new Error('Código de barras inválido.');
  }

  // Check cache first
  const cached = await getCached(barcode);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.status !== 1 || !data.product?.product_name) return null;

    const result: ProductResult = {
      name: data.product.product_name as string,
      brand: data.product.brands ? (data.product.brands as string) : undefined,
    };

    await saveCache(barcode, result);
    return result;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tempo de busca esgotado. Verifique sua conexão.');
    }
    throw new Error('Não foi possível buscar o produto. Verifique sua conexão.');
  }
}
