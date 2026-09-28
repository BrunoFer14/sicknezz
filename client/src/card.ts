import { CARD_TYPES, getCard } from '../../shared/cards';

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Elemento visual de uma carta. */
export function cardEl(cardId: string, size: 'full' | 'mini' = 'full'): HTMLElement {
  const card = getCard(cardId);
  const type = CARD_TYPES[card.type];
  const el = document.createElement('div');
  el.className = `card ${size} type-${card.type}`;
  el.dataset.card = cardId;
  el.innerHTML = `
    <div class="cost">${card.cost}</div>
    <div class="ctype" title="${type.name}">${type.emoji}</div>
    <div class="art">${card.emoji}</div>
    <div class="cname">${escapeHtml(card.name)}</div>
    ${size === 'full' ? `<div class="desc">${escapeHtml(card.description)}</div>` : ''}
    <div class="charge"></div>`;
  return el;
}
