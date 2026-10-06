import { CARDS, DEFAULT_DECK, validateDeck } from '../../shared/cards';
import { CONFIG } from '../../shared/engine/config';

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

/** Lê um baralho guardado, tirando cartas que já não existem no jogo. Null se não for um baralho. */
function readSavedDeck(d: unknown): SavedDeck | null {
  const deck = d as SavedDeck | null;
  if (!deck || typeof deck.name !== 'string' || !Array.isArray(deck.cards)) return null;
  const cards = [...new Set(deck.cards)].filter((id) => typeof id === 'string' && id in CARDS);
  return cards.length ? { name: deck.name, cards } : null;
}

/** Um baralho pode ficar incompleto se uma carta for removida do jogo. */
export function isComplete(deck: SavedDeck): boolean {
  return validateDeck(deck.cards) === null;
}

function loadStore(): DeckStore {
  const store: DeckStore = { active: 0, decks: new Array(MAX_DECKS).fill(null) };
  try {
    const saved = JSON.parse(localStorage.getItem(DECKS_KEY) ?? 'null');
    if (saved && Array.isArray(saved.decks)) {
      store.decks = store.decks.map((_, i) => readSavedDeck(saved.decks[i]));
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

/** Chamado sempre que os baralhos mudam (para os guardar na conta, com login). */
let onChange: ((store: DeckStore) => void) | null = null;

export function onDecksChange(fn: (store: DeckStore) => void) {
  onChange = fn;
}

function saveStore(store: DeckStore, notify = true) {
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(store));
  } catch {
    /* ignorar */
  }
  if (notify) onChange?.(store);
}

/** Todos os baralhos (para enviar para a conta). */
export function exportDecks(): DeckStore {
  return loadStore();
}

/** Substitui os baralhos deste browser pelos da conta. */
export function importDecks(data: { active: number; decks: (SavedDeck | null)[] }) {
  const store: DeckStore = { active: 0, decks: new Array(MAX_DECKS).fill(null) };
  store.decks = store.decks.map((_, i) => readSavedDeck(data.decks[i]));
  store.active = Number.isInteger(data.active) && store.decks[data.active] ? data.active : Math.max(0, store.decks.findIndex(Boolean));
  saveStore(store, false);
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

/** Cartas do baralho ativo (o que é usado para jogar). Pode estar incompleto: ver activeDeckError. */
export function loadDeck(): string[] {
  const store = loadStore();
  return [...(store.decks[store.active]?.cards ?? DEFAULT_DECK)];
}

/** Mensagem de erro se o baralho ativo não puder ser usado para jogar. */
export function activeDeckError(): string | null {
  const store = loadStore();
  const deck = store.decks[store.active];
  return deck && !isComplete(deck) ? `O baralho "${deck.name}" está incompleto (${deck.cards.length}/${CONFIG.deckSize}). Edita-o antes de jogar.` : null;
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

// ---------- Códigos de baralho (para partilhar) ----------
// Cada carta vira 3 caracteres, calculados a partir do id (e não da posição na lista),
// para os códigos continuarem a funcionar quando entram cartas novas no jogo.
const CODE_PREFIX = 'SK-';

function cardCode(id: string): string {
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  return (h % 36 ** 3).toString(36).toUpperCase().padStart(3, '0');
}

const BY_CODE = new Map(Object.keys(CARDS).map((id) => [cardCode(id), id]));
if (BY_CODE.size !== Object.keys(CARDS).length) console.error('Dois ids de carta dão o mesmo código de baralho; muda o id de uma delas.');

/** Código curto para partilhar as cartas de um baralho, ex.: "SK-0AF3K9...". */
export function encodeDeck(cards: readonly string[]): string {
  return CODE_PREFIX + cards.map(cardCode).join('');
}

/** Cartas de um código de baralho; ignora espaços e maiúsculas. Null se o código não for válido. */
export function decodeDeck(code: string): string[] | null {
  const raw = code.toUpperCase().replace(/\s+/g, '').replace(/^SK-?/, '');
  if (!raw || raw.length % 3 !== 0) return null;
  const cards: string[] = [];
  for (let i = 0; i < raw.length; i += 3) {
    const id = BY_CODE.get(raw.slice(i, i + 3));
    if (!id) return null;
    if (!cards.includes(id)) cards.push(id);
  }
  return cards.length <= CONFIG.deckSize ? cards : null;
}
