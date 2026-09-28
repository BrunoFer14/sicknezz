import { WebSocket } from 'ws';
import { CONFIG } from '../shared/engine/config';
import { createGame, other, playCard, tick } from '../shared/engine/game';
import type { GameState, PlayerIndex } from '../shared/engine/types';
import { makeView, type ServerMsg } from '../shared/protocol';

export function send(ws: WebSocket | null, msg: ServerMsg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export class Room {
  sockets: [WebSocket | null, WebSocket | null] = [null, null];
  names: [string, string] = ['', ''];
  decks: [string[], string[]] = [[], []];
  game: GameState | null = null;
  rematch: [boolean, boolean] = [false, false];
  private timer: NodeJS.Timeout | null = null;
  private last = 0;

  constructor(
    readonly code: string,
    private onEmpty: () => void,
  ) {}

  addPlayer(ws: WebSocket, name: string, deck: string[]): PlayerIndex | null {
    if (this.game) return null;
    const i = this.sockets.indexOf(null);
    if (i < 0) return null;
    const idx = i as PlayerIndex;
    this.sockets[idx] = ws;
    this.names[idx] = name;
    this.decks[idx] = deck;
    if (this.sockets[0] && this.sockets[1]) this.start();
    else this.sendLobby();
    return idx;
  }

  removePlayer(i: PlayerIndex) {
    this.sockets[i] = null;
    this.rematch = [false, false];
    if (this.game && this.game.winner === null) this.game.winner = other(i);
    if (!this.sockets[0] && !this.sockets[1]) {
      this.stop();
      this.onEmpty();
      return;
    }
    if (this.game) this.broadcast();
    else this.sendLobby();
  }

  play(i: PlayerIndex, handIndex: number) {
    if (!this.game) return;
    const result = playCard(this.game, i, handIndex);
    if (!result.ok) send(this.sockets[i], { t: 'error', message: result.reason });
    else this.broadcast();
  }

  requestRematch(i: PlayerIndex) {
    if (!this.game || this.game.winner === null || !this.sockets[other(i)]) return;
    this.rematch[i] = true;
    if (this.rematch[0] && this.rematch[1]) this.start();
    else this.broadcast();
  }

  private start() {
    this.game = createGame(this.names, this.decks);
    this.rematch = [false, false];
    this.last = performance.now();
    this.timer ??= setInterval(() => this.loop(), 1000 / CONFIG.tickRate);
    this.broadcast();
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private loop() {
    const now = performance.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    if (!this.game) return;
    tick(this.game, dt);
    this.broadcast();
  }

  private broadcast() {
    if (!this.game) return;
    const events = this.game.events;
    this.game.events = [];
    for (const i of [0, 1] as const) {
      const view = makeView(this.game, i, events, this.rematch, this.sockets[other(i)] !== null);
      send(this.sockets[i], { t: 'state', view });
    }
  }

  private sendLobby() {
    const players = this.sockets.map((s, i) => (s ? this.names[i] : null));
    this.sockets.forEach((ws, i) => send(ws, { t: 'lobby', code: this.code, you: i as PlayerIndex, players }));
  }
}
