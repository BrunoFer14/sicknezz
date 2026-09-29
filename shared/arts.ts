// Artes das cartas. Hoje todas usam o emoji ("Original"); para juntar arte nova a uma carta,
// adiciona uma entrada em ARTS com o caminho da imagem (ex.: '/arts/covid-holo.webp').
// Mais tarde, com a loja de cosméticos, cada jogador escolhe qual usa.
import type { CardId } from './cards';

export interface CardArt {
  id: string;
  name: string;
  /** Imagem da arte. Sem imagem, a carta mostra o emoji. */
  image?: string;
}

const ORIGINAL: CardArt = { id: 'original', name: 'Original' };

const ARTS: Partial<Record<CardId, CardArt[]>> = {
  // covid: [{ id: 'holo', name: 'Holográfica', image: '/arts/covid-holo.webp' }],
};

/** Artes disponíveis para uma carta (a primeira é sempre a original). */
export function cardArts(cardId: string): CardArt[] {
  return [ORIGINAL, ...(ARTS[cardId as CardId] ?? [])];
}
