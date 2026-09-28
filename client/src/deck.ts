import { DEFAULT_DECK, validateDeck } from '../../shared/cards';

const DECK_KEY = 'sicknezz:deck';

/** Baralho guardado neste browser, ou o baralho por omissão. */
export function loadDeck(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(DECK_KEY) ?? 'null');
    if (validateDeck(saved) === null) return saved;
  } catch {
    /* ignorar */
  }
  return [...DEFAULT_DECK];
}

export function saveDeck(deck: string[]) {
  try {
    localStorage.setItem(DECK_KEY, JSON.stringify(deck));
  } catch {
    /* ignorar */
  }
}
