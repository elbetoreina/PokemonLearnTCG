export interface Attack {
  name: string;
  cost: string[];
  damage: string;
  text: string;
}

export interface Ability {
  name: string;
  type: string;
  text: string;
}

export interface TypeValue {
  type: string;
  value: string;
}

export type StatusCondition = 'Poisoned' | 'Burned' | 'Asleep' | 'Confused' | 'Paralyzed';

export interface CardView {
  instanceId: string;
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp: number | null;
  types: string[];
  evolvesFrom: string | null;
  attacks: Attack[];
  abilities: Ability[];
  rules: string[];
  weaknesses: TypeValue[];
  resistances: TypeValue[];
  retreatCost: string[];
  energyProvides: string[];
  imageSmall: string | null;
  imageLarge: string | null;
  setName: string | null;
  number: string | null;
  damageCounters: number;
  remainingHp: number;
  attachedEnergy: string[];
  conditions: StatusCondition[];
  turnsInPlay: number;
}

export interface PlayerView {
  playerId: string;
  name: string;
  isSelf: boolean;
  deckCount: number;
  handCount: number;
  hand: CardView[] | null;
  active: CardView | null;
  bench: (CardView | null)[];
  discardCount: number;
  prizesCount: number;
  stadium: CardView | null;
  energyAttachedThisTurn: boolean;
  supporterPlayedThisTurn: boolean;
  retreatedThisTurn: boolean;
  attackedThisTurn: boolean;
}

export interface LegalMove {
  type: string;
  label: string;
  detail: string;
  handInstanceId: string | null;
  targetInstanceId: string | null;
  benchIndex: number | null;
  attackIndex: number | null;
  abilityIndex: number | null;
}

export interface GameView {
  id: string;
  phase: string;
  turnNumber: number;
  firstTurn: boolean;
  currentTurnPlayerId: string;
  goingFirstPlayerId: string;
  winnerId: string | null;
  winnerReason: string | null;
  log: string[];
  lastHint: string | null;
  me: PlayerView | null;
  opponent: PlayerView | null;
  legalMoves: LegalMove[];
  suggestions: string[];
}

export interface GameActionRequest {
  type: string;
  handInstanceId?: string;
  targetInstanceId?: string;
  benchIndex?: number;
  attackIndex?: number;
  abilityIndex?: number;
}

export interface GameCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: number | null;
  types?: string[];
  evolvesFrom?: string | null;
  rules?: string[];
  imageSmall?: string | null;
  imageLarge?: string | null;
  attacks?: Attack[];
  abilities?: Ability[];
  retreatCost?: string[];
  setName?: string | null;
  number?: string | null;
}

export interface CardSearchResult {
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
  data: GameCard[];
}

