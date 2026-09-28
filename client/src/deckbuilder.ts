import { CARD_IDS, CARD_TYPES, getCard } from '../../shared/cards';
import { CONFIG } from '../../shared/engine/config';
import type { CardType } from '../../shared/engine/types';
import { cardEl, escapeHtml } from './card';
import type { SavedDeck } from './deck';

const TYPE_ORDER = Object.keys(CARD_TYPES) as CardType[];

/** Ordena por tipo e depois por custo. */
const sortCards = (ids: readonly string[]) =>
  [...ids].sort((a, b) => {
    const ca = getCard(a), cb = getCard(b);
    return TYPE_ORDER.indexOf(ca.type) - TYPE_ORDER.indexOf(cb.type) || ca.cost - cb.cost;
  });

export class DeckBuilder {
  private root = document.createElement('div');
  private deck: string[];
  private filter: CardType | 'all' = 'all';

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
      <p class="muted">Clica numa carta para a juntar ou tirar do baralho. Tens de escolher ${CONFIG.deckSize}.</p>
      <div class="deck-slots"></div>
      <div class="filters"></div>
      <div class="pool"></div>`;

    this.root.querySelector('#back')!.addEventListener('click', () => this.close(null));
    this.root.querySelector('#save')!.addEventListener('click', () =>
      this.close({ name: this.root.querySelector<HTMLInputElement>('.deck-name-input')!.value, cards: this.deck }),
    );

    const filters = this.root.querySelector('.filters')!;
    const options: [CardType | 'all', string][] = [['all', 'Todas'], ...TYPE_ORDER.map((t) => [t, `${CARD_TYPES[t].emoji} ${CARD_TYPES[t].name}`] as [CardType, string])];
    for (const [value, label] of options) {
      const b = document.createElement('button');
      b.className = 'chip';
      b.dataset.filter = value;
      b.textContent = label;
      b.addEventListener('click', () => {
        this.filter = value;
        this.render();
      });
      filters.append(b);
    }

    container.append(this.root);
    this.render();
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

    this.root.querySelectorAll<HTMLElement>('.chip').forEach((c) => c.classList.toggle('active', c.dataset.filter === this.filter));

    const pool = this.root.querySelector('.pool')!;
    pool.replaceChildren();
    for (const id of sortCards(CARD_IDS)) {
      if (this.filter !== 'all' && getCard(id).type !== this.filter) continue;
      const el = cardEl(id);
      const inDeck = this.deck.includes(id);
      el.classList.toggle('in-deck', inDeck);
      el.classList.toggle('blocked', !inDeck && full);
      el.addEventListener('click', () => this.toggle(id));
      pool.append(el);
    }
  }
}
