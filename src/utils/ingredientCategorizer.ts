const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Hortifruti: [
    'alface', 'tomate', 'cenoura', 'cebola', 'batata', 'alho', 'pimentão',
    'pepino', 'espinafre', 'couve', 'brócolis', 'repolho', 'abobrinha',
    'berinjela', 'beterraba', 'chuchu', 'milho', 'vagem', 'mandioca', 'inhame',
    'limão', 'laranja', 'banana', 'maçã', 'morango', 'uva', 'manga', 'abacaxi',
    'melão', 'melancia', 'pera', 'pêssego', 'mamão', 'abacate', 'coco',
    'hortelã', 'salsinha', 'cheiro-verde', 'coentro', 'gengibre', 'pimentinha',
    'jiló', 'quiabo', 'acelga', 'almeirão', 'rúcula', 'agrião',
  ],
  'Carnes e Peixes': [
    'frango', 'carne', 'bife', 'patinho', 'alcatra', 'picanha', 'costela',
    'porco', 'linguiça', 'salsicha', 'bacon', 'presunto', 'filé', 'peixe',
    'salmão', 'atum', 'tilápia', 'camarão', 'polvo', 'lula', 'bacalhau',
    'peru', 'pato', 'cordeiro', 'moída', 'peito', 'coxa', 'sobrecoxa',
    'músculo', 'acém', 'maminha', 'contrafilé', 'calabresa', 'hambúrguer',
  ],
  Laticínios: [
    'leite', 'queijo', 'iogurte', 'manteiga', 'creme de leite', 'requeijão',
    'ricota', 'cottage', 'mussarela', 'parmesão', 'nata', 'cheddar',
    'catupiry', 'cream cheese', 'ghee',
  ],
  Padaria: [
    'farinha', 'pão', 'trigo', 'aveia', 'centeio', 'fermento', 'amido',
    'fubá', 'tapioca', 'polvilho', 'macarrão', 'massa', 'biscoito', 'bolacha',
    'torrada', 'baguete', 'brioche', 'panqueca',
  ],
  Mercearia: [
    'arroz', 'feijão', 'lentilha', 'grão-de-bico', 'ervilha', 'milho enlatado',
    'atum enlatado', 'extrato de tomate', 'tomate pelado', 'leite condensado',
    'chocolate', 'mel', 'geleia', 'granola', 'quinoa', 'chia', 'linhaça',
    'castanha', 'amendoim', 'passas', 'nozes', 'amêndoa',
  ],
  Bebidas: [
    'água', 'suco', 'refrigerante', 'cerveja', 'vinho', 'café', 'chá',
    'achocolatado', 'isotônico', 'kombucha', 'energético', 'whisky', 'cachaça',
  ],
  Temperos: [
    'sal', 'pimenta', 'açúcar', 'vinagre', 'azeite', 'óleo', 'molho',
    'ketchup', 'mostarda', 'maionese', 'shoyu', 'orégano', 'alecrim',
    'tomilho', 'cominho', 'cúrcuma', 'páprica', 'canela', 'louro',
    'noz-moscada', 'curry', 'tempero', 'caldo', 'colorau', 'ervas',
    'tabasco', 'sriracha', 'tahine',
  ],
};

export function categorizeIngredient(name: string): string {
  const normalized = name.toLowerCase().trim();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return category;
    }
  }
  return 'Outros';
}
