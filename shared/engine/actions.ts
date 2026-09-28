// Ações básicas que as mecânicas usam para alterar o jogo.
// Passar sempre por aqui (em vez de mexer em hp/mana diretamente) garante eventos e limites corretos.
import { computeStats } from './stats';
import type { CardType, GameState, PlayerIndex } from './types';

export function damage(state: GameState, target: PlayerIndex, amount: number) {
  const p = state.players[target];
  const real = Math.min(p.hp, amount);
  if (real <= 0) return;
  p.hp -= real;
  state.events.push({ type: 'damage', player: target, amount: real });
}

export function heal(state: GameState, target: PlayerIndex, amount: number) {
  const p = state.players[target];
  const real = Math.min(computeStats(p).maxHp - p.hp, amount);
  if (real <= 0) return;
  p.hp += real;
  state.events.push({ type: 'heal', player: target, amount: real });
}

export function drainMana(state: GameState, target: PlayerIndex, amount: number) {
  const p = state.players[target];
  const real = Math.min(p.mana, amount);
  if (real <= 0) return;
  p.mana -= real;
  state.events.push({ type: 'manaLoss', player: target, amount: real });
}

/** Número de doenças ativas (cartas hostis) num jogador, opcionalmente só de um tipo. */
export function countDiseases(state: GameState, target: PlayerIndex, type?: CardType): number {
  const plays = new Set<number>();
  for (const e of state.players[target].effects) {
    if (e.source !== target && (!type || e.cardType === type)) plays.add(e.playId);
  }
  return plays.size;
}
