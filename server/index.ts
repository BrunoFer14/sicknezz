import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { validateDeck } from '../shared/cards';
import type { PlayerIndex } from '../shared/engine/types';
import type { ClientMsg } from '../shared/protocol';
import { Room, send } from './room';

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

const rooms = new Map<string, Room>();
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

const wss = new WebSocketServer({ server: http, path: '/ws' });

wss.on('connection', (ws) => {
  let room: Room | null = null;
  let index: PlayerIndex = 0;

  const leave = () => {
    room?.removePlayer(index);
    room = null;
  };

  const enter = (r: Room, name: string, deck: string[]) => {
    const i = r.addPlayer(ws, name, deck);
    if (i === null) return send(ws, { t: 'error', message: 'A sala está cheia ou o jogo já começou.' });
    room = r;
    index = i;
  };

  ws.on('message', (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.t === 'create' || msg.t === 'join') {
      const deckError = validateDeck(msg.deck);
      if (deckError) return send(ws, { t: 'error', message: deckError });
    }
    switch (msg.t) {
      case 'create': {
        leave();
        const code = newCode();
        const r = new Room(code, () => rooms.delete(code));
        rooms.set(code, r);
        enter(r, cleanName(msg.name), msg.deck);
        break;
      }
      case 'join': {
        const r = rooms.get(String(msg.code).toUpperCase().trim());
        if (!r) return send(ws, { t: 'error', message: 'Sala não encontrada.' });
        if (r === room) return;
        leave();
        enter(r, cleanName(msg.name), msg.deck);
        break;
      }
      case 'play':
        if (Number.isInteger(msg.handIndex)) room?.play(index, msg.handIndex);
        break;
      case 'rematch':
        room?.requestRematch(index);
        break;
      case 'leave':
        leave();
        break;
    }
  });

  ws.on('close', leave);
});

// Mantém as ligações vivas (os alojamentos cortam WebSockets sem tráfego).
setInterval(() => wss.clients.forEach((c) => c.ping()), 25_000);

http.listen(PORT, () => console.log(`Sicknezz servidor em http://localhost:${PORT}`));
