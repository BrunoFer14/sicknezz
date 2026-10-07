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
  /** Contágio: probabilidade (0–1) de a doença também infetar quem a jogou. */
  contagion?: number;
  /** Sintomas: só se pode jogar se o alvo já tiver uma doença ativa destes tipos. */
  requires?: CardType[];
  /** false: não entra nos baralhos, só aparece em jogo através de outra carta (ex.: Obesidade pelo Hambúrguer). */
  collectible?: false;
  effects: EffectSpec[];
}

export const CARD_TYPES: Record<CardType, { name: string; emoji: string }> = {
  virus: { name: 'Vírus', emoji: '🦠' },
  bacteria: { name: 'Bactéria', emoji: '🧫' },
  fisica: { name: 'Física', emoji: '🍔' },
  estado: { name: 'Estado', emoji: '🩹' },
  mental: { name: 'Mental', emoji: '🧠' },
  sintoma: { name: 'Sintoma', emoji: '💢' },
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
    emoji: '🥶',
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
    description: 'Tira 1 de vida a cada 3 segundos. Nunca passa sozinho.',
    target: 'opponent',
    effects: [{ mechanic: 'infection', params: { perSecond: 1 / 3 } }],
  },
  covid: {
    name: 'Covid',
    emoji: '🦠',
    type: 'virus',
    cost: 5,
    description: 'Tira 26 de vida em 12 segundos. Contágio: 25% de hipótese de também te infetar a ti.',
    target: 'opponent',
    contagion: 0.25,
    effects: [{ mechanic: 'damageOverTime', params: { amount: 26, duration: 12 } }],
  },
  ebola: {
    name: 'Ébola',
    emoji: '🩸',
    type: 'virus',
    cost: 8,
    description: 'Tira 3 de vida por segundo, até 60 (já a contar com a SIDA). A cada segundo tem 10% de hipótese de passar sozinho. Permanente: nenhum tratamento a cura.',
    target: 'opponent',
    permanent: true,
    effects: [{ mechanic: 'infection', params: { perSecond: 3, total: 60, cureChance: 0.1 } }],
  },
  sarampo: {
    name: 'Sarampo',
    emoji: '🔴',
    type: 'virus',
    cost: 3,
    description: 'Tira 12 de vida em 8 segundos. Contágio: 40% de hipótese de também te infetar a ti.',
    target: 'opponent',
    contagion: 0.4,
    effects: [{ mechanic: 'damageOverTime', params: { amount: 12, duration: 8 } }],
  },
  espirro: {
    name: 'Espirro',
    emoji: '🤧',
    type: 'virus',
    cost: 3,
    description: 'Passa ao adversário uma cópia da tua doença mais forte (vírus ou bactéria, não permanente), com a duração completa. Tu continuas com ela.',
    target: 'opponent',
    effects: [{ mechanic: 'spread', params: { types: ['virus', 'bacteria'] } }],
  },
  variante: {
    name: 'Variante',
    emoji: '🧬',
    type: 'virus',
    cost: 4,
    description: 'Só se o adversário tiver um vírus. Todos os vírus dele voltam ao início, com a duração e o dano completos (menos os permanentes).',
    target: 'opponent',
    effects: [{ mechanic: 'refresh', params: { types: ['virus'] } }],
  },
  sida: {
    name: 'SIDA',
    emoji: '🎗️',
    type: 'virus',
    cost: 10,
    description: 'O adversário passa a sofrer o dobro do dano de vírus e bactérias. Permanente: nenhum tratamento a cura.',
    target: 'opponent',
    permanent: true,
    effects: [
      // Não acumula (regra geral); 'mul' para a Febre se poder somar.
      { mechanic: 'statModifier', params: { stat: 'virusDamageTaken', op: 'mul', value: 2 } },
      { mechanic: 'statModifier', params: { stat: 'bacteriaDamageTaken', op: 'mul', value: 2 } },
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
    effects: [{ mechanic: 'damagePerDisease', params: { base: 8, per: 5, types: ['virus'] } }],
  },
  tuberculose: {
    name: 'Tuberculose',
    emoji: '🩻',
    type: 'bacteria',
    cost: 5,
    description: 'Tira 16 de vida em 16s e reduz a regeneração de energia em 20% durante esse tempo.',
    target: 'opponent',
    effects: [
      { mechanic: 'damageOverTime', params: { amount: 16, duration: 16 } },
      { mechanic: 'statModifier', params: { stat: 'energyRegen', op: 'mul', value: 0.8, duration: 16 } },
    ],
  },
  sepsis: {
    name: 'Sépsis',
    emoji: '🧫',
    type: 'bacteria',
    cost: 6,
    description: 'Tira 8 de vida, +6 por cada vírus ou bactéria ativa no adversário.',
    target: 'opponent',
    effects: [{ mechanic: 'damagePerDisease', params: { base: 8, per: 6, types: ['virus', 'bacteria'] } }],
  },

  lepra: {
    name: 'Lepra',
    emoji: '🖐️',
    type: 'bacteria',
    cost: 3,
    description: 'Tira 5 de vida em 10s e, durante esse tempo, o adversário não recebe curas.',
    target: 'opponent',
    effects: [
      { mechanic: 'damageOverTime', params: { amount: 5, duration: 10 } },
      { mechanic: 'statModifier', params: { stat: 'healingTaken', op: 'set', value: 0, duration: 10 } },
    ],
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
    description: 'Só se apanha comendo Hambúrgueres. A energia máxima desce 2 (de 10 para 8) até ser curada.',
    target: 'opponent',
    collectible: false,
    effects: [{ mechanic: 'statModifier', params: { stat: 'maxEnergy', op: 'add', value: -2 } }],
  },
  hamburguer: {
    name: 'Hambúrguer',
    emoji: '🍔',
    type: 'fisica',
    cost: 2,
    description: 'Quem o come ganha 3 de energia e +1 🍔. Ao 3.º 🍔 fica com Obesidade. Larga na tua área para comeres, ou na do adversário para o alimentares.',
    target: 'any',
    effects: [
      { mechanic: 'gainEnergy', params: { amount: 3 } },
      { mechanic: 'buildUp', params: { disease: 'obesidade', after: 3 } },
    ],
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
    effects: [{ mechanic: 'damagePerDisease', params: { base: 6, per: 7, types: ['fisica'] } }],
  },
  enfarte: {
    name: 'Enfarte',
    emoji: '💥',
    type: 'fisica',
    cost: 5,
    description: 'Tira 10 de vida, ou 20 se o adversário tiver menos de 40 de vida.',
    target: 'opponent',
    effects: [{ mechanic: 'finisher', params: { amount: 10, low: 20, below: 40 } }],
  },

  // ---------- Estados ----------
  fratura: {
    name: 'Fratura',
    emoji: '🦴',
    type: 'estado',
    cost: 3,
    description: 'Durante 10s o adversário só pode jogar cartas até custo 4.',
    target: 'opponent',
    effects: [{ mechanic: 'costLimit', params: { max: 4, duration: 10 } }],
  },
  avc: {
    name: 'AVC',
    emoji: '🚑',
    type: 'estado',
    cost: 3,
    description: 'Durante 5s o adversário não pode jogar as 2 cartas mais à esquerda da mão.',
    target: 'opponent',
    effects: [{ mechanic: 'lockSlots', params: { slots: [0, 1], duration: 5 } }],
  },
  alergia: {
    name: 'Alergia',
    emoji: '🌼',
    type: 'estado',
    cost: 2,
    description: 'O próximo tratamento do adversário custa +2 de energia. Passa quando ele jogar um tratamento.',
    target: 'opponent',
    effects: [{ mechanic: 'costIncrease', params: { types: ['tratamento'], amount: 2 } }],
  },

  hernia: {
    name: 'Hérnia',
    emoji: '🏋️',
    type: 'estado',
    cost: 3,
    description: 'Até ser curada, cada carta de custo 4 ou mais que o adversário jogue tira-lhe 3 de vida.',
    target: 'opponent',
    effects: [{ mechanic: 'playPain', params: { minCost: 4, damage: 3 } }],
  },
  tremores: {
    name: 'Tremores',
    emoji: '🫨',
    type: 'estado',
    cost: 2,
    description: 'Durante 12s, cada carta de custo 2 ou menos que o adversário jogue tira-lhe 4 de vida.',
    target: 'opponent',
    effects: [{ mechanic: 'playPain', params: { maxCost: 2, damage: 4, duration: 12 } }],
  },
  fadiga: {
    name: 'Fadiga',
    emoji: '😪',
    type: 'estado',
    cost: 4,
    description: 'Durante 8s todas as cartas do adversário custam +1 de energia.',
    target: 'opponent',
    effects: [{ mechanic: 'costUp', params: { amount: 1, duration: 8 } }],
  },

  // ---------- Mentais ----------
  ansiedade: {
    name: 'Ansiedade',
    emoji: '😰',
    type: 'mental',
    cost: 2,
    description: 'O adversário perde 2 de energia ao longo de 10 segundos.',
    target: 'opponent',
    effects: [{ mechanic: 'drainEnergyOverTime', params: { amount: 2, duration: 10 } }],
  },
  enxaqueca: {
    name: 'Enxaqueca',
    emoji: '🤕',
    type: 'mental',
    cost: 2,
    description: 'O adversário perde 2 de energia.',
    target: 'opponent',
    effects: [{ mechanic: 'drainEnergy', params: { amount: 2 } }],
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
    description: 'O adversário perde toda a energia acima de 5.',
    target: 'opponent',
    effects: [{ mechanic: 'drainEnergyAbove', params: { keep: 5 } }],
  },
  resiliencia: {
    name: 'Resiliência',
    emoji: '🧘',
    type: 'mental',
    cost: 0,
    description: 'Perdeste energia há pouco: durante 8s os drenos seguintes só te tiram metade, e depois um quarto. Aparece sozinha.',
    target: 'self',
    collectible: false,
    effects: [],
  },
  hipocondria: {
    name: 'Hipocondria',
    emoji: '😨',
    type: 'mental',
    cost: 3,
    description: 'O próximo tratamento do adversário não faz nada: gasta a energia e a carta. Dura até ele jogar um tratamento.',
    target: 'opponent',
    effects: [{ mechanic: 'cancelNext', params: { types: ['tratamento'] } }],
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
  alzheimer: {
    name: 'Alzheimer',
    emoji: '🧓',
    type: 'mental',
    cost: 2,
    description: 'Troca a mão toda por cartas aleatórias dos dois baralhos. Larga na área do adversário para trocar a dele, ou na tua para trocar a tua.',
    target: 'any',
    effects: [{ mechanic: 'shuffleHand', params: {} }],
  },

  // ---------- Sintomas (só se jogam se o adversário já tiver certa doença) ----------
  febre: {
    name: 'Febre',
    emoji: '🌡️',
    type: 'sintoma',
    cost: 2,
    description: 'Só se o adversário tiver um vírus ou bactéria. Durante 5s, os vírus e bactérias dele fazem +25% de dano.',
    target: 'opponent',
    requires: ['virus', 'bacteria'],
    effects: [
      { mechanic: 'statModifier', params: { stat: 'virusDamageTaken', op: 'mul', value: 1.25, duration: 5 } },
      { mechanic: 'statModifier', params: { stat: 'bacteriaDamageTaken', op: 'mul', value: 1.25, duration: 5 } },
    ],
  },
  tosse: {
    name: 'Tosse',
    emoji: '😮‍💨',
    type: 'sintoma',
    cost: 1,
    description: 'Só se o adversário tiver um vírus ou bactéria. Tira 2 de vida por cada vírus ou bactéria que ele tenha.',
    target: 'opponent',
    requires: ['virus', 'bacteria'],
    effects: [{ mechanic: 'damagePerDisease', params: { base: 0, per: 2, types: ['virus', 'bacteria'] } }],
  },
  vomitos: {
    name: 'Vómitos',
    emoji: '🤢',
    type: 'sintoma',
    cost: 1,
    description: 'Só se o adversário tiver um vírus ou bactéria. Uma carta ao acaso da mão dele vai para o fim da fila e entra a próxima.',
    target: 'opponent',
    requires: ['virus', 'bacteria'],
    effects: [{ mechanic: 'replaceRandom', params: {} }],
  },
  dorCabeca: {
    name: 'Dor de Cabeça',
    emoji: '🤯',
    type: 'sintoma',
    cost: 1,
    description: 'Só se o adversário tiver um vírus ou bactéria. A próxima carta dele custa +1 de energia.',
    target: 'opponent',
    requires: ['virus', 'bacteria'],
    effects: [{ mechanic: 'costIncrease', params: { types: Object.keys(CARD_TYPES) as CardType[], amount: 1 } }],
  },
  pesadelos: {
    name: 'Pesadelos',
    emoji: '😱',
    type: 'sintoma',
    cost: 1,
    description: 'Só se o adversário tiver uma doença Mental. Tira 3 de vida por cada doença Mental que ele tenha.',
    target: 'opponent',
    requires: ['mental'],
    effects: [{ mechanic: 'damagePerDisease', params: { base: 0, per: 3, types: ['mental'] } }],
  },

  // ---------- Tratamentos (cada cura cobre uma família de doenças) ----------
  medicacao: {
    name: 'Medicação',
    emoji: '💊',
    type: 'tratamento',
    cost: 3,
    description: 'Cura todos os vírus e bactérias (menos os permanentes).',
    target: 'self',
    effects: [{ mechanic: 'cleanse', params: { types: ['virus', 'bacteria'] } }],
  },
  fisioterapia: {
    name: 'Fisioterapia',
    emoji: '🩺',
    type: 'tratamento',
    cost: 3,
    description: 'Cura todas as doenças Físicas e os Estados.',
    target: 'self',
    effects: [{ mechanic: 'cleanse', params: { types: ['fisica', 'estado'] } }],
  },
  terapia: {
    name: 'Terapia',
    emoji: '🧘',
    type: 'tratamento',
    cost: 3,
    description: 'Cura todas as doenças Mentais e ficas imune a novas durante 5s.',
    target: 'self',
    effects: [
      { mechanic: 'cleanse', params: { types: ['mental'] } },
      { mechanic: 'immunity', params: { types: ['mental'], duration: 5 } },
    ],
  },
  hospital: {
    name: 'Hospital',
    emoji: '🏥',
    type: 'tratamento',
    cost: 6,
    description: 'Cura todas as doenças (menos as permanentes) e recuperas 8 de vida.',
    target: 'self',
    effects: [
      { mechanic: 'cleanse', params: {} },
      { mechanic: 'heal', params: { amount: 8 } },
    ],
  },
  vacina: {
    name: 'Vacina',
    emoji: '💉',
    type: 'tratamento',
    cost: 3,
    description: 'Ficas imune a novos vírus e bactérias durante 6s. Não cura os que já tens.',
    target: 'self',
    effects: [{ mechanic: 'immunity', params: { types: ['virus', 'bacteria'], duration: 6 } }],
  },
  quarentena: {
    name: 'Quarentena',
    emoji: '🚧',
    type: 'tratamento',
    cost: 3,
    description: 'Durante 5s nenhum jogador pode jogar vírus nem bactérias.',
    target: 'self',
    effects: [
      { mechanic: 'forbidTypes', params: { types: ['virus', 'bacteria'], duration: 5 } },
      { mechanic: 'forbidTypes', params: { types: ['virus', 'bacteria'], duration: 5 }, target: 'opponent' },
    ],
  },
  vitaminas: {
    name: 'Vitaminas',
    emoji: '🍊',
    type: 'tratamento',
    cost: 2,
    description: 'Recuperas 6 de vida em 8 segundos.',
    target: 'self',
    effects: [{ mechanic: 'healOverTime', params: { amount: 6, duration: 8 } }],
  },
  dormir: {
    name: 'Dormir',
    emoji: '😴',
    type: 'tratamento',
    cost: 3,
    description: 'Curas as doenças Mentais, mas durante 4s não podes jogar nada. Ao acordar ganhas 5 de energia.',
    target: 'self',
    effects: [
      { mechanic: 'cleanse', params: { types: ['mental'] } },
      { mechanic: 'sleep', params: { duration: 4, energy: 5 } },
    ],
  },
  bebida: {
    name: 'Bebida Energética',
    emoji: '🥤',
    type: 'tratamento',
    cost: 1,
    description: 'Ganhas 2 de energia já. A partir da 2.ª bebida nesta partida, cada uma tira-te o dobro da vida da anterior: 2, 4, 8, 16…',
    target: 'self',
    effects: [{ mechanic: 'energyBurst', params: { amount: 2, penalty: 2 } }],
  },
  cafe: {
    name: 'Café',
    emoji: '☕',
    type: 'tratamento',
    cost: 2,
    description: 'Quem o bebe ganha 3 de energia ao longo de 6 segundos e +1 ☕. Ao 3.º ☕ fica com Insónia. Larga na tua área para beberes, ou na do adversário para lhe dares.',
    target: 'any',
    effects: [
      { mechanic: 'gainEnergyOverTime', params: { amount: 3, duration: 6 } },
      { mechanic: 'buildUp', params: { disease: 'insonia', after: 3 } },
    ],
  },
});

