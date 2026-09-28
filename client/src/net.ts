import type { ClientMsg, ServerMsg } from '../../shared/protocol';

export interface Connection {
  send(msg: ClientMsg): void;
}

interface Options {
  /** Mensagem enviada sempre que a ligação (re)abre. */
  hello: () => ClientMsg;
  onMessage: (msg: ServerMsg) => void;
  onStatus: (connected: boolean) => void;
}

/** Liga ao servidor e volta a ligar automaticamente se a ligação cair. */
export function connect(opts: Options): Connection {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${location.host}/ws`;
  const queue: string[] = [];
  let ws: WebSocket;
  let retries = 0;

  const open = () => {
    ws = new WebSocket(url);
    ws.addEventListener('open', () => {
      retries = 0;
      ws.send(JSON.stringify(opts.hello()));
      queue.splice(0).forEach((m) => ws.send(m));
      opts.onStatus(true);
    });
    ws.addEventListener('message', (e) => opts.onMessage(JSON.parse(e.data)));
    ws.addEventListener('close', () => {
      opts.onStatus(false);
      setTimeout(open, Math.min(5000, 500 * 2 ** retries++));
    });
  };
  open();

  return {
    send(msg) {
      const data = JSON.stringify(msg);
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
      else if (msg.t !== 'play') queue.push(data); // jogadas feitas sem ligação já não fazem sentido
    },
  };
}
