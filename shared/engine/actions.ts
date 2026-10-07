// Ações básicas que as mecânicas usam para alterar o jogo.
// Passar sempre por aqui (em vez de mexer em hp/energia diretamente) garante eventos e limites corretos.
import { CONFIG } from './config';
import { computeStats } from './stats';
import type { CardType, GameState, PlayerIndex, PlayerState } from './types';

/** `type` é o tipo da carta que causa o dano (para aplicar multiplicadores como o da SIDA). Devolve o dano real. */
export function damage(state: GameState, target: PlayerIndex, amount: number, type?: CardType): number {
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
  if (real <= 0) return 0;
  p.hp -= real;
  state.events.push({ type: 'damage', player: target, amount: real });
  return real;
}

export function heal(state: GameState, target: PlayerIndex, amount: number) {
  const p = state.players[target];
  const stats = computeStats(p);
  const real = Math.min(stats.maxHp - p.hp, Math.round(amount * stats.healingTaken));
  if (real <= 0) return;
  p.hp += real;
  state.events.push({ type: 'heal', player: target, amount: real });
}

/** Quanto de um dreno novo chega mesmo ao jogador, com a Resiliência (1, 0.5, 0.25). */
export function drainFactor(p: PlayerState): number {
  const r = p.effects.find((e) => e.mechanic === 'resilience');
  const { factors } = CONFIG.resilience;
  return factors[Math.min(r?.data.stacks ?? 0, factors.length - 1)];
}

/** `playId`: jogada que causa o dreno (os drenos ao longo do tempo da mesma jogada só contam uma vez para a Resiliência). */
export function drainEnergy(state: GameState, target: PlayerIndex, amount: number, playId: number) {
  const p = state.players[target];
  let r = p.effects.find((e) => e.mechanic === 'resilience');
  const isNew = !r || !r.data[`play${playId}`];
  // A própria jogada que começou a Resiliência não é reduzida por ela (ex.: os pontos seguintes da Ansiedade).
  const factor = r && isNew ? drainFactor(p) : r ? r.data[`play${playId}`] : 1;
  const real = Math.min(p.energy, amount * factor);
  if (real <= 0) return;
  p.energy -= real;
  state.events.push({ type: 'energyLoss', player: target, amount: real });
  if (!isNew) return;
  if (!r) {
    r = {
      uid: state.nextUid++,
      playId: state.nextUid++,
      cardId: 'resiliencia',
      cardType: 'mental',
      mechanic: 'resilience',
      params: {},
      source: target,
      elapsed: 0,
      duration: CONFIG.resilience.duration,
      modifiers: [],
      blocks: [],
      data: { stacks: 0 },
    };
    p.effects.push(r);
  }
  r.data[`play${playId}`] = factor;
  r.data.stacks = Math.min((r.data.stacks ?? 0) + 1, CONFIG.resilience.factors.length - 1);
  r.elapsed = 0;
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