export type CardId = keyof typeof CARDS;
/** Cartas que se podem pôr nos baralhos (sem as que só aparecem através de outras, como a Obesidade). */
export const CARD_IDS = (Object.keys(CARDS) as CardId[]).filter((id) => (CARDS[id] as CardDef).collectible !== false);

export const isCollectible = (id: string): boolean => (CARD_IDS as string[]).includes(id);

export const DEFAULT_DECK: CardId[] = [
  'constipacao', 'gripe', 'covid', 'pneumonia', 'salmonela',
  'hamburguer', 'asma', 'enxaqueca', 'vacina', 'fisioterapia',
];

export function getCard(id: string): CardDef {
  const card = (CARDS as Record<string, CardDef>)[id];
  if (!card) throw new Error(`Carta desconhecida: ${id}`);
  return card;
}

/** Devolve uma mensagem de erro, ou null se o baralho for válido. */
export function validateDeck(deck: unknown): string | null {
  if (!Array.isArray(deck) || deck.length !== CONFIG.deckSize) return `O baralho tem de ter ${CONFIG.deckSize} cartas.`;
  if (!deck.every((id) => typeof id === 'string' && isCollectible(id))) return 'O baralho tem cartas desconhecidas.';
  if (new Set(deck).size !== deck.length) return 'O baralho não pode ter cartas repetidas.';
  return null;
}
