// CARTAS: cada carta é só dados — tipo, custo e uma lista de efeitos (mecânicas).
// Para criar uma carta nova basta adicionar uma entrada a CARDS; aparece logo no construtor de baralhos.
import { CONFIG } from './engine/config';
import type { EffectSpec } from './engine/mechanics';
import type { CardType, TargetKind } from './engine/types';

export interface CardDef {
  name: string;
  emoji: string;
  type: CardType;
  cost: number;
  description: string;
  /** Área onde a carta é largada: na do adversário (doenças) ou na tua (tratamentos). */
  target: TargetKind;
  effects: EffectSpec[];
}

export const CARD_TYPES: Record<CardType, { name: string; emoji: string }> = {
  virus: { name: 'Vírus', emoji: '🦠' },
  bacteria: { name: 'Bactéria', emoji: '🧫' },
  fisica: { name: 'Física', emoji: '🍔' },
  mental: { name: 'Mental', emoji: '🧠' },
  tratamento: { name: 'Tratamento', emoji: '💊' },
};

function defineCards<T extends Record<string, CardDef>>(cards: T): T {
  return cards;
}

export const CARDS = defineCards({
  // ---------- Vírus ----------
  constipacao: {
    name: 'Constipação',
    emoji: '😷',
    type: 'virus',
    cost: 1,
    description: 'Tira 4 de vida em 4 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'damageOverTime', params: { amount: 4, duration: 4 } }],
  },
  gripe: {
    name: 'Gripe',
    emoji: '🤧',
    type: 'virus',
    cost: 2,
    description: 'Tira 9 de vida em 6 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'damageOverTime', params: { amount: 9, duration: 6 } }],
  },
  herpes: {
    name: 'Herpes',
    emoji: '💋',
    type: 'virus',
    cost: 4,
    description: 'Tira 1 de vida a cada 2,5 segundos. Nunca passa sozinho.',
    target: 'opponent',
    effects: [{ mechanic: 'infection', params: { perSecond: 1 / 2.5 } }],
  },
  covid: {
    name: 'Covid',
    emoji: '🦠',
    type: 'virus',
    cost: 5,
    description: 'Tira 25 de vida em 12 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'damageOverTime', params: { amount: 25, duration: 12 } }],
  },
  ebola: {
    name: 'Ébola',
    emoji: '🩸',
    type: 'virus',
    cost: 8,
    description: 'Tira 3 de vida por segundo, até 60. A cada segundo tem 8% de hipótese de passar sozinho.',
    target: 'opponent',
    effects: [{ mechanic: 'infection', params: { perSecond: 3, total: 60, cureChance: 0.08 } }],
  },

  // ---------- Bactérias ----------
  salmonela: {
    name: 'Salmonela',
    emoji: '🍗',
    type: 'bacteria',
    cost: 3,
    description: 'Tira 7 de vida e o adversário perde 1 de mana.',
    target: 'opponent',
    effects: [
      { mechanic: 'damage', params: { amount: 7 } },
      { mechanic: 'drainMana', params: { amount: 1 } },
    ],
  },
  pneumonia: {
    name: 'Pneumonia',
    emoji: '🤒',
    type: 'bacteria',
    cost: 4,
    description: 'Tira 8 de vida, +5 por cada vírus ativo no adversário.',
    target: 'opponent',
    effects: [{ mechanic: 'damagePerDisease', params: { base: 8, per: 5, type: 'virus' } }],
  },
  tuberculose: {
    name: 'Tuberculose',
    emoji: '🩻',
    type: 'bacteria',
    cost: 5,
    description: 'Tira 22 de vida em 16s e reduz a regeneração de mana em 20% durante esse tempo.',
    target: 'opponent',
    effects: [
      { mechanic: 'damageOverTime', params: { amount: 22, duration: 16 } },
      { mechanic: 'statModifier', params: { stat: 'manaRegen', op: 'mul', value: 0.8, duration: 16 } },
    ],
  },
  sepsis: {
    name: 'Sépsis',
    emoji: '🧫',
    type: 'bacteria',
    cost: 6,
    description: 'Tira 8 de vida, +6 por cada doença ativa no adversário.',
    target: 'opponent',
    effects: [{ mechanic: 'damagePerDisease', params: { base: 8, per: 6 } }],
  },

  // ---------- Físicas ----------
  sedentarismo: {
    name: 'Sedentarismo',
    emoji: '🛋️',
    type: 'fisica',
    cost: 2,
    description: 'A regeneração de mana do adversário desce 15%. Permanente.',
    target: 'opponent',
    effects: [{ mechanic: 'statModifier', params: { stat: 'manaRegen', op: 'mul', value: 0.85 } }],
  },
  asma: {
    name: 'Asma',
    emoji: '🫁',
    type: 'fisica',
    cost: 3,
    description: 'Durante 15s o adversário só ganha 1 de mana a cada 2,5 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'statModifier', params: { stat: 'manaRegen', op: 'mul', value: 0.6, duration: 15 } }],
  },
  obesidade: {
    name: 'Obesidade',
    emoji: '🍔',
    type: 'fisica',
    cost: 4,
    description: 'A mana máxima do adversário desce 2 (de 10 para 8). Permanente.',
    target: 'opponent',
    effects: [{ mechanic: 'statModifier', params: { stat: 'maxMana', op: 'add', value: -2 } }],
  },
  hipertensao: {
    name: 'Hipertensão',
    emoji: '🫀',
    type: 'fisica',
    cost: 4,
    description: 'A vida máxima do adversário desce 20. Permanente.',
    target: 'opponent',
    effects: [{ mechanic: 'statModifier', params: { stat: 'maxHp', op: 'add', value: -20 } }],
  },
  diabetes: {
    name: 'Diabetes',
    emoji: '🍩',
    type: 'fisica',
    cost: 4,
    description: 'Tira 6 de vida, +7 por cada doença física ativa no adversário.',
    target: 'opponent',
    effects: [{ mechanic: 'damagePerDisease', params: { base: 6, per: 7, type: 'fisica' } }],
  },

  // ---------- Mentais ----------
  ansiedade: {
    name: 'Ansiedade',
    emoji: '😰',
    type: 'mental',
    cost: 2,
    description: 'O adversário perde 4 de mana ao longo de 10 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'drainManaOverTime', params: { amount: 4, duration: 10 } }],
  },
  enxaqueca: {
    name: 'Enxaqueca',
    emoji: '🤕',
    type: 'mental',
    cost: 2,
    description: 'O adversário perde 3 de mana.',
    target: 'opponent',
    effects: [{ mechanic: 'drainMana', params: { amount: 3 } }],
  },
  insonia: {
    name: 'Insónia',
    emoji: '😵',
    type: 'mental',
    cost: 3,
    description: 'Durante 10s o adversário só ganha 1 de mana a cada 3 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'statModifier', params: { stat: 'manaRegen', op: 'mul', value: 0.5, duration: 10 } }],
  },
  depressao: {
    name: 'Depressão',
    emoji: '🌧️',
    type: 'mental',
    cost: 5,
    description: 'Durante 20s: mana máxima do adversário −3 e regeneração −20%.',
    target: 'opponent',
    effects: [
      { mechanic: 'statModifier', params: { stat: 'maxMana', op: 'add', value: -3, duration: 20 } },
      { mechanic: 'statModifier', params: { stat: 'manaRegen', op: 'mul', value: 0.8, duration: 20 } },
    ],
  },

  // ---------- Tratamentos ----------
  cafe: {
    name: 'Café',
    emoji: '☕',
    type: 'tratamento',
    cost: 2,
    description: 'Durante 10s ganhas 1 de mana por segundo.',
    target: 'self',
    effects: [{ mechanic: 'statModifier', params: { stat: 'manaRegen', op: 'mul', value: 1.5, duration: 10 } }],
  },
  vitaminas: {
    name: 'Vitaminas',
    emoji: '🍊',
    type: 'tratamento',
    cost: 3,
    description: 'Recuperas 6 de vida em 10 segundos.',
    target: 'self',
    effects: [{ mechanic: 'healOverTime', params: { amount: 6, duration: 10 } }],
  },
  vacina: {
    name: 'Vacina',
    emoji: '💉',
    type: 'tratamento',
    cost: 2,
    description: 'Ficas imune a novos vírus durante 10s. Não cura os vírus que já tens.',
    target: 'self',
    effects: [{ mechanic: 'immunity', params: { types: ['virus'], duration: 10 } }],
  },
  antibiotico: {
    name: 'Antibiótico',
    emoji: '💊',
    type: 'tratamento',
    cost: 3,
    description: 'Cura todas as bactérias.',
    target: 'self',
    effects: [{ mechanic: 'cleanse', params: { types: ['bacteria'] } }],
  },
  exercicio: {
    name: 'Exercício',
    emoji: '🏃',
    type: 'tratamento',
    cost: 3,
    description: 'Cura todas as doenças físicas.',
    target: 'self',
    effects: [{ mechanic: 'cleanse', params: { types: ['fisica'] } }],
  },
  terapia: {
    name: 'Terapia',
    emoji: '🧘',
    type: 'tratamento',
    cost: 2,
    description: 'Cura todas as doenças mentais.',
    target: 'self',
    effects: [{ mechanic: 'cleanse', params: { types: ['mental'] } }],
  },
  hospital: {
    name: 'Hospital',
    emoji: '🏥',
    type: 'tratamento',
    cost: 9,
    description: 'Cura todas as doenças e recuperas 8 de vida.',
    target: 'self',
    effects: [
      { mechanic: 'cleanse', params: {} },
      { mechanic: 'heal', params: { amount: 8 } },
    ],
  },
});

export type CardId = keyof typeof CARDS;
export const CARD_IDS = Object.keys(CARDS) as CardId[];

export const DEFAULT_DECK: CardId[] = [
  'constipacao', 'gripe', 'covid', 'pneumonia', 'salmonela',
  'obesidade', 'asma', 'enxaqueca', 'vacina', 'exercicio',
];

export function getCard(id: string): CardDef {
  const card = (CARDS as Record<string, CardDef>)[id];
  if (!card) throw new Error(`Carta desconhecida: ${id}`);
  return card;
}

/** Devolve uma mensagem de erro, ou null se o baralho for válido. */
export function validateDeck(deck: unknown): string | null {
  if (!Array.isArray(deck) || deck.length !== CONFIG.deckSize) return `O baralho tem de ter ${CONFIG.deckSize} cartas.`;
  if (!deck.every((id) => typeof id === 'string' && id in CARDS)) return 'O baralho tem cartas desconhecidas.';
  if (new Set(deck).size !== deck.length) return 'O baralho não pode ter cartas repetidas.';
  return null;
}
