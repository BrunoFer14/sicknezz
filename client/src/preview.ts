// Ver uma carta em grande: passar o rato por cima (computador) ou manter o dedo em cima (telemóvel).
import { CARD_TYPES, getCard } from '../../shared/cards';
import { cardEl, escapeHtml } from './card';

let el: HTMLElement | null = null;
let current: string | null = null;
let timer = 0;

function show(cardId: string, x: number) {
  hide();
  const card = getCard(cardId);
  const type = CARD_TYPES[card.type];
  const side = innerWidth < 600 ? 'center' : x > innerWidth / 2 ? 'left' : 'right';
  el = document.createElement('div');
  el.className = `card-preview ${side}`;
  el.append(cardEl(cardId));
  el.insertAdjacentHTML(
    'beforeend',
    `<div class="preview-info">${type.emoji} ${escapeHtml(type.name)} · custa ${card.cost} de energia · joga-se ${card.target === 'self' ? 'na tua área' : card.target === 'any' ? 'em qualquer área' : 'no adversário'}</div>`,
  );
  document.body.append(el);
  current = cardId;
}

function hide() {
  clearTimeout(timer);
  el?.remove();
  el = null;
  current = null;
}

function cardUnder(target: EventTarget | null): HTMLElement | null {
  const t = (target as Element | null)?.closest?.('[data-card]') as HTMLElement | null;
  // No construtor de baralhos as cartas já aparecem em grande.
  return t && !t.closest('.pool') && !t.classList.contains('ghost') ? t : null;
}

export function installPreview() {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || document.querySelector('.card.ghost')) return;
    const t = cardUnder(e.target);
    if (!t) return;
    if (t.dataset.card === current) return;
    clearTimeout(timer);
    const x = e.clientX;
    timer = window.setTimeout(() => show(t.dataset.card!, x), 300);
  });

  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const from = cardUnder(e.target);
    if (from && cardUnder(e.relatedTarget) === from) return; // continua dentro da mesma carta
    hide();
  });

  document.addEventListener('pointerdown', (e) => {
    hide();
    if (e.pointerType === 'mouse') return;
    const t = cardUnder(e.target);
    if (!t) return;
    const sx = e.clientX;
    const sy = e.clientY;
    timer = window.setTimeout(() => show(t.dataset.card!, sx), 450);
    const move = (m: PointerEvent) => {
      if (!el && Math.hypot(m.clientX - sx, m.clientY - sy) > 10) clearTimeout(timer);
    };
    const up = () => {
      hide();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });

  // Impede o menu do telemóvel ao manter o dedo numa carta.
  document.addEventListener('contextmenu', (e) => {
    if (cardUnder(e.target)) e.preventDefault();
  });
}
