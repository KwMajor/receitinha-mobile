import { useState, useRef, useCallback } from 'react';
import { lookupBarcode, ProductResult } from '../services/api/openFoodFacts';

export interface BarcodeResult extends ProductResult {
  barcode: string;
}

interface UseBarcodeReturn {
  isLoading: boolean;
  lastResult: BarcodeResult | null;
  error: string | null;
  handleBarcode: (barcode: string) => Promise<void>;
  reset: () => void;
}

export function useBarcode(): UseBarcodeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<BarcodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasScannedRef = useRef(false);

  const handleBarcode = useCallback(async (barcode: string) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;

    setIsLoading(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await lookupBarcode(barcode);
      if (result) {
        setLastResult({ barcode, ...result });
      } else {
        setError('not_found');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    hasScannedRef.current = false;
    setIsLoading(false);
    setLastResult(null);
    setError(null);
  }, []);

  return { isLoading, lastResult, error, handleBarcode, reset };
}
