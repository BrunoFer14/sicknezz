import type { Stats } from './types';

export const CONFIG = {
  handSize: 4,
  deckSize: 10,
  startingEnergy: 0,
  /** Segundos de contagem decrescente antes de começar. */
  countdown: 3,
  /** Atualizações por segundo no servidor. */
  tickRate: 20,
  baseStats: {
    maxHp: 100,
    maxEnergy: 10,
    energyRegen: 1 / 1.5, // energia por segundo (1 a cada 1,5s)
    // Multiplicadores do dano recebido de cartas destes tipos (a SIDA põe-nos a 2).
    virusDamageTaken: 1,
    bacteriaDamageTaken: 1,
  } satisfies Stats,
  /**
   * A regeneração de energia acelera ao longo do jogo: a partir de `at` segundos é multiplicada por `mult`.
   * Começa lento e acelera para as partidas não se arrastarem.
   */
  /**
   * Limites para as cartas de energia não bloquearem o adversário por completo
   * (várias cartas diferentes somam-se: Asma × Insónia × Sedentarismo...).
   */
  minEnergyRegenFactor: 0.5, // a regeneração nunca desce abaixo de 50% da normal
  minMaxEnergy: 6, // a energia máxima nunca desce abaixo de 6
  energyPhases: [
    { at: 0, mult: 0.75 }, //  0:00  1 a cada 2s (arranque um pouco mais lento)
    { at: 60, mult: 1 }, //    1:00  1 a cada 1,5s
    { at: 180, mult: 1.5 }, // 3:00  1 a cada 1s
    { at: 240, mult: 3 }, //   4:00  1 a cada 0,5s (morte súbita)
  ],
};

/** Multiplicador da regeneração de energia no segundo `time` do jogo. */
export function energyMultiplier(time: number): number {
  let mult = 1;
  for (const ph of CONFIG.energyPhases) if (time >= ph.at) mult = ph.mult;
  return mult;
}
