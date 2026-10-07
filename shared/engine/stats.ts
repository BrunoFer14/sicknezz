import { CONFIG } from './config';
import type { PlayerState, Stats } from './types';

const OP_ORDER = ['add', 'mul', 'set'] as const;

/** Stats finais de um jogador depois de aplicar todos os efeitos ativos. */
export function computeStats(player: PlayerState): Stats {
  const stats = { ...player.base };
  let mods = player.effects.flatMap((e) => e.modifiers);
  // Abrandamentos da energia não acumulam: só conta o mais forte (Insónia + Asma = só a Insónia).
  const slows = mods.filter((m) => m.stat === 'energyRegen' && m.op === 'mul' && m.value < 1);
  if (slows.length > 1) {
    const strongest = slows.reduce((a, b) => (b.value < a.value ? b : a));
    mods = mods.filter((m) => !slows.includes(m) || m === strongest);
  }
  for (const op of OP_ORDER) {
    for (const m of mods) {
      if (m.op !== op) continue;
      if (op === 'add') stats[m.stat] += m.value;
      else if (op === 'mul') stats[m.stat] *= m.value;
      else stats[m.stat] = m.value;
    }
  }
  stats.maxHp = Math.max(1, stats.maxHp);
  stats.maxEnergy = Math.max(Math.min(CONFIG.minMaxEnergy, player.base.maxEnergy), stats.maxEnergy);
  stats.energyRegen = Math.max(player.base.energyRegen * CONFIG.minEnergyRegenFactor, stats.energyRegen);
  return stats;
}
