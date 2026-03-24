export const formatQuantity = (qty: number): string => {
  const rounded = Math.round(qty * 100) / 100;
  
  if (Number.isInteger(rounded)) return rounded.toString();

  const str = rounded.toString();
  
  // Mapping common fractions
  if (str.endsWith('.5')) {
    const whole = Math.floor(rounded);
    return whole > 0 ? `${whole} e 1/2` : '1/2';
  }
  if (str.endsWith('.25')) {
    const whole = Math.floor(rounded);
    return whole > 0 ? `${whole} e 1/4` : '1/4';
  }
  if (str.endsWith('.75')) {
    const whole = Math.floor(rounded);
    return whole > 0 ? `${whole} e 3/4` : '3/4';
  }
  if (str.endsWith('.33')) {
    const whole = Math.floor(rounded);
    return whole > 0 ? `${whole} e 1/3` : '1/3';
  }

  return rounded.toString();
};

export const formatUnit = (qty: number, unit: string): string => {
  const cleanUnit = unit.toLowerCase().trim();
  const isPlural = qty > 1;

  if (!isPlural) return unit;

  const dictionary: Record<string, string> = {
    'xícara': 'xícaras',
    'xicara': 'xícaras',
    'colher': 'colheres',
    'fatia': 'fatias',
    'copo': 'copos',
    'gota': 'gotas',
    'pitada': 'pitadas',
    'punhado': 'pitadas',
    'unidade': 'unidades',
    'lata': 'latas',
    'caixa': 'caixas',
    'dente': 'dentes',
    'ramo': 'ramos',
    'folha': 'folhas',
    'filé': 'filiés',
    'grama': 'gramas',
    'kg': 'kg',
    'ml': 'ml',
    'l': 'l',
    'litro': 'litros'
  };

  for (const key of Object.keys(dictionary)) {
    if (cleanUnit.startsWith(key)) {
      return unit.replace(new RegExp(key, 'i'), dictionary[key]);
    }
  }

  return unit;
};

export const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};
