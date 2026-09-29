// Ações básicas que as mecânicas usam para alterar o jogo.
// Passar sempre por aqui (em vez de mexer em hp/energia diretamente) garante eventos e limites corretos.
import { computeStats } from './stats';
import type { CardType, GameState, PlayerIndex } from './types';

/** `type` é o tipo da carta que causa o dano (para aplicar multiplicadores como o da SIDA). */
export function damage(state: GameState, target: PlayerIndex, amount: number, type?: CardType) {
  const p = state.players[target];
  const stats = computeStats(p);
  const mult = type === 'virus' ? stats.virusDamageTaken : type === 'bacteria' ? stats.bacteriaDamageTaken : 1;
  if (mult !== 1) {
    // Com multiplicador, as frações acumulam (ex.: metade de 1 ponto, duas vezes, dá 1 ponto).
    p.damageCarry += amount * mult;
    amount = Math.floor(p.damageCarry + 1e-9);
    p.damageCarry -= amount;
  }
  const real = Math.min(p.hp, amount);
  if (real <= 0) return;
  p.hp -= real;
  state.events.push({ type: 'damage', player: target, amount: real });
}

export function heal(state: GameState, target: PlayerIndex, amount: number) {
  const p = state.players[target];
  const stats = computeStats(p);
  const real = Math.min(stats.maxHp - p.hp, Math.round(amount * stats.healingTaken));
  if (real <= 0) return;
  p.hp += real;
  state.events.push({ type: 'heal', player: target, amount: real });
}

export function drainEnergy(state: GameState, target: PlayerIndex, amount: number) {
  const p = state.players[target];
  const real = Math.min(p.energy, amount);
  if (real <= 0) return;
  p.energy -= real;
  state.events.push({ type: 'energyLoss', player: target, amount: real });
}

/** Número de doenças ativas (cartas hostis) num jogador, opcionalmente só destes tipos. */
export function countDiseases(state: GameState, target: PlayerIndex, types?: CardType[]): number {
  const plays = new Set<number>();
  for (const e of state.players[target].effects) {
    if (e.source !== target && (!types || types.includes(e.cardType))) plays.add(e.playId);
  }
  return plays.size;
}

export function gainEnergy(state: GameState, target: PlayerIndex, amount: number) {
  const p = state.players[target];
  p.energy = Math.min(computeStats(p).maxEnergy, p.energy + amount);
}
