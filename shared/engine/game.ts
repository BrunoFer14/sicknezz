import { CARD_TYPES, getCard, type CardDef } from '../cards';
import { CONFIG, energyMultiplier } from './config';
import { getMechanic, type EffectSpec, type MechanicContext } from './mechanics';
import { newSeed, random, shuffle } from './random';
import { computeStats } from './stats';
import type { ActiveEffect, CardType, GameState, PlayerIndex, PlayerState, Side, TargetKind } from './types';

export const other = (i: PlayerIndex): PlayerIndex => (i === 0 ? 1 : 0);

function createPlayer(rng: { rng: number }, name: string, deck: readonly string[]): PlayerState {
  const cards = shuffle(rng, [...deck]);
  return {
    name,
    hp: CONFIG.baseStats.maxHp,
    energy: CONFIG.startingEnergy,
    base: { ...CONFIG.baseStats },
    hand: cards.splice(0, CONFIG.handSize),
    borrowed: new Array(CONFIG.handSize).fill(false),
    deck: cards,
    effects: [],
    damageCarry: 0,
    played: {},
  };
}

/** `seed`: a mesma semente (e as mesmas jogadas) dá sempre a mesma partida. */
export function createGame(names: [string, string], decks: [readonly string[], readonly string[]], seed = newSeed()): GameState {
  const rng = { rng: seed };
  const players: [PlayerState, PlayerState] = [createPlayer(rng, names[0], decks[0]), createPlayer(rng, names[1], decks[1])];
  return {
    time: -CONFIG.countdown,
    players,
    winner: null,
    nextUid: 1,
    events: [],
    pool: [...new Set([...decks[0], ...decks[1]])],
    seed,
    rng: rng.rng,
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

/** Tipos de carta que o jogador não pode jogar agora (ex.: Quarentena). */
export function forbiddenTypes(p: PlayerState): Set<CardType> {
  const types = new Set<CardType>();
  for (const e of p.effects) getMechanic(e.mechanic).forbids?.(e.params).forEach((t) => types.add(t));
  return types;
}

/** O alvo tem alguma doença ativa (vinda do adversário) destes tipos? Condição dos Sintomas. */
export function hasDiseaseOf(p: PlayerState, owner: PlayerIndex, types: CardType[]): boolean {
  return p.effects.some((e) => e.source !== owner && types.includes(e.cardType));
}

/** Mensagem a explicar o que falta para jogar um Sintoma, ou null se a condição estiver cumprida. */
export function unmetRequirement(state: GameState, player: PlayerIndex, card: CardDef): string | null {
  if (!card.requires) return null;
  const target = other(player);
  if (hasDiseaseOf(state.players[target], target, card.requires)) return null;
  const names = card.requires.map((t) => CARD_TYPES[t].name.toLowerCase());
  return `${card.name}: o adversário tem de ter ${names.join(' ou ')} ativo.`;
}

/** Cartas que o jogador não pode jogar agora (ex.: Exercício com uma Fratura). */
export function forbiddenCards(p: PlayerState): Set<string> {
  const ids = new Set<string>();
  for (const e of p.effects) getMechanic(e.mechanic).forbidsCards?.(e.params).forEach((id) => ids.add(id));
  return ids;
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
  if (forbiddenTypes(p).has(card.type)) return { ok: false, reason: 'Quarentena: não podes jogar vírus nem bactérias agora.' };
  if (forbiddenCards(p).has(cardId)) return { ok: false, reason: `Não podes jogar ${card.name} agora.` };
  const max = maxPlayableCost(p);
  // A Fratura olha para o custo impresso na carta (sem os aumentos da Alergia/Fadiga).
  if (max !== null && card.cost > max) return { ok: false, reason: `Só podes jogar cartas até custo ${max}.` };
  const unmet = unmetRequirement(state, player, card);
  if (unmet) return { ok: false, reason: unmet };
  for (const spec of card.effects) {
    const reason = getMechanic(spec.mechanic).requires?.(state, player, spec.params);
    if (reason) return { ok: false, reason };
  }

  p.energy -= cost;
  // Ciclo estilo Clash Royale: a carta jogada vai para o fim da fila e entra a próxima.
  // As cartas emprestadas (Alzheimer) não voltam à fila.
  if (!p.borrowed[handIndex]) p.deck.push(cardId);
  p.hand[handIndex] = p.deck.shift()!;
  p.borrowed[handIndex] = false;
  p.played[cardId] = (p.played[cardId] ?? 0) + 1;

  // Efeitos no próprio jogador que reagem às cartas que ele joga (ex.: a Alergia desaparece com um tratamento).
  for (const e of [...p.effects]) getMechanic(e.mechanic).onOwnerPlay?.(e.params, e, card.type, { state, owner: player, cardId });
  p.effects = p.effects.filter((e) => !e.ended);

  state.events.push({ type: 'played', player, cardId, target: resolveTarget(player, card.target, side) });
  // Hipocondria: a carta foi paga e gasta, mas não faz nada.
  const cancel = p.effects.find((e) => getMechanic(e.mechanic).cancels?.(e.params, card.type));
  if (cancel) {
    p.effects = p.effects.filter((e) => e !== cancel);
    state.events.push({ type: 'cancelled', player, cardId, by: cancel.cardId });
    finalize(state);
    return { ok: true };
  }
  const playId = state.nextUid++;
  const blocked = new Set<PlayerIndex>();
  const replaced = new Set<PlayerIndex>();
  for (const spec of card.effects) {
    const target = resolveTarget(player, spec.target ?? card.target, side);
    if (target !== player && !getMechanic(spec.mechanic).ownImmunity && isImmune(state.players[target], card.type)) {
      if (!blocked.has(target)) state.events.push({ type: 'blocked', player: target, cardId });
      blocked.add(target);
      continue;
    }
    // Nada acumula: jogar outra vez a mesma carta substitui (e reinicia) a anterior.
    if (!replaced.has(target)) {
      const t = state.players[target];
      t.effects = t.effects.filter((e) => !(e.cardId === cardId && e.source === player && !getMechanic(e.mechanic).keepOnReplay));
      replaced.add(target);
    }
    applyEffect(state, player, target, cardId, card, spec, playId);
  }
  // Contágio: a doença pode também apanhar quem a jogou (conta como uma doença vinda do adversário).
  const victim = other(player);
  if (card.contagion && !blocked.has(victim) && random(state) < card.contagion && !isImmune(p, card.type)) {
    state.events.push({ type: 'contagion', player, cardId });
    const contagionPlay = state.nextUid++;
    p.effects = p.effects.filter((e) => !(e.cardId === cardId && e.source === victim));
    for (const spec of card.effects) applyEffect(state, victim, player, cardId, card, spec, contagionPlay);
  }
  finalize(state);
  return { ok: true };
}

/**
 * Joga os efeitos de `cardId` de `source` em `target` como uma jogada nova (duração completa).
 * Usado pelo Espirro e, com `from`, pelas doenças apanhadas por acumulação (buildUp).
 */
function castCard(state: GameState, source: PlayerIndex, target: PlayerIndex, cardId: string, from?: string) {
  const card = getCard(cardId);
  if (isImmune(state.players[target], card.type)) {
    state.events.push({ type: 'blocked', player: target, cardId });
    return;
  }
  state.events.push(from ? { type: 'gained', player: target, cardId, from } : { type: 'spread', player: source, cardId });
  const t = state.players[target];
  t.effects = t.effects.filter((e) => !(e.cardId === cardId && e.source === source));
  const playId = state.nextUid++;
  for (const spec of card.effects) applyEffect(state, source, target, cardId, card, spec, playId);
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
  const ctx: MechanicContext = { state, target, source, cardId, cardType: card.type, playId, cast: (id) => castCard(state, source, target, id), inflict: (id) => castCard(state, other(target), target, id, cardId) };

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
    p.energy = Math.min(stats.maxEnergy, p.energy + stats.energyRegen * energyMultiplier(state.time) * dt);

    for (const e of [...p.effects]) {
      if (!p.effects.includes(e)) continue; // removido por outro efeito neste tick
      const mech = getMechanic(e.mechanic);
      const ctx: MechanicContext = { state, target, source: e.source, cardId: e.cardId, cardType: e.cardType, playId: e.playId, cast: (id) => castCard(state, e.source, target, id), inflict: (id) => castCard(state, other(target), target, id, e.cardId) };
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
