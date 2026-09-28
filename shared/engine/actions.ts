// Ações básicas que as mecânicas usam para alterar o jogo.
// Passar sempre por aqui (em vez de mexer em hp/mana diretamente) garante eventos e limites corretos.
import { computeStats } from './stats';
import type { CardType, GameState, PlayerIndex } from './types';

/** `type` é o tipo da carta que causa o dano (para aplicar multiplicadores como o da SIDA). */
export function damage(state: GameState, target: PlayerIndex, amount: number, type?: CardType) {
  const p = state.players[target];
  const stats = computeStats(p);
  if (type === 'virus') amount = Math.round(amount * stats.virusDamageTaken);
  else if (type === 'bacteria') amount = Math.round(amount * stats.bacteriaDamageTaken);
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

export function gainMana(state: GameState, target: PlayerIndex, amount: number) {
  const p = state.players[target];
  p.mana = Math.min(computeStats(p).maxMana, p.mana + amount);
}
