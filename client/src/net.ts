import type { ClientMsg, ServerMsg } from '../../shared/protocol';

export interface Connection {
  send(msg: ClientMsg): void;
}

export function connect(onMessage: (msg: ServerMsg) => void, onClose: () => void): Connection {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  const queue: string[] = [];

  ws.addEventListener('open', () => queue.splice(0).forEach((m) => ws.send(m)));
  ws.addEventListener('message', (e) => onMessage(JSON.parse(e.data)));
  ws.addEventListener('close', onClose);

  return {
    send(msg) {
      const data = JSON.stringify(msg);
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
      else queue.push(data);
    },
  };
}
