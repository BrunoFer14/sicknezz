import { CARD_IDS, CARD_TYPES, getCard } from '../../shared/cards';
import { CONFIG } from '../../shared/engine/config';
import type { CardType } from '../../shared/engine/types';
import { cardEl, escapeHtml } from './card';
import { decodeDeck, encodeDeck, type SavedDeck } from './deck';
import { cardRoles, ROLES, type Role } from './roles';

const TYPE_ORDER = Object.keys(CARD_TYPES) as CardType[];

/** Ordena por tipo e depois por custo. */
const sortCards = (ids: readonly string[]) =>
  [...ids].sort((a, b) => {
    const ca = getCard(a), cb = getCard(b);
    return TYPE_ORDER.indexOf(ca.type) - TYPE_ORDER.indexOf(cb.type) || ca.cost - cb.cost;
  });

type CostRange = 'low' | 'mid' | 'high';

const COSTS: [CostRange, string, (cost: number) => boolean][] = [
  ['low', '1–2', (c) => c <= 2],
  ['mid', '3–4', (c) => c >= 3 && c <= 4],
  ['high', '5+', (c) => c >= 5],
];

type FilterGroup = 'role' | 'cost';
/** Aba ativa: uma classe de cartas, ou todas. */
type Tab = CardType | 'all';

