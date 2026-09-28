import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { validateDeck } from '../shared/cards';
import type { PlayerIndex } from '../shared/engine/types';
import type { ClientMsg } from '../shared/protocol';
import { Room, send } from './room';
import { Store, type Profile } from './store';

const PORT = Number(process.env.PORT) || 3001;
const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const store = await Store.open();

// Em produção (depois de `npm run build`) o servidor também serve o cliente.
const http = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = normalize(join(DIST, url === '/' ? 'index.html' : url));
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404).end('Corre "npm run build" primeiro, ou usa "npm run dev".');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

/** Estado de cada ligação. */
interface Conn {
  ws: WebSocket;
  session: string | null;
  profile: Profile | null;
  room: Room | null;
  index: PlayerIndex;
}

interface QueueEntry {
  conn: Conn;
  name: string;
  deck: string[];
}

const rooms = new Map<string, Room>();
const queue: QueueEntry[] = [];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function cleanName(name: unknown): string {
  return (typeof name === 'string' ? name.trim().slice(0, 16) : '') || 'Jogador';
}

function makeRoom(ranked: boolean): Room {
  const code = newCode();
  const room = new Room(code, ranked, {
    onEmpty: () => rooms.delete(code),
    onGameOver: (result) => store.recordGame(result),
  });
  rooms.set(code, room);
  return room;
}

function enter(conn: Conn, room: Room, name: string, deck: string[]) {
  const i = room.addPlayer({ ws: conn.ws, session: conn.session!, name, deck, profile: conn.profile });
  if (i === null) return send(conn.ws, { t: 'error', message: 'A sala está cheia ou o jogo já começou.' });
  conn.room = room;
  conn.index = i;
}

function leaveQueue(conn: Conn) {
  const i = queue.findIndex((q) => q.conn === conn);
  if (i >= 0) queue.splice(i, 1);
}

/** Sai da fila e da sala atual (se estiver numa partida, perde). */
function leaveAll(conn: Conn) {
  leaveQueue(conn);
  conn.room?.removePlayer(conn.index);
  conn.room = null;
}

/** Tenta voltar a pôr o jogador na partida onde estava. */
function resume(conn: Conn): boolean {
  for (const room of rooms.values()) {
    const i = room.findSession(conn.session!);
    if (i === null) continue;
    conn.room = room;
    conn.index = i;
    send(conn.ws, { t: 'welcome', resumed: true });
    room.reconnect(i, conn.ws);
    return true;
  }
  return false;
}

const wss = new WebSocketServer({ server: http, path: '/ws' });

wss.on('connection', (ws) => {
  const conn: Conn = { ws, session: null, profile: null, room: null, index: 0 };

  ws.on('message', (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.t === 'hello') {
      if (typeof msg.session !== 'string' || !/^[a-f0-9]{16,64}$/.test(msg.session)) return;
      conn.session = msg.session;
      conn.profile = store.auth(msg.profileId, msg.secret);
      if (!resume(conn)) send(ws, { t: 'welcome', resumed: false });
      return;
    }
    if (!conn.session) return; // o cliente tem de dizer "hello" primeiro

    if (msg.t === 'create' || msg.t === 'join' || msg.t === 'queue') {
      const deckError = validateDeck(msg.deck);
      if (deckError) return send(ws, { t: 'error', message: deckError });
      if (conn.profile) store.setName(conn.profile, cleanName(msg.name));
    }

    switch (msg.t) {
      case 'create':
        leaveAll(conn);
        enter(conn, makeRoom(false), cleanName(msg.name), msg.deck);
        break;
      case 'join': {
        const room = rooms.get(String(msg.code).toUpperCase().trim());
        if (!room) return send(ws, { t: 'error', message: 'Sala não encontrada.' });
        if (room === conn.room) return;
        leaveAll(conn);
        enter(conn, room, cleanName(msg.name), msg.deck);
        break;
      }
      case 'queue': {
        leaveAll(conn);
        const oi = queue.findIndex((q) => q.conn.ws.readyState === q.conn.ws.OPEN);
        if (oi < 0) {
          queue.push({ conn, name: cleanName(msg.name), deck: msg.deck });
          send(ws, { t: 'queued' });
          break;
        }
        const [opp] = queue.splice(oi, 1);
        const room = makeRoom(true);
        enter(opp.conn, room, opp.name, opp.deck);
        enter(conn, room, cleanName(msg.name), msg.deck);
        break;
      }
      case 'play':
        if (Number.isInteger(msg.handIndex)) conn.room?.play(conn.index, msg.handIndex);
        break;
      case 'rematch':
        conn.room?.requestRematch(conn.index);
        break;
      case 'leave':
        leaveAll(conn);
        break;
      case 'stats':
        send(ws, { t: 'stats', stats: store.stats(conn.profile?.id) });
        break;
    }
  });

  ws.on('close', () => {
    leaveQueue(conn);
    conn.room?.disconnect(conn.index, ws);
  });
});

// Mantém as ligações vivas (os alojamentos cortam WebSockets sem tráfego).
setInterval(() => wss.clients.forEach((c) => c.ping()), 25_000);

http.listen(PORT, () => console.log(`Sicknezz servidor em http://localhost:${PORT}`));
