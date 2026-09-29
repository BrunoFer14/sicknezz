// Enciclopédia: lista de todas as cartas (/cartas) e uma página por carta (/cartas/<id>),
// com o que faz no jogo, o que a cura, sinergias, o que é na vida real, história e artes.
import { cardArts } from '../../shared/arts';
import { CARD_IDS, CARD_TYPES, getCard, type CardDef } from '../../shared/cards';
import type { CardType } from '../../shared/engine/types';
import { LORE } from '../../shared/lore';
import type { StatsPayload } from '../../shared/protocol';
import { cardEl, escapeHtml } from './card';
import { cardRoles, ROLES } from './roles';

const TYPE_ORDER = Object.keys(CARD_TYPES) as CardType[];
const WHERE = { opponent: 'na área do adversário', self: 'na tua área', any: 'em qualquer área' } as const;

const byTypeAndCost = (ids: readonly string[]) =>
  [...ids].sort((a, b) => TYPE_ORDER.indexOf(getCard(a).type) - TYPE_ORDER.indexOf(getCard(b).type) || getCard(a).cost - getCard(b).cost);

/** Tratamentos que curam esta doença (cleanse do seu tipo). */
function curedBy(card: CardDef): string[] {
  if (card.permanent || card.type === 'tratamento') return [];
  return CARD_IDS.filter((id) => getCard(id).effects.some((e) => e.mechanic === 'cleanse' && (!e.params.types || e.params.types.includes(card.type))));
}

/** Cartas que impedem esta doença de entrar (imunidades ao seu tipo e a Quarentena). */
function blockedBy(card: CardDef): string[] {
  if (card.type === 'tratamento') return [];
  return CARD_IDS.filter((id) =>
    getCard(id).effects.some((e) => (e.mechanic === 'immunity' || e.mechanic === 'forbidTypes') && e.params.types.includes(card.type)),
  );
}

/** Cartas que ficam mais fortes com doenças deste tipo ativas no adversário (Pneumonia, Sépsis, Diabetes). */
function empowers(card: CardDef, self: string): string[] {
  if (card.type === 'tratamento') return [];
  return CARD_IDS.filter(
    (id) => id !== self && getCard(id).effects.some((e) => e.mechanic === 'damagePerDisease' && (!e.params.types || e.params.types.includes(card.type))),
  );
}

/** Cartas que mudam o dano desta doença: `up` = fazem-na tirar mais vida (SIDA), senão menos (ex.: uma carta de proteção). */
function damageChangedBy(card: CardDef, self: string, up: boolean): string[] {
  return CARD_IDS.filter(
    (id) =>
      id !== self &&
      getCard(id).effects.some(
        (e) => e.mechanic === 'statModifier' && e.params.stat === `${card.type}DamageTaken` && (up ? e.params.value > 1 : e.params.value < 1),
      ),
  );
}

/** Doenças que este tratamento tira ou impede. */
function treats(card: CardDef): { cures: CardType[]; blocks: CardType[] } {
  const cures = new Set<CardType>(), blocks = new Set<CardType>();
  for (const e of card.effects) {
    if (e.mechanic === 'cleanse') (e.params.types ?? TYPE_ORDER.filter((t) => t !== 'tratamento')).forEach((t) => cures.add(t));
    if (e.mechanic === 'immunity' || e.mechanic === 'forbidTypes') e.params.types.forEach((t) => blocks.add(t));
  }
  return { cures: [...cures], blocks: [...blocks] };
}

const chips = (ids: string[]) =>
  ids.length
    ? ids.map((id) => `<a class="card-chip" href="/cartas/${id}" data-nav>${getCard(id).emoji} ${escapeHtml(getCard(id).name)}</a>`).join('')
    : '<span class="muted">—</span>';
const typeChips = (types: CardType[]) => types.map((t) => `<span class="card-chip">${CARD_TYPES[t].emoji} ${CARD_TYPES[t].name}</span>`).join('');

/** Liga os links internos (data-nav) à navegação da aplicação, sem recarregar a página. */
function bindNav(root: HTMLElement, navigate: (path: string) => void) {
  root.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-nav]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(a.getAttribute('href')!);
  });
}

export class CardsScreen {
  private root = document.createElement('div');
  private stats: StatsPayload | null = null;

  constructor(
    container: HTMLElement,
    private cardId: string | null,
    private navigate: (path: string) => void,
  ) {
    this.root.className = 'cards-screen';
    bindNav(this.root, navigate);
    container.append(this.root);
    this.render();
  }

  /** Estatísticas de todas as cartas (chegam do servidor). */
  showStats(stats: StatsPayload) {
    this.stats = stats;
    if (this.cardId) this.render();
  }

  destroy() {
    this.root.remove();
  }

  private render() {
    const id = this.cardId && (CARD_IDS as string[]).includes(this.cardId) ? this.cardId : null;
    this.root.innerHTML = id ? this.page(id) : this.list();
    this.root.scrollTop = 0;
  }

