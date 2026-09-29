import './style.css';
import type { AccountInfo, ServerMsg } from '../../shared/protocol';
import { activeDeckError, exportDecks, importDecks, listDecks, loadDeck, onDecksChange, saveDeck, setActiveDeck } from './deck';
import { CardsScreen } from './cardpage';
import { DeckBuilder } from './deckbuilder';
import { GameScreen } from './game';
import { identity, resetIdentity, setIdentity } from './identity';
import { LobbyScreen } from './lobby';
import { LoginScreen } from './login';
import { connect } from './net';
import { ReplayScreen } from './replay';
import { installPreview } from './preview';
import { sfx } from './sound';
import { StatsScreen } from './stats';

type Screen = 'login' | 'menu' | 'waiting' | 'queue' | 'game' | 'builder' | 'stats' | 'replay' | 'cards';

const app = document.getElementById('app')!;
let screen: Screen = 'login';
let game: GameScreen | null = null;
let stats: StatsScreen | null = null;
let cards: CardsScreen | null = null;
/** Login com Google: se o servidor o tiver configurado e se há sessão iniciada. */
let googleClientId: string | null = null;
let accountName: string | null = null;
/** Já chegou a primeira resposta do servidor (até lá mostra "a ligar"). */
let welcomed = false;

/** Com o login da Google configurado no servidor, é obrigatório ter sessão iniciada para jogar. */
const needsLogin = () => !welcomed || (googleClientId !== null && !accountName);

// Com sessão iniciada, os baralhos ficam guardados na conta.
onDecksChange((decks) => {
  if (accountName) net.send({ t: 'saveDecks', decks });
});

/** Recebeu a conta do servidor: usa os baralhos dela (ou envia os deste browser, se a conta ainda não tiver). */
function applyAccount(account: AccountInfo | null) {
  accountName = account?.name ?? null;
  if (!account) return;
  if (account.decks) importDecks(account.decks);
  else net.send({ t: 'saveDecks', decks: exportDecks() });
}

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
  openCards: () => navigate('/cartas'),
  accountName: () => accountName,
  logout: () => {
    net.send({ t: 'logout' });
    resetIdentity();
    location.reload(); // volta ao ecrã de entrada
  },
});
lobby.hide();
const login = new LoginScreen(app, (credential) => net.send({ t: 'login', credential }));

installPreview();
queueMicrotask(route); // abre logo /cartas se for esse o endereço

// ---------- Páginas das cartas (/cartas e /cartas/<id>) ----------

/** Muda de endereço sem recarregar a página. */
function navigate(path: string) {
  if (location.pathname !== path) history.pushState(null, '', path);
  route();
}

/** Mostra o ecrã certo para o endereço atual. Durante uma partida ou replay não sai deles. */
function route() {
  if (screen === 'game' || screen === 'replay') return;
  const m = location.pathname.match(/^\/cartas(?:\/([\w-]+))?\/?$/);
  cards?.destroy();
  cards = null;
  if (!m) {
    if (screen === 'cards') toMenu();
    return;
  }
  lobby.hide();
  login.hide();
  stats?.destroy();
  stats = null;
  screen = 'cards';
  cards = new CardsScreen(app, m[1] ?? null, navigate);
  if (m[1]) net.send({ t: 'stats' });
}

window.addEventListener('popstate', route);

function toMenu(message = '') {
  game?.destroy();
  game = null;
  cards?.destroy();
  cards = null;
  if (location.pathname !== '/') history.pushState(null, '', '/' + location.search);
  if (needsLogin()) {
    screen = 'login';
    lobby.hide();
    if (welcomed && googleClientId) login.show(googleClientId, message);
    else login.showConnecting();
    return;
  }
  login.hide();
  screen = 'menu';
  lobby.showMenu(message);
}

function exitGame() {
  net.send({ t: 'leave' });
  toMenu();
}

function onMessage(msg: ServerMsg) {
  switch (msg.t) {
    case 'account':
      setIdentity(msg.profileId, msg.secret);
      applyAccount(msg.account);
      if (screen === 'login' || screen === 'menu') toMenu();
      break;
    case 'welcome':
      welcomed = true;
      googleClientId = msg.googleClientId;
      applyAccount(msg.account);
      if ((screen === 'login' || screen === 'menu') && !msg.resumed) toMenu();
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
        cards?.destroy();
        cards = null;
        if (screen === 'queue' || screen === 'waiting') sfx.found();
        lobby.hide();
        login.hide();
        game = new GameScreen(app, net.send, exitGame, { onReplay: () => requestReplay() });
      }
      screen = 'game';
      game.update(msg.view);
      break;
    case 'stats':
      stats?.show(msg.stats);
      cards?.showStats(msg.stats);
      break;
    case 'replay':
      showReplay(msg);
      break;
    case 'error':
      if (game) game.toast(msg.message);
      else if (screen === 'login' && googleClientId) login.show(googleClientId, msg.message);
      else lobby.error(msg.message);
      break;
  }
}
