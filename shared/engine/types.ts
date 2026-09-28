export type PlayerIndex = 0 | 1;

/** Tipos de carta. Para um tipo novo, adiciona-o aqui e em CARD_TYPES (shared/cards.ts). */
export type CardType = 'virus' | 'bacteria' | 'fisica' | 'mental' | 'tratamento';

/** Stats que as cartas podem modificar. Para um stat novo, adiciona-o aqui e em CONFIG.baseStats. */
export type StatName = 'maxHp' | 'maxMana' | 'manaRegen';
export type Stats = Record<StatName, number>;

export interface StatModifier {
  stat: StatName;
  /** Aplicados por ordem: primeiro todos os 'add', depois 'mul', por fim 'set'. */
  op: 'add' | 'mul' | 'set';
  value: number;
}

/** Onde a carta atua, relativo a quem a jogou. */
export type TargetKind = 'opponent' | 'self';

/** Um efeito que ficou ativo num jogador (ex.: gripe a meio de fazer dano). */
export interface ActiveEffect {
  uid: number;
  /** Igual para todos os efeitos criados pela mesma jogada de uma carta. */
  playId: number;
  cardId: string;
  cardType: CardType;
  mechanic: string;
  params: any;
  /** Quem jogou a carta. Se for diferente do dono do efeito, o efeito é hostil (uma doença). */
  source: PlayerIndex;
  elapsed: number;
  /** Segundos de duração; null = permanente. */
  duration: number | null;
  modifiers: StatModifier[];
  /** Tipos de carta hostis bloqueados enquanto este efeito está ativo (imunidade). */
  blocks: CardType[];
  /** Uma mecânica pode pôr isto a true para terminar o efeito antes do tempo. */
  ended?: boolean;
  /** Estado interno livre para a mecânica usar. */
  data: Record<string, number>;
}

export interface PlayerState {
  name: string;
  hp: number;
  mana: number;
  base: Stats;
  /** Fila de cartas: deck[0] é a próxima a entrar na mão. */
  deck: string[];
  hand: string[];
  effects: ActiveEffect[];
}

/** Eventos para a interface animar (dano a flutuar, carta jogada, ...). */
export type GameEvent =
  | { type: 'played'; player: PlayerIndex; cardId: string; target: PlayerIndex }
  | { type: 'damage'; player: PlayerIndex; amount: number }
  | { type: 'heal'; player: PlayerIndex; amount: number }
  | { type: 'manaLoss'; player: PlayerIndex; amount: number }
  | { type: 'blocked'; player: PlayerIndex; cardId: string }
  | { type: 'cured'; player: PlayerIndex; cardId: string };

export interface GameState {
  /** Segundos de jogo. Negativo durante a contagem inicial. */
  time: number;
  players: [PlayerState, PlayerState];
  winner: PlayerIndex | 'draw' | null;
  nextUid: number;
  events: GameEvent[];
}
