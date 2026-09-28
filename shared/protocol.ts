// Mensagens trocadas entre cliente e servidor + a "vista" do jogo que cada jogador recebe.
import { computeStats } from './engine/stats';
import type { GameEvent, GameState, PlayerIndex, PlayerState, Stats } from './engine/types';

export type ClientMsg =
  | { t: 'create'; name: string; deck: string[] }
  | { t: 'join'; code: string; name: string; deck: string[] }
  | { t: 'play'; handIndex: number }
  | { t: 'rematch' }
  | { t: 'leave' };

export type ServerMsg =
  | { t: 'lobby'; code: string; you: PlayerIndex; players: (string | null)[] }
  | { t: 'state'; view: GameView }
  | { t: 'error'; message: string };

/** Uma carta ativa num jogador (junta todos os efeitos criados pela mesma jogada). */
export interface EffectView {
  id: number;
  cardId: string;
  remaining: number | null;
  duration: number | null;
  hostile: boolean;
}

export interface PlayerView {
  name: string;
  hp: number;
  mana: number;
  stats: Stats;
  base: Stats;
  effects: EffectView[];
}

export interface GameView {
  time: number;
  you: PlayerIndex;
  winner: PlayerIndex | 'draw' | null;
  me: PlayerView & { hand: string[]; next: string };
  /** O adversário não vê as tuas cartas, só quantas tens. */
  opp: PlayerView & { handCount: number };
  events: GameEvent[];
  rematch: [boolean, boolean];
  opponentConnected: boolean;
}

function playerView(p: PlayerState, owner: PlayerIndex): PlayerView {
  const plays = new Map<number, EffectView>();
  for (const e of p.effects) {
    const remaining = e.duration === null ? null : Math.max(0, e.duration - e.elapsed);
    const prev = plays.get(e.playId);
    if (!prev) {
      plays.set(e.playId, { id: e.playId, cardId: e.cardId, remaining, duration: e.duration, hostile: e.source !== owner });
    } else if (prev.remaining !== null && (remaining === null || remaining > prev.remaining)) {
      // Mostra o efeito que dura mais tempo.
      prev.remaining = remaining;
      prev.duration = e.duration;
    }
  }
  return {
    name: p.name,
    hp: p.hp,
    mana: p.mana,
    stats: computeStats(p),
    base: p.base,
    effects: [...plays.values()],
  };
}

export function makeView(
  state: GameState,
  you: PlayerIndex,
  events: GameEvent[],
  rematch: [boolean, boolean],
  opponentConnected: boolean,
): GameView {
  const oi: PlayerIndex = you === 0 ? 1 : 0;
  const me = state.players[you];
  const opp = state.players[oi];
  return {
    time: state.time,
    you,
    winner: state.winner,
    me: { ...playerView(me, you), hand: [...me.hand], next: me.deck[0] ?? me.hand[0] },
    opp: { ...playerView(opp, oi), handCount: opp.hand.length },
    events,
    rematch,
    opponentConnected,
  };
}