/** Sem acentos nem maiúsculas, para a pesquisa ("sepsis" encontra "Sépsis"). */
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export class DeckBuilder {
  private root = document.createElement('div');
  private deck: string[];
  /** Aba da classe que se está a ver; a pesquisa procura em todas. */
  private tab: Tab = TYPE_ORDER[0];
  /** Filtros ativos por grupo ('all' = sem filtro); combinam-se todos. */
  private filters: Record<FilterGroup, string> = { role: 'all', cost: 'all' };
  private search = '';

  constructor(
    container: HTMLElement,
    deck: SavedDeck,
    private onDone: (deck: SavedDeck | null) => void,
  ) {
    this.deck = [...deck.cards];
    this.root.className = 'builder';
    this.root.innerHTML = `
      <header class="builder-head">
        <button class="btn" id="back">← Voltar</button>
        <div class="builder-title">
          <input class="deck-name-input" maxlength="24" placeholder="Nome do baralho" value="${escapeHtml(deck.name)}" />
          <span class="builder-stats"></span>
        </div>
        <button class="btn primary" id="save">Guardar</button>
      </header>
      <p class="muted">Clica numa carta para a juntar ou tirar do baralho. Tens de escolher ${CONFIG.deckSize}. <a href="/cartas" target="_blank" rel="noopener">📖 Saber mais sobre cada carta</a></p>
      <div class="deck-slots"></div>
      <div class="deck-code">
        <button class="btn" id="copy-code" title="Copiar um código com as cartas deste baralho, para partilhar">📋 Copiar código</button>
        <button class="btn" id="paste-code" title="Colar o código de um baralho de outra pessoa">📥 Colar código</button>
      </div>
      <div class="filter-box">
        <input class="card-search" type="search" placeholder="🔎 Procurar em todas as cartas..." />
        <div class="filters" data-group="role"><span class="filter-label">Efeito</span></div>
        <div class="filters" data-group="cost"><span class="filter-label">Custo</span></div>
      </div>
      <nav class="type-tabs"></nav>
      <div class="pool"></div>`;

    this.root.querySelector('#back')!.addEventListener('click', () => this.close(null));
    this.root.querySelector('#save')!.addEventListener('click', () =>
      this.close({ name: this.root.querySelector<HTMLInputElement>('.deck-name-input')!.value, cards: this.deck }),
    );

    this.root.querySelector('#copy-code')!.addEventListener('click', () => this.copyCode());
    this.root.querySelector('#paste-code')!.addEventListener('click', () => this.pasteCode());

    const tabs = this.root.querySelector('.type-tabs')!;
    for (const t of [...TYPE_ORDER, 'all'] as Tab[]) {
      const [emoji, name] = t === 'all' ? ['📚', 'Todas'] : [CARD_TYPES[t].emoji, CARD_TYPES[t].name];
      const b = document.createElement('button');
      b.className = 'type-tab';
      b.dataset.tab = t;
      b.innerHTML = `<span class="tab-emoji">${emoji}</span><span class="tab-name">${name}</span><span class="tab-count"></span>`;
      b.addEventListener('click', () => {
        this.tab = t;
        // Mudar de aba limpa a pesquisa, senão a aba escolhida não se veria.
        this.search = '';
        this.root.querySelector<HTMLInputElement>('.card-search')!.value = '';
        this.render();
      });
      tabs.append(b);
    }

    const groups: Record<FilterGroup, [string, string][]> = {
      role: ROLES,
      cost: COSTS.map(([v, label]) => [v, label]),
    };
    for (const group of Object.keys(groups) as FilterGroup[]) {
      const row = this.root.querySelector(`.filters[data-group="${group}"]`)!;
      for (const [value, label] of [['all', 'Todas'], ...groups[group]]) {
        const b = document.createElement('button');
        b.className = 'chip';
        b.dataset.filter = value;
        b.textContent = label;
        b.addEventListener('click', () => {
          this.filters[group] = value;
          this.render();
        });
        row.append(b);
      }
    }
    this.root.querySelector<HTMLInputElement>('.card-search')!.addEventListener('input', (e) => {
      this.search = (e.target as HTMLInputElement).value;
      this.render();
    });

    container.append(this.root);
    this.render();
  }

  private matches(id: string): boolean {
    const card = getCard(id);
    const { role, cost } = this.filters;
    const q = normalize(this.search.trim());
    if (!q && this.tab !== 'all' && card.type !== this.tab) return false;
    if (role !== 'all' && !cardRoles(id).has(role as Role)) return false;
    if (cost !== 'all' && !COSTS.find(([v]) => v === cost)![2](card.cost)) return false;
    return !q || normalize(card.name).includes(q) || normalize(card.description).includes(q);
  }

  private async copyCode() {
    const btn = this.root.querySelector<HTMLButtonElement>('#copy-code')!;
    const code = encodeDeck(this.deck);
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = '✅ Copiado!';
      setTimeout(() => (btn.textContent = '📋 Copiar código'), 1500);
    } catch {
      // Sem acesso à área de transferência: mostra o código para copiar à mão.
      prompt('Copia este código:', code);
    }
  }

  private pasteCode() {
    const code = prompt('Cola aqui o código do baralho:');
    if (!code) return;
    const cards = decodeDeck(code);
    if (!cards) return alert('Código inválido. Confirma que o copiaste todo.');
    this.deck = cards;
    this.render();
    if (cards.length < CONFIG.deckSize) alert(`O código só tem ${cards.length} cartas: escolhe mais ${CONFIG.deckSize - cards.length}.`);
  }

  private close(deck: SavedDeck | null) {
    this.root.remove();
    this.onDone(deck);
  }

  private toggle(id: string) {
    if (this.deck.includes(id)) this.deck = this.deck.filter((d) => d !== id);
    else if (this.deck.length < CONFIG.deckSize) this.deck.push(id);
    this.render();
  }

  private render() {
    const full = this.deck.length === CONFIG.deckSize;
    const avg = this.deck.length ? this.deck.reduce((s, id) => s + getCard(id).cost, 0) / this.deck.length : 0;
    this.root.querySelector('.builder-stats')!.textContent =
      `${this.deck.length}/${CONFIG.deckSize} cartas · custo médio ${avg.toFixed(1).replace('.', ',')}`;
    (this.root.querySelector('#save') as HTMLButtonElement).disabled = !full;

    const slots = this.root.querySelector('.deck-slots')!;
    slots.replaceChildren();
    const sorted = sortCards(this.deck);
    for (let i = 0; i < CONFIG.deckSize; i++) {
      const id = sorted[i];
      const slot = document.createElement('div');
      slot.className = 'deck-slot';
      if (id) {
        slot.append(cardEl(id, 'mini'));
        slot.title = 'Tirar do baralho';
        slot.addEventListener('click', () => this.toggle(id));
      }
      slots.append(slot);
    }

    this.root.querySelectorAll<HTMLElement>('.filters').forEach((row) => {
      const active = this.filters[row.dataset.group as FilterGroup];
      row.querySelectorAll<HTMLElement>('.chip').forEach((c) => c.classList.toggle('active', c.dataset.filter === active));
    });

    // Na pesquisa nenhuma aba fica ativa: procura-se em todas as classes.
    const searching = !!this.search.trim();
    this.root.querySelectorAll<HTMLElement>('.type-tab').forEach((b) => {
      const t = b.dataset.tab as Tab;
      b.classList.toggle('active', !searching && t === this.tab);
      const inDeck = this.deck.filter((id) => t === 'all' || getCard(id).type === t).length;
      b.querySelector('.tab-count')!.textContent = inDeck ? String(inDeck) : '';
    });

    const pool = this.root.querySelector('.pool')!;
    pool.replaceChildren();
    const shown = sortCards(CARD_IDS).filter((id) => this.matches(id));
    if (!shown.length) pool.innerHTML = '<p class="muted pool-empty">Nenhuma carta com estes filtros.</p>';
    // Com várias classes à mostra (aba Todas ou pesquisa), separa-as com um título.
    const grouped = searching || this.tab === 'all';
    let lastType: CardType | null = null;
    for (const id of shown) {
      const type = getCard(id).type;
      if (grouped && type !== lastType) {
        const h = document.createElement('h3');
        h.className = 'pool-heading';
        h.textContent = `${CARD_TYPES[type].emoji} ${CARD_TYPES[type].name}`;
        pool.append(h);
        lastType = type;
      }
      const el = cardEl(id);
      const inDeck = this.deck.includes(id);
      el.classList.toggle('in-deck', inDeck);
      el.classList.toggle('blocked', !inDeck && full);
      el.addEventListener('click', () => this.toggle(id));
      pool.append(el);
    }
  }
}