  private list(): string {
    const groups = TYPE_ORDER.map((t) => {
      const ids = byTypeAndCost(CARD_IDS).filter((id) => getCard(id).type === t);
      return `
        <h3 class="cards-group">${CARD_TYPES[t].emoji} ${CARD_TYPES[t].name} <span class="muted">${ids.length}</span></h3>
        <div class="pool">${ids.map((cid) => `<a class="card-link" href="/cartas/${cid}" data-nav>${cardEl(cid).outerHTML}</a>`).join('')}</div>`;
    }).join('');
    return `
      <header class="builder-head">
        <a class="btn" href="/" data-nav>← Voltar</a>
        <div class="builder-title"><h2>📖 Cartas</h2><span class="builder-stats">${CARD_IDS.length} cartas · clica numa para saberes mais</span></div>
        <span style="width:80px"></span>
      </header>
      ${groups}`;
  }

  private page(id: string): string {
    const card = getCard(id);
    const type = CARD_TYPES[card.type];
    const lore = LORE[id as keyof typeof LORE];
    const ordered = byTypeAndCost(CARD_IDS);
    const i = ordered.indexOf(id);
    const prev = ordered[(i - 1 + ordered.length) % ordered.length];
    const next = ordered[(i + 1) % ordered.length];
    const roles = cardRoles(id);
    const tags = ROLES.filter(([r]) => roles.has(r)).map(([, label]) => `<span class="card-chip">${label}</span>`).join('');

    const badges = [
      card.permanent ? '<span class="badge perm">♾️ Permanente: nenhum tratamento a cura</span>' : '',
      card.contagion ? `<span class="badge">🦠 Contágio: ${Math.round(card.contagion * 100)}% de hipótese de te infetar a ti</span>` : '',
    ].join('');

    let game = '';
    if (card.requires) game += `<div class="info-row"><b>Só se joga se o adversário tiver</b><div>${typeChips(card.requires)}</div></div>`;
    if (card.type === 'sintoma') {
      // Os sintomas não são doenças: não se curam nem se bloqueiam (só a doença de que dependem).
    } else if (card.type === 'tratamento') {
      const { cures, blocks } = treats(card);
      if (cures.length) game += `<div class="info-row"><b>Cura</b><div>${typeChips(cures)}</div></div>`;
      if (blocks.length) game += `<div class="info-row"><b>Protege contra</b><div>${typeChips(blocks)}</div></div>`;
    } else {
      game += `<div class="info-row"><b>Cura-se com</b><div>${card.permanent ? '<span class="muted">Nada — é permanente</span>' : chips(curedBy(card))}</div></div>`;
      game += `<div class="info-row"><b>Bloqueada por</b><div>${chips(blockedBy(card))}</div></div>`;
      const syn = empowers(card, id);
      if (syn.length) game += `<div class="info-row"><b>Dá força a</b><div>${chips(syn)}</div></div>`;
      const boost = damageChangedBy(card, id, true);
      if (boost.length) game += `<div class="info-row"><b>Fica mais forte com</b><div>${chips(boost)}</div></div>`;
      const weak = damageChangedBy(card, id, false);
      if (weak.length) game += `<div class="info-row"><b>Enfraquecida por</b><div>${chips(weak)}</div></div>`;
    }

    const s = this.stats?.cards.find((c) => c.cardId === id);
    const stats = s
      ? `<div class="tiles">
          <div class="tile"><span>Jogada</span><b>${s.plays}×</b></div>
          <div class="tile"><span>Em baralhos</span><b>${s.games}</b></div>
          <div class="tile"><span>% vitórias</span><b>${s.games ? Math.round((s.wins / s.games) * 100) + '%' : '—'}</b></div>
        </div>`
      : '<p class="muted">A carregar…</p>';

    const arts = cardArts(id)
      .map((a, n) => `<div class="art-option${n === 0 ? ' active' : ''}"><div class="art-thumb">${a.image ? `<img src="${a.image}" alt="">` : card.emoji}</div><span>${escapeHtml(a.name)}</span></div>`)
      .join('');

    return `
      <header class="builder-head">
        <a class="btn" href="/cartas" data-nav>← Cartas</a>
        <div class="builder-title"><h2>${card.emoji} ${escapeHtml(card.name)}</h2><span class="builder-stats">${type.emoji} ${type.name}</span></div>
        <span class="page-nav"><a class="btn" href="/cartas/${prev}" data-nav title="${escapeHtml(getCard(prev).name)}">‹</a><a class="btn" href="/cartas/${next}" data-nav title="${escapeHtml(getCard(next).name)}">›</a></span>
      </header>
      <div class="card-page">
        <div class="card-page-art">${cardEl(id).outerHTML}</div>
        <div class="card-page-info">
          <section>
            <h3>No jogo</h3>
            <p class="card-effect">${escapeHtml(card.description)}</p>
            <p class="muted">Custa ${card.cost} de energia · joga-se ${WHERE[card.target]}</p>
            <div class="chips">${tags}</div>
            ${badges ? `<div class="badges">${badges}</div>` : ''}
            ${game}
          </section>
          <section>
            <h3>O que é</h3>
            <p>${lore ? escapeHtml(lore.what) : '<span class="muted">Em breve.</span>'}</p>
          </section>
          <section>
            <h3>Um pouco de história</h3>
            <p>${lore ? escapeHtml(lore.history) : '<span class="muted">Em breve.</span>'}</p>
          </section>
          <section>
            <h3>Estatísticas</h3>
            ${stats}
          </section>
          <section>
            <h3>Artes</h3>
            <div class="arts">${arts}</div>
            <p class="muted">Artes alternativas em breve.</p>
          </section>
        </div>
      </div>
      <p class="muted lore-note">Informação geral sobre saúde, não substitui aconselhamento médico.</p>`;
  }
}
