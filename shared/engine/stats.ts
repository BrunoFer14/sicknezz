import type { PlayerState, Stats } from './types';

const OP_ORDER = ['add', 'mul', 'set'] as const;

/** Stats finais de um jogador depois de aplicar todos os efeitos ativos. */
export function computeStats(player: PlayerState): Stats {
  const stats = { ...player.base };
  const mods = player.effects.flatMap((e) => e.modifiers);
  for (const op of OP_ORDER) {
    for (const m of mods) {
      if (m.op !== op) continue;
      if (op === 'add') stats[m.stat] += m.value;
      else if (op === 'mul') stats[m.stat] *= m.value;
      else stats[m.stat] = m.value;
    }
  }
  stats.maxHp = Math.max(1, stats.maxHp);
  stats.maxMana = Math.max(1, stats.maxMana);
  stats.manaRegen = Math.max(0, stats.manaRegen);
  return stats;
}
