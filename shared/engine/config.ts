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
    manaRegen: 1 / 1.5, // mana por segundo (1 a cada 1,5s)
    // Multiplicadores do dano recebido de cartas destes tipos (a SIDA põe-nos a 2).
    virusDamageTaken: 1,
    bacteriaDamageTaken: 1,
  } satisfies Stats,
};
