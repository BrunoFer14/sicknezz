import { getCard, type CardDef } from '../cards';
import { CONFIG } from './config';
import { getMechanic, type EffectSpec, type MechanicContext } from './mechanics';
import { computeStats } from './stats';
import type { ActiveEffect, CardType, GameState, PlayerIndex, PlayerState, TargetKind } from './types';

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
    mana: CONFIG.startingMana,
    base: { ...CONFIG.baseStats },
    hand: cards.splice(0, CONFIG.handSize),
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
  };
}

export type PlayResult = { ok: true } | { ok: false; reason: string };

export function playCard(state: GameState, player: PlayerIndex, handIndex: number): PlayResult {
  if (state.winner !== null) return { ok: false, reason: 'O jogo terminou.' };
  if (state.time < 0) return { ok: false, reason: 'O jogo ainda não começou.' };
  const p = state.players[player];
  const cardId = p.hand[handIndex];
  if (!cardId) return { ok: false, reason: 'Carta inválida.' };
  const card = getCard(cardId);
  if (p.mana < card.cost) return { ok: false, reason: 'Mana insuficiente.' };

  p.mana -= card.cost;
  // Ciclo estilo Clash Royale: a carta jogada vai para o fim da fila e entra a próxima.
  p.deck.push(cardId);
  p.hand[handIndex] = p.deck.shift()!;

  state.events.push({ type: 'played', player, cardId, target: resolveTarget(player, card.target) });
  const playId = state.nextUid++;
  const blocked = new Set<PlayerIndex>();
  for (const spec of card.effects) {
    const target = resolveTarget(player, spec.target ?? card.target);
    if (target !== player && isImmune(state.players[target], card.type)) {
      if (!blocked.has(target)) state.events.push({ type: 'blocked', player: target, cardId });
      blocked.add(target);
      continue;
    }
    applyEffect(state, player, target, cardId, card, spec, playId);
  }
  finalize(state);
  return { ok: true };
}

function resolveTarget(source: PlayerIndex, kind: TargetKind): PlayerIndex {
  return kind === 'self' ? source : other(source);
}

function isImmune(p: PlayerState, type: CardType): boolean {
  return p.effects.some((e) => e.blocks.includes(type));
}

function applyEffect(state: GameState, source: PlayerIndex, target: PlayerIndex, cardId: string, card: CardDef, spec: EffectSpec, playId: number) {
  const mech = getMechanic(spec.mechanic);
  const ctx: MechanicContext = { state, target, source };

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
    p.mana = Math.min(stats.maxMana, p.mana + stats.manaRegen * dt);

    for (const e of [...p.effects]) {
      if (!p.effects.includes(e)) continue; // removido por outro efeito neste tick
      const mech = getMechanic(e.mechanic);
      const ctx: MechanicContext = { state, target, source: e.source };
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

/** Garante limites de vida/mana e verifica se alguém ganhou. */
function finalize(state: GameState) {
  for (const p of state.players) {
    const stats = computeStats(p);
    p.hp = Math.min(p.hp, stats.maxHp);
    p.mana = Math.min(p.mana, stats.maxMana);
  }
  const dead = state.players.map((p) => p.hp <= 0);
  if (dead[0] && dead[1]) state.winner = 'draw';
  else if (dead[0]) state.winner = 1;
  else if (dead[1]) state.winner = 0;
}
