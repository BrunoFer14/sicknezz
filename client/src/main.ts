import './style.css';
import type { ServerMsg } from '../../shared/protocol';
import { listDecks, loadDeck, saveDeck, setActiveDeck } from './deck';
import { DeckBuilder } from './deckbuilder';
import { GameScreen } from './game';
import { identity } from './identity';
import { LobbyScreen } from './lobby';
import { connect } from './net';
import { installPreview } from './preview';
import { sfx } from './sound';
import { StatsScreen } from './stats';

type Screen = 'menu' | 'waiting' | 'queue' | 'game' | 'builder' | 'stats';

const app = document.getElementById('app')!;
let screen: Screen = 'menu';
let game: GameScreen | null = null;
let stats: StatsScreen | null = null;

const netBanner = document.createElement('div');
netBanner.className = 'net-banner';
netBanner.textContent = 'Sem ligação ao servidor — a tentar voltar a ligar…';
netBanner.hidden = true;
document.body.append(netBanner);

const net = connect({
  hello: () => ({ t: 'hello', ...identity }),
  onMessage,
  onStatus: (connected) => (netBanner.hidden = connected),
});

const lobby = new LobbyScreen(app, {
  queue: (name) => net.send({ t: 'queue', name, deck: loadDeck() }),
  create: (name) => net.send({ t: 'create', name, deck: loadDeck() }),
  join: (code, name) => net.send({ t: 'join', code, name, deck: loadDeck() }),
  leave: () => {
    net.send({ t: 'leave' });
    screen = 'menu';
  },
  editDeck: (index) => {
    lobby.hide();
    screen = 'builder';
    const deck = listDecks()[index] ?? { name: `Baralho ${index + 1}`, cards: [] };
    new DeckBuilder(app, deck, (saved) => {
      if (saved) {
        saveDeck(index, saved);
        setActiveDeck(index);
      }
      toMenu();
    });
  },
  openStats: () => {
    lobby.hide();
    screen = 'stats';
    stats = new StatsScreen(app, () => {
      stats = null;
      toMenu();
    });
    net.send({ t: 'stats' });
  },
});

installPreview();

function toMenu(message = '') {
  game?.destroy();
  game = null;
  screen = 'menu';
  lobby.showMenu(message);
}

function exitGame() {
  net.send({ t: 'leave' });
  toMenu();
}

function onMessage(msg: ServerMsg) {
  switch (msg.t) {
    case 'welcome':
      // A ligação voltou mas a partida/sala já não existe.
      if (!msg.resumed && screen === 'game') toMenu('A partida terminou enquanto estavas sem ligação.');
      else if (!msg.resumed && (screen === 'waiting' || screen === 'queue')) toMenu('A ligação caiu. Tenta outra vez.');
      break;
    case 'lobby':
      game?.destroy();
      game = null;
      screen = 'waiting';
      lobby.showWaiting(msg);
      break;
    case 'queued':
      screen = 'queue';
      lobby.showQueue();
      break;
    case 'state':
      if (!game) {
        if (screen === 'queue' || screen === 'waiting') sfx.found();
        lobby.hide();
        game = new GameScreen(app, net.send, exitGame);
      }
      screen = 'game';
      game.update(msg.view);
      break;
    case 'stats':
      stats?.show(msg.stats);
      break;
    case 'error':
      if (game) game.toast(msg.message);
      else lobby.error(msg.message);
      break;
  }
}
