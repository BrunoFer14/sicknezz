import { getCard, type CardDef } from '../cards';
import { CONFIG } from './config';
import { getMechanic, type EffectSpec, type MechanicContext } from './mechanics';
import { computeStats } from './stats';
import type { ActiveEffect, CardType, GameState, PlayerIndex, PlayerState, Side, TargetKind } from './types';

export const other = (i: PlayerIndex): PlayerIndex => (i === 0 ? 1 : 0);

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createPlayer(name: string, deck: readonly string[]): PlayerState {
  const cards = shuffle([...deck]);
  return {
    name,
    hp: CONFIG.baseStats.maxHp,
    energy: CONFIG.startingEnergy,
    base: { ...CONFIG.baseStats },
    hand: cards.splice(0, CONFIG.handSize),
    borrowed: new Array(CONFIG.handSize).fill(false),
    deck: cards,
    effects: [],
  };
}

export function createGame(names: [string, string], decks: [readonly string[], readonly string[]]): GameState {
  return {
    time: -CONFIG.countdown,
    players: [createPlayer(names[0], decks[0]), createPlayer(names[1], decks[1])],
    winner: null,
    nextUid: 1,
    events: [],
    pool: [...new Set([...decks[0], ...decks[1]])],
  };
}

export type PlayResult = { ok: true } | { ok: false; reason: string };

/** Custo atual de uma carta para este jogador (ex.: a Alergia encarece os tratamentos). */
export function cardCost(p: PlayerState, cardId: string): number {
  const card = getCard(cardId);
  let cost = card.cost;
  for (const e of p.effects) cost += getMechanic(e.mechanic).costDelta?.(e.params, card.type) ?? 0;
  return Math.max(0, cost);
}

/** Custo máximo que o jogador pode jogar agora (ex.: Fratura), ou null se não houver limite. */
export function maxPlayableCost(p: PlayerState): number | null {
  let max: number | null = null;
  for (const e of p.effects) {
    const m = getMechanic(e.mechanic).maxCost?.(e.params);
    if (m !== undefined) max = max === null ? m : Math.min(max, m);
  }
  return max;
}

/** Posições da mão que o jogador não pode jogar agora (ex.: AVC). */
export function lockedSlots(p: PlayerState): Set<number> {
  const locked = new Set<number>();
  for (const e of p.effects) getMechanic(e.mechanic).lockedSlots?.(e.params).forEach((i) => locked.add(i));
  return locked;
}

/** `side`: área onde a carta foi largada; só conta para cartas com alvo 'any' (por omissão, o adversário). */
export function playCard(state: GameState, player: PlayerIndex, handIndex: number, side: Side = 'opponent'): PlayResult {
  if (state.winner !== null) return { ok: false, reason: 'O jogo terminou.' };
  if (state.time < 0) return { ok: false, reason: 'O jogo ainda não começou.' };
  const p = state.players[player];
  const cardId = p.hand[handIndex];
  if (!cardId) return { ok: false, reason: 'Carta inválida.' };
  const card = getCard(cardId);
  const cost = cardCost(p, cardId);
  if (p.energy < cost) return { ok: false, reason: 'Energia insuficiente.' };
  if (lockedSlots(p).has(handIndex)) return { ok: false, reason: 'Esta carta está bloqueada.' };
  const max = maxPlayableCost(p);
  if (max !== null && cost > max) return { ok: false, reason: `Só podes jogar cartas até custo ${max}.` };

  p.energy -= cost;
  // Ciclo estilo Clash Royale: a carta jogada vai para o fim da fila e entra a próxima.
  // As cartas emprestadas (Alzheimer) não voltam à fila.
  if (!p.borrowed[handIndex]) p.deck.push(cardId);
  p.hand[handIndex] = p.deck.shift()!;
  p.borrowed[handIndex] = false;

  // Efeitos no próprio jogador que reagem às cartas que ele joga (ex.: a Alergia desaparece com um tratamento).
  for (const e of [...p.effects]) getMechanic(e.mechanic).onOwnerPlay?.(e.params, e, card.type);
  p.effects = p.effects.filter((e) => !e.ended);

  state.events.push({ type: 'played', player, cardId, target: resolveTarget(player, card.target, side) });
  const playId = state.nextUid++;
  const blocked = new Set<PlayerIndex>();
  const replaced = new Set<PlayerIndex>();
  for (const spec of card.effects) {
    const target = resolveTarget(player, spec.target ?? card.target, side);
    if (target !== player && isImmune(state.players[target], card.type)) {
      if (!blocked.has(target)) state.events.push({ type: 'blocked', player: target, cardId });
      blocked.add(target);
      continue;
    }
    // Nada acumula: jogar outra vez a mesma carta substitui (e reinicia) a anterior.
    if (!replaced.has(target)) {
      const t = state.players[target];
      t.effects = t.effects.filter((e) => !(e.cardId === cardId && e.source === player));
      replaced.add(target);
    }
    applyEffect(state, player, target, cardId, card, spec, playId);
  }
  finalize(state);
  return { ok: true };
}

