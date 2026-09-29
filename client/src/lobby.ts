import { getCard } from '../../shared/cards';
import type { ServerMsg } from '../../shared/protocol';
import { escapeHtml } from './card';
import { activeDeckIndex, deleteDeck, isComplete, listDecks, setActiveDeck } from './deck';

interface LobbyActions {
  queue(name: string): void;
  bot(name: string, level: BotLevel): void;
  create(name: string): void;
  join(code: string, name: string): void;
  leave(): void;
  /** Abre o construtor para o baralho neste espaço (vazio = baralho novo). */
  editDeck(index: number): void;
  openStats(): void;
}

export type BotLevel = 'facil' | 'normal' | 'dificil';

const NAME_KEY = 'sicknezz:name';
const BOT_LEVEL_KEY = 'sicknezz:botLevel';

function loadBotLevel(): BotLevel {
  try {
    const v = localStorage.getItem(BOT_LEVEL_KEY);
    return v === 'facil' || v === 'dificil' ? v : 'normal';
  } catch {
    return 'normal';
  }
}

function saveBotLevel(level: BotLevel) {
  try {
    localStorage.setItem(BOT_LEVEL_KEY, level);
  } catch {
    /* ignorar */
  }
}

function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignorar */
  }
}

const LOGO = '<h1 class="logo">SICK<span>NEZZ</span></h1>';

export class LobbyScreen {
  private root = document.createElement('div');

  constructor(
    private container: HTMLElement,
    private actions: LobbyActions,
  ) {
    this.root.className = 'lobby';
    this.showMenu();
  }

  showMenu(error = '') {
    const code = new URLSearchParams(location.search).get('sala') ?? '';
    this.root.innerHTML = `
      ${LOGO}
      <p class="tagline">Infeta o teu adversário antes que ele te infete a ti.</p>
      <div class="panel">
        <label>O teu nome
          <input id="name" maxlength="16" placeholder="Jogador" value="${escapeHtml(loadName())}" />
        </label>
        <button id="queue" class="btn primary big">⚔️ Procurar adversário</button>
        <div class="row">
          <button id="bot" class="btn">🤖 Treinar contra a IA</button>
          <select id="bot-level" title="Dificuldade">
            <option value="facil">Fácil</option>
            <option value="normal">Normal</option>
            <option value="dificil">Difícil</option>
          </select>
        </div>
        <div class="divider"><span>ou joga com um amigo</span></div>
        <button id="create" class="btn">Criar sala</button>
        <div class="row">
          <input id="code" maxlength="4" placeholder="CÓDIGO" value="${escapeHtml(code)}" />
          <button id="join" class="btn">Entrar</button>
        </div>
        <p class="error">${escapeHtml(error)}</p>
      </div>
      <div class="panel deck-summary"></div>
      <button id="stats" class="btn stats-btn">🏆 Estatísticas e ranking</button>`;
    const name = () => {
      const n = this.root.querySelector<HTMLInputElement>('#name')!.value.trim();
      saveName(n);
      return n;
    };
    const codeInput = this.root.querySelector<HTMLInputElement>('#code')!;
    const join = () => codeInput.value.trim() && this.actions.join(codeInput.value.trim(), name());
    this.root.querySelector('#queue')!.addEventListener('click', () => this.actions.queue(name()));
    const level = this.root.querySelector<HTMLSelectElement>('#bot-level')!;
    level.value = loadBotLevel();
    level.addEventListener('change', () => saveBotLevel(level.value as BotLevel));
    this.root.querySelector('#bot')!.addEventListener('click', () => this.actions.bot(name(), level.value as BotLevel));
    this.root.querySelector('#create')!.addEventListener('click', () => this.actions.create(name()));
    this.root.querySelector('#join')!.addEventListener('click', join);
    codeInput.addEventListener('keydown', (e) => e.key === 'Enter' && join());
    this.root.querySelector('#stats')!.addEventListener('click', () => this.actions.openStats());
    this.renderDecks();
    this.show();
  }

  /** Painel dos baralhos: espaços 1–10 (clicar escolhe; vazio cria um novo) e o baralho ativo. */
  private renderDecks() {
    const panel = this.root.querySelector<HTMLElement>('.deck-summary')!;
    const decks = listDecks();
    const active = activeDeckIndex();
    const deck = decks[active]!;
    panel.innerHTML = `
      <div class="deck-tabs">${decks
        .map(
          (d, i) =>
            `<button class="deck-tab${i === active ? ' active' : ''}${d ? '' : ' empty'}" data-i="${i}" title="${d ? escapeHtml(d.name) : 'Criar baralho novo'}">${d ? i + 1 : '+'}</button>`,
        )
        .join('')}</div>
      <div class="deck-current">
        <div>
          <div class="deck-name">${escapeHtml(deck.name)}${isComplete(deck) ? '' : ' <span class="deck-warn">⚠️ incompleto</span>'}</div>
          <div class="deck-emojis">${deck.cards
            .map((id) => `<span title="${escapeHtml(getCard(id).name)}">${getCard(id).emoji}</span>`)
            .join('')}</div>
        </div>
        <div class="deck-actions">
          <button id="edit-deck" class="btn">Editar</button>
          ${decks.filter(Boolean).length > 1 ? '<button id="delete-deck" class="btn" title="Apagar baralho">🗑️</button>' : ''}
        </div>
      </div>`;
    panel.querySelectorAll<HTMLElement>('.deck-tab').forEach((tab) =>
      tab.addEventListener('click', () => {
        const i = Number(tab.dataset.i);
        if (!decks[i]) return this.actions.editDeck(i);
        setActiveDeck(i);
        this.renderDecks();
      }),
    );
    panel.querySelector('#edit-deck')!.addEventListener('click', () => this.actions.editDeck(active));
    panel.querySelector('#delete-deck')?.addEventListener('click', () => {
      if (!confirm(`Apagar o baralho "${deck.name}"?`)) return;
      deleteDeck(active);
      this.renderDecks();
    });
  }

  showWaiting(msg: Extract<ServerMsg, { t: 'lobby' }>) {
    const link = `${location.origin}${location.pathname}?sala=${msg.code}`;
    this.root.innerHTML = `
      ${LOGO}
      <div class="panel">
        <p>Código da sala</p>
        <div class="room-code">${msg.code}</div>
        <p class="muted">Partilha o código ou o link com o teu adversário:</p>
        <input class="link" readonly value="${escapeHtml(link)}" />
        <p class="waiting">À espera do adversário<span class="dots"></span></p>
        <button id="leave" class="btn">Sair</button>
      </div>`;
    this.root.querySelector<HTMLInputElement>('.link')!.addEventListener('focus', (e) => (e.target as HTMLInputElement).select());
    this.bindLeave();
  }

  showQueue() {
    this.root.innerHTML = `
      ${LOGO}
      <div class="panel">
        <div class="searching">🦠</div>
        <p class="waiting">À procura de adversário<span class="dots"></span></p>
        <p class="muted">Partida ranked: ganhar ou perder muda os teus pontos.</p>
        <button id="leave" class="btn">Cancelar</button>
      </div>`;
    this.bindLeave();
  }

  private bindLeave() {
    this.root.querySelector('#leave')!.addEventListener('click', () => {
      this.actions.leave();
      this.showMenu();
    });
    this.show();
  }

  error(message: string) {
    const el = this.root.querySelector('.error');
    if (el) el.textContent = message;
    else this.showMenu(message);
  }

  show() {
    if (!this.root.isConnected) this.container.append(this.root);
  }

  hide() {
    this.root.remove();
  }
}
