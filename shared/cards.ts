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
  /** Doença permanente: nenhum tratamento a tira (nem o Hospital). */
  permanent?: boolean;
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
    description: 'Tira 3 de vida por segundo, até 100. A cada segundo tem 10% de hipótese de passar sozinho. Permanente: nenhum tratamento a cura.',
    target: 'opponent',
    permanent: true,
    effects: [{ mechanic: 'infection', params: { perSecond: 3, total: 100, cureChance: 0.1 } }],
  },
  sida: {
    name: 'SIDA',
    emoji: '🎗️',
    type: 'virus',
    cost: 5,
    description: 'O adversário passa a sofrer o dobro do dano de vírus e bactérias. Permanente: nenhum tratamento a cura.',
    target: 'opponent',
    permanent: true,
    effects: [
      // 'set' em vez de 'mul' para não acumular se for jogada várias vezes.
      { mechanic: 'statModifier', params: { stat: 'virusDamageTaken', op: 'set', value: 2 } },
      { mechanic: 'statModifier', params: { stat: 'bacteriaDamageTaken', op: 'set', value: 2 } },
    ],
  },

  // ---------- Bactérias ----------
  salmonela: {
    name: 'Salmonela',
    emoji: '🍗',
    type: 'bacteria',
    cost: 3,
    description: 'Tira 7 de vida e o adversário perde 1 de energia.',
    target: 'opponent',
    effects: [
      { mechanic: 'damage', params: { amount: 7 } },
      { mechanic: 'drainEnergy', params: { amount: 1 } },
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
    description: 'Tira 22 de vida em 16s e reduz a regeneração de energia em 20% durante esse tempo.',
    target: 'opponent',
    effects: [
      { mechanic: 'damageOverTime', params: { amount: 22, duration: 16 } },
      { mechanic: 'statModifier', params: { stat: 'energyRegen', op: 'mul', value: 0.8, duration: 16 } },
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
    cost: 3,
    description: 'A regeneração de energia do adversário desce 20% até ser curada.',
    target: 'opponent',
    effects: [{ mechanic: 'statModifier', params: { stat: 'energyRegen', op: 'mul', value: 0.8 } }],
  },
  asma: {
    name: 'Asma',
    emoji: '🫁',
    type: 'fisica',
    cost: 3,
    description: 'Durante 15s o adversário só ganha 1 de energia a cada 2,5 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'statModifier', params: { stat: 'energyRegen', op: 'mul', value: 0.6, duration: 15 } }],
  },
  obesidade: {
    name: 'Obesidade',
    emoji: '🍔',
    type: 'fisica',
    cost: 4,
    description: 'A energia máxima do adversário desce 2 (de 10 para 8) até ser curada.',
    target: 'opponent',
    effects: [{ mechanic: 'statModifier', params: { stat: 'maxEnergy', op: 'add', value: -2 } }],
  },
  hipertensao: {
    name: 'Hipertensão',
    emoji: '🫀',
    type: 'fisica',
    cost: 4,
    description: 'A vida máxima do adversário desce 20 até ser curada.',
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
  fratura: {
    name: 'Fratura',
    emoji: '🦴',
    type: 'fisica',
    cost: 3,
    description: 'Durante 10s o adversário só pode jogar cartas até custo 4.',
    target: 'opponent',
    effects: [{ mechanic: 'costLimit', params: { max: 4, duration: 10 } }],
  },
  avc: {
    name: 'AVC',
    emoji: '🚑',
    type: 'fisica',
    cost: 3,
    description: 'Durante 5s o adversário não pode jogar as 2 cartas mais à esquerda da mão.',
    target: 'opponent',
    effects: [{ mechanic: 'lockSlots', params: { slots: [0, 1], duration: 5 } }],
  },
  alergia: {
    name: 'Alergia',
    emoji: '🌼',
    type: 'fisica',
    cost: 1,
    description: 'O próximo tratamento do adversário custa +2 de energia. Passa quando ele jogar um tratamento.',
    target: 'opponent',
    effects: [{ mechanic: 'costIncrease', params: { types: ['tratamento'], amount: 2 } }],
  },

  // ---------- Mentais ----------
  ansiedade: {
    name: 'Ansiedade',
    emoji: '😰',
    type: 'mental',
    cost: 2,
    description: 'O adversário perde 4 de energia ao longo de 10 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'drainEnergyOverTime', params: { amount: 4, duration: 10 } }],
  },
  enxaqueca: {
    name: 'Enxaqueca',
    emoji: '🤕',
    type: 'mental',
    cost: 2,
    description: 'O adversário perde 3 de energia.',
    target: 'opponent',
    effects: [{ mechanic: 'drainEnergy', params: { amount: 3 } }],
  },
  insonia: {
    name: 'Insónia',
    emoji: '😵',
    type: 'mental',
    cost: 3,
    description: 'Durante 10s o adversário só ganha 1 de energia a cada 3 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'statModifier', params: { stat: 'energyRegen', op: 'mul', value: 0.5, duration: 10 } }],
  },
  depressao: {
    name: 'Depressão',
    emoji: '🌧️',
    type: 'mental',
    cost: 6,
    description: 'Durante 20s: energia máxima do adversário −3 e regeneração −20%.',
    target: 'opponent',
    effects: [
      { mechanic: 'statModifier', params: { stat: 'maxEnergy', op: 'add', value: -3, duration: 20 } },
      { mechanic: 'statModifier', params: { stat: 'energyRegen', op: 'mul', value: 0.8, duration: 20 } },
    ],
  },
  burnout: {
    name: 'Burnout',
    emoji: '🔥',
    type: 'mental',
    cost: 3,
    description: 'O adversário perde toda a energia acima de 4.',
    target: 'opponent',
    effects: [{ mechanic: 'drainEnergyAbove', params: { keep: 4 } }],
  },
  paranoia: {
    name: 'Paranoia',
    emoji: '👁️',
    type: 'mental',
    cost: 2,
    description: 'Durante 10s o adversário não vê as suas doenças nem as cartas que lhe jogas.',
    target: 'opponent',
    effects: [{ mechanic: 'blind', params: { duration: 10 } }],
  },
  amnesia: {
    name: 'Amnésia',
    emoji: '🌀',
    type: 'mental',
    cost: 2,
    description: 'O adversário esquece a carta mais cara da mão: vai para o fim da fila e entra a próxima.',
    target: 'opponent',
    effects: [{ mechanic: 'forgetBest', params: {} }],
  },
  bipolaridade: {
    name: 'Bipolaridade',
    emoji: '🎭',
    type: 'mental',
    cost: 2,
    description: 'Durante 16s a regeneração de energia muda a cada 4s. Em ti: +80% / −20%. No adversário: −80% / +20%.',
    target: 'any',
    effects: [{ mechanic: 'moodSwing', params: { strong: 0.8, weak: 0.2, phase: 4, duration: 16 } }],
  },
  alzheimer: {
    name: 'Alzheimer',
    emoji: '🧓',
    type: 'mental',
    cost: 2,
    description: 'Troca a mão toda por cartas aleatórias dos dois baralhos. Larga na área do adversário para trocar a dele, ou na tua para trocar a tua.',
    target: 'any',
    effects: [{ mechanic: 'shuffleHand', params: {} }],
  },

  // ---------- Tratamentos ----------
  cafe: {
    name: 'Café',
    emoji: '☕',
    type: 'tratamento',
    cost: 2,
    description: 'Ganhas 3 de energia ao longo de 6 segundos.',
    target: 'self',
    effects: [{ mechanic: 'gainEnergyOverTime', params: { amount: 3, duration: 6 } }],
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
    cost: 3,
    description: 'Ficas imune a novos vírus durante 7s. Não cura os vírus que já tens.',
    target: 'self',
    effects: [{ mechanic: 'immunity', params: { types: ['virus'], duration: 7 } }],
  },
  mascara: {
    name: 'Máscara',
    emoji: '😷',
    type: 'tratamento',
    cost: 2,
    description: 'Ficas imune a novos vírus e bactérias durante 3s.',
    target: 'self',
    effects: [{ mechanic: 'immunity', params: { types: ['virus', 'bacteria'], duration: 3 } }],
  },
  soro: {
    name: 'Soro',
    emoji: '🧴',
    type: 'tratamento',
    cost: 4,
    description: 'Durante 12s recuperas 1 de vida a cada 3s e ganhas 1 de energia a cada 6s (4 de vida e 2 de energia).',
    target: 'self',
    effects: [
      { mechanic: 'healOverTime', params: { amount: 4, duration: 12 } },
      { mechanic: 'gainEnergyOverTime', params: { amount: 2, duration: 12 } },
    ],
  },
  psicologo: {
    name: 'Psicólogo',
    emoji: '🗣️',
    type: 'tratamento',
    cost: 2,
    description: 'Ficas imune a novas doenças mentais durante 8s.',
    target: 'self',
    effects: [{ mechanic: 'immunity', params: { types: ['mental'], duration: 8 } }],
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
    cost: 3,
    description: 'Cura todas as doenças mentais.',
    target: 'self',
    effects: [{ mechanic: 'cleanse', params: { types: ['mental'] } }],
  },
  hospital: {
    name: 'Hospital',
    emoji: '🏥',
    type: 'tratamento',
    cost: 6,
    description: 'Cura todos os vírus e bactérias (menos os permanentes) e recuperas 8 de vida.',
    target: 'self',
    effects: [
      { mechanic: 'cleanse', params: { types: ['virus', 'bacteria'] } },
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
