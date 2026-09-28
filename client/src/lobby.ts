import { getCard } from '../../shared/cards';
import type { ServerMsg } from '../../shared/protocol';
import { escapeHtml } from './card';
import { loadDeck } from './deck';

interface LobbyActions {
  create(name: string): void;
  join(code: string, name: string): void;
  leave(): void;
  editDeck(): void;
}

const NAME_KEY = 'sicknezz:name';

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
      <h1 class="logo">SICK<span>NEZZ</span></h1>
      <p class="tagline">Infeta o teu adversário antes que ele te infete a ti.</p>
      <div class="panel">
        <label>O teu nome
          <input id="name" maxlength="16" placeholder="Jogador" value="${escapeHtml(loadName())}" />
        </label>
        <button id="create" class="btn primary">Criar sala</button>
        <div class="divider"><span>ou</span></div>
        <div class="row">
          <input id="code" maxlength="4" placeholder="CÓDIGO" value="${escapeHtml(code)}" />
          <button id="join" class="btn">Entrar</button>
        </div>
        <p class="error">${escapeHtml(error)}</p>
      </div>
      <div class="panel deck-summary">
        <div class="deck-emojis">${loadDeck()
          .map((id) => `<span title="${escapeHtml(getCard(id).name)}">${getCard(id).emoji}</span>`)
          .join('')}</div>
        <button id="edit-deck" class="btn">Editar baralho</button>
      </div>`;
    this.root.querySelector('#edit-deck')!.addEventListener('click', () => this.actions.editDeck());
    const name = () => {
      const n = this.root.querySelector<HTMLInputElement>('#name')!.value.trim();
      saveName(n);
      return n;
    };
    const codeInput = this.root.querySelector<HTMLInputElement>('#code')!;
    this.root.querySelector('#create')!.addEventListener('click', () => this.actions.create(name()));
    const join = () => codeInput.value.trim() && this.actions.join(codeInput.value.trim(), name());
    this.root.querySelector('#join')!.addEventListener('click', join);
    codeInput.addEventListener('keydown', (e) => e.key === 'Enter' && join());
    this.show();
  }

  showWaiting(msg: Extract<ServerMsg, { t: 'lobby' }>) {
    const link = `${location.origin}${location.pathname}?sala=${msg.code}`;
    this.root.innerHTML = `
      <h1 class="logo">SICK<span>NEZZ</span></h1>
      <div class="panel">
        <p>Código da sala</p>
        <div class="room-code">${msg.code}</div>
        <p class="muted">Partilha o código ou o link com o teu adversário:</p>
        <input class="link" readonly value="${escapeHtml(link)}" />
        <p class="waiting">À espera do adversário<span class="dots"></span></p>
        <button id="leave" class="btn">Sair</button>
      </div>`;
    this.root.querySelector<HTMLInputElement>('.link')!.addEventListener('focus', (e) => (e.target as HTMLInputElement).select());
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
