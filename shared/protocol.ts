// Mensagens trocadas entre cliente e servidor + a "vista" do jogo que cada jogador recebe.
import { getCard } from './cards';
import { computeStats } from './engine/stats';
import { cardCost, forbiddenTypes, lockedSlots, maxPlayableCost } from './engine/game';
import type { ReplayData } from './engine/replay';
import type { GameEvent, GameState, PlayerIndex, PlayerState, Side, Stats } from './engine/types';

/** Baralhos guardados de um jogador (os 10 espaços e qual está ativo). */
export interface DecksData {
  active: number;
  decks: ({ name: string; cards: string[] } | null)[];
}

/** Conta Google ligada ao perfil. */
export interface AccountInfo {
  name: string;
  /** Baralhos guardados na conta (null se ainda não tiver). */
  decks: DecksData | null;
}

export type ClientMsg =
  /** Primeira mensagem de cada ligação. `session` identifica o separador (reconexão), `profileId`/`secret` o jogador (estatísticas). */
  | { t: 'hello'; session: string; profileId: string; secret: string }
  | { t: 'create'; name: string; deck: string[] }
  | { t: 'join'; code: string; name: string; deck: string[] }
  /** Entrar na fila de matchmaking (conta para o ranking). */
  | { t: 'queue'; name: string; deck: string[] }
  /** Jogar contra a IA. */
  | { t: 'bot'; name: string; deck: string[]; level: 'facil' | 'normal' | 'dificil' }
  /** `side`: área onde a carta foi largada (só conta para cartas que se jogam em qualquer lado). */
  | { t: 'play'; handIndex: number; side?: Side }
  | { t: 'surrender' }
  /** Login com Google: `credential` é o token que o botão da Google devolve. */
  | { t: 'login'; credential: string }
  | { t: 'logout' }
  /** Guarda os baralhos na conta (só com login). */
  | { t: 'saveDecks'; decks: DecksData }
  /** Pede um replay: `at` = partida do histórico; sem `at`, a última partida (da sala atual ou do histórico). */
  | { t: 'getReplay'; at?: number }
  | { t: 'rematch' }
  | { t: 'leave' }
  | { t: 'stats' };

export type ServerMsg =
  /** `resumed`: voltaste a entrar numa partida que estava a decorrer. */
  /** `googleClientId`: null se o login com Google não estiver configurado no servidor. */
  | { t: 'welcome'; resumed: boolean; googleClientId: string | null; account: AccountInfo | null }
  /** Login feito: o cliente passa a identificar-se com este perfil/segredo neste dispositivo. */
  | { t: 'account'; profileId: string; secret: string; account: AccountInfo }
  | { t: 'lobby'; code: string; you: PlayerIndex; players: (string | null)[] }
  | { t: 'queued' }
  | { t: 'state'; view: GameView }
  | { t: 'stats'; stats: StatsPayload }
  /** `you`: o teu lugar nessa partida. */
  | { t: 'replay'; replay: ReplayData; you: PlayerIndex }
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
  energy: number;
  stats: Stats;
  base: Stats;
  effects: EffectView[];
}

export interface GameView {
  time: number;
  you: PlayerIndex;
  winner: PlayerIndex | 'draw' | null;
  /** `costs`: custo atual de cada carta da mão; `borrowed`: cartas emprestadas pelo Alzheimer. */
  me: PlayerView & {
    hand: string[];
    costs: number[];
    borrowed: boolean[];
    next: string;
    /** Custo máximo que podes jogar agora (Fratura), ou null. */
    maxCost: number | null;
    /** Cartas da mão bloqueadas (AVC, Quarentena). */
    locked: boolean[];
    /** Paranoia: não vês as tuas doenças. */
    blind: boolean;
  };
  /** O adversário não vê as tuas cartas, só quantas tens. */
  /** `hand` só existe nos replays (lá vê-se a mão do adversário). */
  opp: PlayerView & { handCount: number; hand?: string[] };
  events: GameEvent[];
  rematch: [boolean, boolean];
  opponentConnected: boolean;
  /** Segundos que faltam para o adversário desligado perder a partida. */
  opponentReconnectIn: number | null;
  ranked: boolean;
  /** Os teus pontos de ranking (partidas ranked). */
  rating: number | null;
  /** Pontos ganhos/perdidos nesta partida, depois de acabar. */
  ratingDelta: number | null;
}

export interface ViewExtras {
  rematch: [boolean, boolean];
  opponentConnected: boolean;
  opponentReconnectIn: number | null;
  ranked: boolean;
  rating: number | null;
  ratingDelta: number | null;
}

// ---------- Estatísticas ----------

export interface ProfileStats {
  name: string;
  rating: number;
  games: number;
  rankedGames: number;
  wins: number;
  losses: number;
  draws: number;
  /** Quantas vezes jogaste cada carta. */
  cardPlays: Record<string, number>;
}

export interface LeaderboardRow {
  name: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  me: boolean;
}

export interface CardStatRow {
  cardId: string;
  /** Vezes que a carta foi jogada. */
  plays: number;
  /** Partidas em que estava no baralho. */
  games: number;
  /** Partidas ganhas com a carta no baralho. */
  wins: number;
}

/** Uma partida no histórico de um jogador. */
export interface MatchRecord {
  /** Quando acabou (Date.now()). */
  at: number;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  mode: 'ranked' | 'friendly' | 'bot';
  /** Duração em segundos. */
  duration: number;
  ratingDelta: number | null;
  deck: string[];
  surrendered: 'me' | 'opp' | null;
  /** O teu lugar nessa partida (0 ou 1). */
  you?: PlayerIndex;
  /** Há replay guardado desta partida. */
  hasReplay?: boolean;
}

export interface StatsPayload {
  me: ProfileStats | null;
  /** As tuas últimas partidas (mais recente primeiro). */
  history: MatchRecord[];
  leaderboard: LeaderboardRow[];
  cards: CardStatRow[];
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
    energy: p.energy,
    stats: computeStats(p),
    base: p.base,
    effects: [...plays.values()],
  };
}

export function makeView(state: GameState, you: PlayerIndex, events: GameEvent[], extras: ViewExtras): GameView {
  const oi: PlayerIndex = you === 0 ? 1 : 0;
  const me = state.players[you];
  const opp = state.players[oi];
  const mine = playerView(me, you);
  // Paranoia: escondem-se as tuas doenças (menos a própria Paranoia) e as cartas que o adversário te jogou.
  const blindPlays = new Set(me.effects.filter((e) => e.mechanic === 'blind' && e.source !== you).map((e) => e.playId));
  const blind = blindPlays.size > 0;
  if (blind) {
    mine.effects = mine.effects.filter((e) => !e.hostile || blindPlays.has(e.id));
    events = events.filter((e) => !(e.type === 'played' && e.player !== you && e.target === you) && !(e.type === 'cured' && e.player === you));
  }
  return {
    time: state.time,
    you,
    winner: state.winner,
    me: {
      ...mine,
      hand: [...me.hand],
      costs: me.hand.map((id) => cardCost(me, id)),
      borrowed: [...me.borrowed],
      next: me.deck[0] ?? me.hand[0],
      maxCost: maxPlayableCost(me),
      locked: me.hand.map((id, i) => lockedSlots(me).has(i) || forbiddenTypes(me).has(getCard(id).type)),
      blind,
    },
    opp: { ...playerView(opp, oi), handCount: opp.hand.length },
    events,
    ...extras,
  };
}
