import type { Stats } from './types';

export const CONFIG = {
  handSize: 4,
  deckSize: 10,
  startingMana: 0,
  /** Segundos de contagem decrescente antes de começar. */
  countdown: 3,
  /** Atualizações por segundo no servidor. */
  tickRate: 20,
  baseStats: {
    maxHp: 100,
    maxMana: 10,
    manaRegen: 1, // mana por segundo
  } satisfies Stats,
};
