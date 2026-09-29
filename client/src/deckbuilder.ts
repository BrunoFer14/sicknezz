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

/** Para que serve uma carta; calculado a partir das mecânicas, por isso cartas novas entram sozinhas nos filtros. */
type Role = 'dano' | 'cura' | 'imunidade' | 'energia' | 'controlo' | 'permanente';

const ROLES: [Role, string][] = [
  ['dano', '⚔️ Dano'],
  ['cura', '❤️ Cura'],
  ['imunidade', '🛡️ Imunidade'],
  ['energia', '⚡ Energia'],
  ['controlo', '🎛️ Controlo'],
  ['permanente', '♾️ Permanente'],
];

function cardRoles(id: string): Set<Role> {
  const card = getCard(id);
  const roles = new Set<Role>();
  if (card.permanent) roles.add('permanente');
  for (const e of card.effects) {
    switch (e.mechanic) {
      case 'damage':
      case 'damagePerDisease':
      case 'damageOverTime':
      case 'infection':
        roles.add('dano');
        break;
      case 'heal':
      case 'healOverTime':
      case 'cleanse':
        roles.add('cura');
        break;
      case 'immunity':
        roles.add('imunidade');
        break;
      case 'drainEnergy':
      case 'drainEnergyOverTime':
      case 'drainEnergyAbove':
      case 'gainEnergyOverTime':
        roles.add('energia');
        break;
      case 'statModifier':
        // Energia máxima/regeneração conta como energia; vida máxima e multiplicadores de dano contam como dano.
        roles.add(e.params.stat === 'energyRegen' || e.params.stat === 'maxEnergy' ? 'energia' : 'dano');
        break;
      case 'forbidTypes':
        roles.add('imunidade');
        roles.add('controlo');
        break;
      default:
        // Custos, bloqueios, mão, Paranoia...
        roles.add('controlo');
    }
  }
  return roles;
}

type CostRange = 'low' | 'mid' | 'high';

const COSTS: [CostRange, string, (cost: number) => boolean][] = [
  ['low', '1–2', (c) => c <= 2],
  ['mid', '3–4', (c) => c >= 3 && c <= 4],
  ['high', '5+', (c) => c >= 5],
];

type FilterGroup = 'type' | 'role' | 'cost';

/** Sem acentos nem maiúsculas, para a pesquisa ("sepsis" encontra "Sépsis"). */
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export class DeckBuilder {
  private root = document.createElement('div');
  private deck: string[];
  /** Filtros ativos por grupo ('all' = sem filtro); combinam-se todos. */
  private filters: Record<FilterGroup, string> = { type: 'all', role: 'all', cost: 'all' };
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
      <p class="muted">Clica numa carta para a juntar ou tirar do baralho. Tens de escolher ${CONFIG.deckSize}.</p>
      <div class="deck-slots"></div>
      <div class="filter-box">
        <input class="card-search" type="search" placeholder="🔎 Procurar carta..." />
        <div class="filters" data-group="type"><span class="filter-label">Tipo</span></div>
        <div class="filters" data-group="role"><span class="filter-label">Efeito</span></div>
        <div class="filters" data-group="cost"><span class="filter-label">Custo</span></div>
      </div>
      <div class="pool"></div>`;

    this.root.querySelector('#back')!.addEventListener('click', () => this.close(null));
    this.root.querySelector('#save')!.addEventListener('click', () =>
      this.close({ name: this.root.querySelector<HTMLInputElement>('.deck-name-input')!.value, cards: this.deck }),
    );

    const groups: Record<FilterGroup, [string, string][]> = {
      type: TYPE_ORDER.map((t) => [t, `${CARD_TYPES[t].emoji} ${CARD_TYPES[t].name}`]),
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
    const { type, role, cost } = this.filters;
    if (type !== 'all' && card.type !== type) return false;
    if (role !== 'all' && !cardRoles(id).has(role as Role)) return false;
    if (cost !== 'all' && !COSTS.find(([v]) => v === cost)![2](card.cost)) return false;
    const q = normalize(this.search.trim());
    return !q || normalize(card.name).includes(q) || normalize(card.description).includes(q);
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

    const pool = this.root.querySelector('.pool')!;
    pool.replaceChildren();
    const shown = sortCards(CARD_IDS).filter((id) => this.matches(id));
    if (!shown.length) pool.innerHTML = '<p class="muted pool-empty">Nenhuma carta com estes filtros.</p>';
    for (const id of shown) {
      const el = cardEl(id);
      const inDeck = this.deck.includes(id);
      el.classList.toggle('in-deck', inDeck);
      el.classList.toggle('blocked', !inDeck && full);
      el.addEventListener('click', () => this.toggle(id));
      pool.append(el);
    }
  }
}