function resolveTarget(source: PlayerIndex, kind: TargetKind, side: Side): PlayerIndex {
  if (kind === 'any') kind = side;
  return kind === 'self' ? source : other(source);
}

function isImmune(p: PlayerState, type: CardType): boolean {
  return p.effects.some((e) => e.blocks.includes(type));
}

function applyEffect(state: GameState, source: PlayerIndex, target: PlayerIndex, cardId: string, card: CardDef, spec: EffectSpec, playId: number) {
  const mech = getMechanic(spec.mechanic);
  const ctx: MechanicContext = { state, target, source, cardType: card.type };

  if (!mech.duration) {
    mech.onApply?.(ctx, spec.params, null);
    return;
  }
  const effect: ActiveEffect = {
    uid: state.nextUid++,
    playId,
    cardId,
    cardType: card.type,
    mechanic: spec.mechanic,
    params: spec.params,
    source,
    elapsed: 0,
    duration: mech.duration(spec.params),
    modifiers: mech.modifiers?.(spec.params) ?? [],
    blocks: mech.blocks?.(spec.params) ?? [],
    data: {},
  };
  state.players[target].effects.push(effect);
  mech.onApply?.(ctx, spec.params, effect);
}

/** Avança o jogo `dt` segundos. */
export function tick(state: GameState, dt: number) {
  if (state.winner !== null) return;
  state.time += dt;
  if (state.time < 0) return;

  state.players.forEach((p, i) => {
    const target = i as PlayerIndex;
    const stats = computeStats(p);
    p.energy = Math.min(stats.maxEnergy, p.energy + stats.energyRegen * dt);

    for (const e of [...p.effects]) {
      if (!p.effects.includes(e)) continue; // removido por outro efeito neste tick
      const mech = getMechanic(e.mechanic);
      const ctx: MechanicContext = { state, target, source: e.source, cardType: e.cardType };
      e.elapsed += dt;
      mech.onTick?.(ctx, e.params, e, dt);
      if (e.ended || (e.duration !== null && e.elapsed >= e.duration)) {
        mech.onExpire?.(ctx, e.params, e);
        p.effects = p.effects.filter((x) => x !== e);
      }
    }
  });
  finalize(state);
}

/** Garante limites de vida/energia e verifica se alguém ganhou. */
function finalize(state: GameState) {
  for (const p of state.players) {
    const stats = computeStats(p);
    p.hp = Math.min(p.hp, stats.maxHp);
    p.energy = Math.min(p.energy, stats.maxEnergy);
  }
  const dead = state.players.map((p) => p.hp <= 0);
  if (dead[0] && dead[1]) state.winner = 'draw';
  else if (dead[0]) state.winner = 1;
  else if (dead[1]) state.winner = 0;
}
