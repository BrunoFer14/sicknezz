import './style.css';
import type { ServerMsg } from '../../shared/protocol';
import { activeDeckError, listDecks, loadDeck, saveDeck, setActiveDeck } from './deck';
import { DeckBuilder } from './deckbuilder';
import { GameScreen } from './game';
import { identity } from './identity';
import { LobbyScreen } from './lobby';
import { connect } from './net';
import { ReplayScreen } from './replay';
import { installPreview } from './preview';
import { sfx } from './sound';
import { StatsScreen } from './stats';

type Screen = 'menu' | 'waiting' | 'queue' | 'game' | 'builder' | 'stats' | 'replay';

const app = document.getElementById('app')!;
let screen: Screen = 'menu';
let game: GameScreen | null = null;
let stats: StatsScreen | null = null;
/** Onde voltar quando o replay fechar. */
let replayFrom: 'menu' | 'stats' = 'menu';

/** Pede ao servidor o replay (`at`: partida do histórico; sem `at`: a partida que acabou agora). */
function requestReplay(at?: number) {
  replayFrom = at === undefined ? 'menu' : 'stats';
  net.send({ t: 'getReplay', at });
}

function showReplay(msg: Extract<ServerMsg, { t: 'replay' }>) {
  if (game) net.send({ t: 'leave' }); // sai da sala da partida que acabou
  game?.destroy();
  game = null;
  stats?.destroy();
  stats = null;
  lobby.hide();
  screen = 'replay';
  new ReplayScreen(app, msg.replay, msg.you, () => (replayFrom === 'stats' ? openStats() : toMenu()));
}

function openStats() {
  lobby.hide();
  screen = 'stats';
  stats = new StatsScreen(
    app,
    () => {
      stats = null;
      toMenu();
    },
    (at) => requestReplay(at),
  );
  net.send({ t: 'stats' });
}

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

/** Mostra um erro se o baralho ativo estiver incompleto (ex.: uma carta foi removida do jogo). */
function deckReady(): boolean {
  const error = activeDeckError();
  if (error) lobby.error(error);
  return !error;
}

const lobby = new LobbyScreen(app, {
  queue: (name) => deckReady() && net.send({ t: 'queue', name, deck: loadDeck() }),
  bot: (name, level) => deckReady() && net.send({ t: 'bot', name, deck: loadDeck(), level }),
  create: (name) => deckReady() && net.send({ t: 'create', name, deck: loadDeck() }),
  join: (code, name) => deckReady() && net.send({ t: 'join', code, name, deck: loadDeck() }),
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
  openStats,
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
      if (screen === 'replay') break;
      if (!game) {
        if (screen === 'queue' || screen === 'waiting') sfx.found();
        lobby.hide();
        game = new GameScreen(app, net.send, exitGame, { onReplay: () => requestReplay() });
      }
      screen = 'game';
      game.update(msg.view);
      break;
    case 'stats':
      stats?.show(msg.stats);
      break;
    case 'replay':
      showReplay(msg);
      break;
    case 'error':
      if (game) game.toast(msg.message);
      else lobby.error(msg.message);
      break;
  }
}
