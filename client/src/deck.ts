import { DEFAULT_DECK, validateDeck } from '../../shared/cards';

/** Chave antiga (só um baralho); é migrada para o primeiro espaço. */
const OLD_DECK_KEY = 'sicknezz:deck';
const DECKS_KEY = 'sicknezz:decks';

/** Número de baralhos que cada jogador pode guardar. */
export const MAX_DECKS = 10;

export interface SavedDeck {
  name: string;
  cards: string[];
}

interface DeckStore {
  /** Espaço do baralho escolhido para jogar. */
  active: number;
  /** Um lugar por espaço; null = vazio. */
  decks: (SavedDeck | null)[];
}

function isSavedDeck(d: unknown): d is SavedDeck {
  const deck = d as SavedDeck | null;
  return !!deck && typeof deck.name === 'string' && validateDeck(deck.cards) === null;
}

function loadStore(): DeckStore {
  const store: DeckStore = { active: 0, decks: new Array(MAX_DECKS).fill(null) };
  try {
    const saved = JSON.parse(localStorage.getItem(DECKS_KEY) ?? 'null');
    if (saved && Array.isArray(saved.decks)) {
      store.decks = store.decks.map((_, i) => (isSavedDeck(saved.decks[i]) ? saved.decks[i] : null));
      if (Number.isInteger(saved.active) && saved.active >= 0 && saved.active < MAX_DECKS) store.active = saved.active;
    } else {
      const old = JSON.parse(localStorage.getItem(OLD_DECK_KEY) ?? 'null');
      if (validateDeck(old) === null) store.decks[0] = { name: 'Baralho 1', cards: old };
    }
  } catch {
    /* ignorar */
  }
  // Há sempre pelo menos um baralho.
  if (!store.decks.some(Boolean)) store.decks[0] = { name: 'Baralho 1', cards: [...DEFAULT_DECK] };
  if (!store.decks[store.active]) store.active = store.decks.findIndex(Boolean);
  return store;
}

function saveStore(store: DeckStore) {
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(store));
  } catch {
    /* ignorar */
  }
}

/** Todos os espaços (null = vazio). */
export function listDecks(): (SavedDeck | null)[] {
  return loadStore().decks;
}

export function activeDeckIndex(): number {
  return loadStore().active;
}

export function setActiveDeck(index: number) {
  const store = loadStore();
  if (!store.decks[index]) return;
  store.active = index;
  saveStore(store);
}

/** Cartas do baralho ativo (o que é usado para jogar). */
export function loadDeck(): string[] {
  const store = loadStore();
  return [...(store.decks[store.active]?.cards ?? DEFAULT_DECK)];
}

export function saveDeck(index: number, deck: SavedDeck) {
  const store = loadStore();
  store.decks[index] = { name: deck.name.trim() || `Baralho ${index + 1}`, cards: [...deck.cards] };
  saveStore(store);
}

/** Apaga um baralho (nunca o último). */
export function deleteDeck(index: number) {
  const store = loadStore();
  if (store.decks.filter(Boolean).length <= 1) return;
  store.decks[index] = null;
  if (store.active === index) store.active = store.decks.findIndex(Boolean);
  saveStore(store);
}
