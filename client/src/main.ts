import './style.css';
import type { ServerMsg } from '../../shared/protocol';
import { loadDeck, saveDeck } from './deck';
import { DeckBuilder } from './deckbuilder';
import { GameScreen } from './game';
import { LobbyScreen } from './lobby';
import { connect } from './net';

const app = document.getElementById('app')!;
let game: GameScreen | null = null;

const net = connect(onMessage, () => {
  app.innerHTML = `
    <div class="lobby"><div class="panel">
      <p>Perdeste a ligação ao servidor.</p>
      <button class="btn primary" onclick="location.reload()">Voltar a ligar</button>
    </div></div>`;
});

const lobby = new LobbyScreen(app, {
  create: (name) => net.send({ t: 'create', name, deck: loadDeck() }),
  join: (code, name) => net.send({ t: 'join', code, name, deck: loadDeck() }),
  leave: () => net.send({ t: 'leave' }),
  editDeck: () => {
    lobby.hide();
    new DeckBuilder(app, loadDeck(), (deck) => {
      if (deck) saveDeck(deck);
      lobby.showMenu();
    });
  },
});

function exitGame() {
  net.send({ t: 'leave' });
  game?.destroy();
  game = null;
  lobby.showMenu();
}

function onMessage(msg: ServerMsg) {
  switch (msg.t) {
    case 'lobby':
      game?.destroy();
      game = null;
      lobby.showWaiting(msg);
      break;
    case 'state':
      if (!game) {
        lobby.hide();
        game = new GameScreen(app, net.send, exitGame);
      }
      game.update(msg.view);
      break;
    case 'error':
      if (game) game.toast(msg.message);
      else lobby.error(msg.message);
      break;
  }
}
