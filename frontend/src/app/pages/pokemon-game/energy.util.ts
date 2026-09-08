export interface EnergyInfo {
  label: string;
  color: string;
  gradient: string;
  symbol: string;
  accent: string;
}

const MAP: Record<string, EnergyInfo> = {
  Fire: {
    label: 'Fuego',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #f97316 100%)',
    symbol: '🔥',
    accent: '#fca5a5'
  },
  Water: {
    label: 'Agua',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)',
    symbol: '💧',
    accent: '#7dd3fc'
  },
  Grass: {
    label: 'Planta',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)',
    symbol: '🌿',
    accent: '#6ee7b7'
  },
  Lightning: {
    label: 'Rayo',
    color: '#eab308',
    gradient: 'linear-gradient(135deg, #713f12 0%, #ca8a04 50%, #fde047 100%)',
    symbol: '⚡',
    accent: '#fef08a'
  },
  Psychic: {
    label: 'Psíquico',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #581c87 0%, #9333ea 50%, #c084fc 100%)',
    symbol: '👁️',
    accent: '#e9d5ff'
  },
  Fighting: {
    label: 'Lucha',
    color: '#d97706',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)',
    symbol: '👊',
    accent: '#fde68a'
  },
  Darkness: {
    label: 'Oscuridad',
    color: '#475569',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #64748b 100%)',
    symbol: '🌑',
    accent: '#cbd5e1'
  },
  Metal: {
    label: 'Metal',
    color: '#94a3b8',
    gradient: 'linear-gradient(135deg, #334155 0%, #64748b 50%, #cbd5e1 100%)',
    symbol: '⚙️',
    accent: '#f1f5f9'
  },
  Fairy: {
    label: 'Hada',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)',
    symbol: '✨',
    accent: '#fbcfe8'
  },
  Colorless: {
    label: 'Incoloro',
    color: '#94a3b8',
    gradient: 'linear-gradient(135deg, #334155 0%, #64748b 50%, #e2e8f0 100%)',
    symbol: '⭐',
    accent: '#ffffff'
  },
  Dragon: {
    label: 'Dragón',
    color: '#d97706',
    gradient: 'linear-gradient(135deg, #451a03 0%, #b45309 50%, #fbbf24 100%)',
    symbol: '🐉',
    accent: '#fde68a'
  }
};

export function energyInfo(type: string): EnergyInfo {
  return (
    MAP[type] ?? {
      label: type,
      color: '#64748b',
      gradient: 'linear-gradient(135deg, #1e293b, #475569)',
      symbol: '🔹',
      accent: '#94a3b8'
    }
  );
}

// Pokemon Dex Number Mapping for official Sugimori/Pokemon Artwork
const POKEMON_ART_MAP: Record<string, string> = {
  bulbasaur: '1',
  ivysaur: '2',
  venusaur: '3',
  charmander: '4',
  charmeleon: '5',
  charizard: '6',
  squirtle: '7',
  wartortle: '8',
  blastoise: '9',
  pikachu: '25',
  raichu: '26',
  meowth: '52',
  machop: '66',
  machamp: '68',
  gastly: '92',
  gengar: '94',
  eevee: '133',
  snorlax: '143'
};

const TRAINER_ART_MAP: Record<string, string> = {
  potion: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png',
  'super potion': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png',
  switch: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/switch.png',
  "professor's research": 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/professors-letter.png',
  'poké ball': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
  'poke ball': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
  'gym trainer': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/gym-badge.png'
};

export function getCardArtwork(card?: {
  id?: string | null;
  name?: string | null;
  supertype?: string | null;
  imageSmall?: string | null;
  imageLarge?: string | null;
}): string {
  if (!card) return '';

  // Check if imported card art exists
  if (card.id && card.id.startsWith('imp-')) {
    return `assets/imported-cards/${card.id}-art.png`;
  }

  if (card.imageLarge && card.imageLarge.trim() !== '') return card.imageLarge;
  if (card.imageSmall && card.imageSmall.trim() !== '') return card.imageSmall;

  const rawName = (card.name || '').trim().toLowerCase();
  
  // Check trainer art
  if (TRAINER_ART_MAP[rawName]) {
    return TRAINER_ART_MAP[rawName];
  }

  // Check pokemon art by name
  for (const [key, num] of Object.entries(POKEMON_ART_MAP)) {
    if (rawName.includes(key)) {
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${num}.png`;
    }
  }

  // Check by id
  if (card.id) {
    const idKey = card.id.toLowerCase();
    for (const [key, num] of Object.entries(POKEMON_ART_MAP)) {
      if (idKey.includes(key)) {
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${num}.png`;
      }
    }
  }

  return '';
}

export function getFullCardImage(card?: {
  id?: string | null;
  name?: string | null;
  supertype?: string | null;
  imageSmall?: string | null;
  imageLarge?: string | null;
}): string {
  if (!card) return '';

  if (card.id) {
    if (card.id.startsWith('imp-')) {
      return `assets/imported-cards/${card.id}.png`;
    }
    const standardMap: Record<string, string> = {
      'cur-lightning-energy': 'assets/imported-cards/cur-lightning-energy.png',
      'cur-water-energy': 'assets/imported-cards/cur-water-energy.png',
      'cur-grass-energy': 'assets/imported-cards/cur-grass-energy.png',
      'cur-pokeball': 'assets/imported-cards/cur-pokeball.png',
      'cur-professor': 'assets/imported-cards/cur-professor.png',
      'cur-switch': 'assets/imported-cards/cur-switch.png',
      'cur-potion': 'assets/imported-cards/cur-potion.png'
    };
    if (standardMap[card.id]) return standardMap[card.id];
  }

  if (card.imageLarge && card.imageLarge.trim() !== '') return card.imageLarge;
  if (card.imageSmall && card.imageSmall.trim() !== '') return card.imageSmall;

  return '';
}

