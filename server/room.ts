import { WebSocket } from 'ws';
import { CONFIG } from '../shared/engine/config';
import { createGame, other, playCard, tick } from '../shared/engine/game';
import type { GameState, PlayerIndex, Side } from '../shared/engine/types';
import { makeView, type ServerMsg } from '../shared/protocol';
import { Bot, BOT_LEVELS, botDeck, type BotLevel } from './bot';
import type { GameMode, GameResult, Profile } from './store';

/** Segundos que um jogador desligado tem para voltar antes de perder a partida. */
const RECONNECT_GRACE = 30;

export function send(ws: WebSocket | null, msg: ServerMsg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export interface Seat {
  /** null enquanto o jogador está desligado (à espera de reconexão). */
  ws: WebSocket | null;
  session: string;
  name: string;
  deck: string[];
  profile: Profile | null;
  graceUntil: number | null;
  graceTimer: NodeJS.Timeout | null;
  /** Lugar ocupado pela IA (modo contra o computador). */
  bot?: Bot;
}

export interface RoomHooks {
  onEmpty(): void;
  /** Chamado uma vez quando uma partida acaba. Devolve os pontos de ranking ganhos/perdidos. */
  onGameOver(result: GameResult): [number, number] | null;
}

export class Room {
  seats: [Seat | null, Seat | null] = [null, null];
  game: GameState | null = null;
  rematch: [boolean, boolean] = [false, false];
  /** Jogadores no início da partida (para as estatísticas, mesmo que alguém saia). */
  private players: [Seat, Seat] | null = null;
  private plays: [Record<string, number>, Record<string, number>] = [{}, {}];
  private ratingDelta: [number, number] | null = null;
  private recorded = false;
  /** Quem desistiu nesta partida (para o histórico). */
  private surrendered: PlayerIndex | null = null;
  private timer: NodeJS.Timeout | null = null;
  private last = 0;

  constructor(
    readonly code: string,
    readonly mode: GameMode,
    private hooks: RoomHooks,
  ) {}

  get ranked(): boolean {
    return this.mode === 'ranked';
  }

  /** Põe a IA no segundo lugar (chamar antes de o jogador entrar). */
  addBot(level: BotLevel) {
    this.seats[1] = {
      ws: null,
      session: 'bot',
      name: `🤖 IA ${BOT_LEVELS[level].name}`,
      deck: botDeck(),
      profile: null,
      graceUntil: null,
      graceTimer: null,
      bot: new Bot(level, 1),
    };
  }

  /** Há alguém humano na sala? */
  private hasHumans(): boolean {
    return this.seats.some((s) => s && !s.bot);
  }

  addPlayer(seat: Omit<Seat, 'graceUntil' | 'graceTimer'>): PlayerIndex | null {
    if (this.game) return null;
    const i = this.seats.indexOf(null);
    if (i < 0) return null;
    const idx = i as PlayerIndex;
    this.seats[idx] = { ...seat, graceUntil: null, graceTimer: null };
    if (this.seats[0] && this.seats[1]) this.start();
    else this.sendLobby();
    return idx;
  }

  findSession(session: string): PlayerIndex | null {
    const i = this.seats.findIndex((s) => s?.session === session);
    return i < 0 ? null : (i as PlayerIndex);
  }

  /** Um jogador voltou a ligar-se (ou abriu a partida noutro separador). */
  reconnect(i: PlayerIndex, ws: WebSocket) {
    const s = this.seats[i];
    if (!s) return;
    if (s.ws && s.ws !== ws) {
      send(s.ws, { t: 'error', message: 'A partida foi aberta noutra janela.' });
      s.ws.close();
    }
    s.ws = ws;
    this.clearGrace(s);
    if (this.game) this.broadcast();
    else this.sendLobby();
  }

  /** A ligação caiu. Durante uma partida, o jogador tem uns segundos para voltar. */
  disconnect(i: PlayerIndex, ws: WebSocket) {
    const s = this.seats[i];
    if (!s || s.ws !== ws) return;
    if (this.game && this.game.winner === null) {
      s.ws = null;
      s.graceUntil = Date.now() + RECONNECT_GRACE * 1000;
      s.graceTimer = setTimeout(() => this.removePlayer(i), RECONNECT_GRACE * 1000);
      this.broadcast();
    } else {
      this.removePlayer(i);
    }
  }

  /** O jogador saiu de vez. Se a partida estiver a decorrer, perde. */
  removePlayer(i: PlayerIndex) {
    const s = this.seats[i];
    if (!s) return;
    this.clearGrace(s);
    this.seats[i] = null;
    this.rematch = [false, false];
    if (this.game && this.game.winner === null) {
      this.game.winner = other(i);
      this.checkGameOver();
    }
    if (!this.hasHumans()) {
      this.stop();
      this.hooks.onEmpty();
      return;
    }
    if (this.game) this.broadcast();
    else this.sendLobby();
  }

  play(i: PlayerIndex, handIndex: number, side: Side) {
    if (!this.game) return;
    const cardId = this.game.players[i].hand[handIndex];
    const result = playCard(this.game, i, handIndex, side);
    if (!result.ok) {
      send(this.seats[i]?.ws ?? null, { t: 'error', message: result.reason });
      return;
    }
    this.plays[i][cardId] = (this.plays[i][cardId] ?? 0) + 1;
    this.checkGameOver();
    this.broadcast();
  }

  /** O jogador desiste: perde a partida (conta para o ranking como uma derrota normal). */
  surrender(i: PlayerIndex) {
    if (!this.game || this.game.winner !== null) return;
    this.game.winner = other(i);
    this.surrendered = i;
    this.game.events.push({ type: 'surrender', player: i });
    this.checkGameOver();
    this.broadcast();
  }

  requestRematch(i: PlayerIndex) {
    const opp = this.seats[other(i)];
    if (!this.game || this.game.winner === null || !(opp?.ws || opp?.bot)) return;
    this.rematch[i] = true;
    if (opp.bot) this.rematch[other(i)] = true; // a IA aceita sempre
    if (this.rematch[0] && this.rematch[1]) this.start();
    else this.broadcast();
  }

  private clearGrace(s: Seat) {
    if (s.graceTimer) clearTimeout(s.graceTimer);
    s.graceTimer = null;
    s.graceUntil = null;
  }

  private start() {
    const [a, b] = this.seats as [Seat, Seat];
    this.players = [a, b];
    if (b.bot) {
      b.deck = botDeck();
      b.bot = new Bot(b.bot.level, 1);
    }
    this.game = createGame([a.name, b.name], [a.deck, b.deck]);
    this.surrendered = null;
    this.rematch = [false, false];
    this.plays = [{}, {}];
    this.ratingDelta = null;
    this.recorded = false;
    this.last = performance.now();
    this.timer ??= setInterval(() => this.loop(), 1000 / CONFIG.tickRate);
    this.broadcast();
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private checkGameOver() {
    if (!this.game || this.game.winner === null || this.recorded || !this.players) return;
    this.recorded = true;
    const [a, b] = this.players;
    this.ratingDelta = this.hooks.onGameOver({
      profiles: [a.profile, b.profile],
      names: [a.name, b.name],
      decks: [a.deck, b.deck],
      plays: this.plays,
      winner: this.game.winner,
      mode: this.mode,
      duration: Math.max(0, this.game.time),
      surrendered: this.surrendered,
    });
  }

  private loop() {
    const now = performance.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    if (!this.game || this.game.winner !== null) return;
    tick(this.game, dt);
    this.seats.forEach((s, i) => {
      const move = s?.bot?.think(this.game!, dt);
      if (move && this.game!.winner === null) this.play(i as PlayerIndex, move.handIndex, move.side);
    });
    this.checkGameOver();
    this.broadcast();
  }

  private broadcast() {
    if (!this.game) return;
    const events = this.game.events;
    this.game.events = [];
    for (const i of [0, 1] as const) {
      const seat = this.seats[i];
      if (!seat?.ws) continue;
      const opp = this.seats[other(i)];
      const view = makeView(this.game, i, events, {
        rematch: this.rematch,
        opponentConnected: !!(opp?.ws || opp?.bot),
        opponentReconnectIn: opp && !opp.ws && opp.graceUntil ? Math.max(0, (opp.graceUntil - Date.now()) / 1000) : null,
        ranked: this.ranked,
        rating: this.ranked ? (this.players?.[i].profile?.rating ?? null) : null,
        ratingDelta: this.ratingDelta?.[i] ?? null,
      });
      send(seat.ws, { t: 'state', view });
    }
  }

  private sendLobby() {
    const players = this.seats.map((s) => s?.name ?? null);
    this.seats.forEach((s, i) => send(s?.ws ?? null, { t: 'lobby', code: this.code, you: i as PlayerIndex, players }));
  }
}
