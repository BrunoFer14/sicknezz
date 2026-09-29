// MECÂNICAS: os blocos reutilizáveis com que as cartas são feitas.
// Para criar uma mecânica nova, adiciona uma entrada a MECHANICS. O tipo dos params
// fica automaticamente disponível (com autocomplete) na definição das cartas.
import { getCard } from '../cards';
import { CONFIG } from './config';
import { random, shuffle } from './random';
import { countDiseases, damage, drainEnergy, gainEnergy, heal } from './actions';
import type { ActiveEffect, CardType, GameState, PlayerIndex, StatModifier, StatName, TargetKind } from './types';

export interface MechanicContext {
  state: GameState;
  /** Jogador afetado. */
  target: PlayerIndex;
  /** Jogador que jogou a carta. */
  source: PlayerIndex;
  /** Carta que criou o efeito. */
  cardId: string;
  /** Tipo da carta que criou o efeito. */
  cardType: CardType;
  /** Joga os efeitos de outra carta de `source` em `target`, como se fosse jogada agora (ver Espirro). */
  cast: (cardId: string) => void;
}

export interface MechanicDef<P> {
  /**
   * Sem `duration`: efeito instantâneo (corre onApply e acaba).
   * Com `duration`: fica ativo no jogador durante N segundos (null = permanente).
   */
  duration?: (params: P) => number | null;
  /** Modificadores de stats enquanto o efeito está ativo. */
  modifiers?: (params: P) => StatModifier[];
  /** Tipos de carta hostis que não afetam o jogador enquanto o efeito está ativo. */
  blocks?: (params: P) => CardType[];
  /** `effect` é null nos efeitos instantâneos. */
  onApply?: (ctx: MechanicContext, params: P, effect: ActiveEffect | null) => void;
  /** Pode pôr `effect.ended = true` para terminar o efeito mais cedo. */
  onTick?: (ctx: MechanicContext, params: P, effect: ActiveEffect, dt: number) => void;
  onExpire?: (ctx: MechanicContext, params: P, effect: ActiveEffect) => void;
  /** Quanto muda o custo das cartas deste tipo para o dono do efeito. */
  costDelta?: (params: P, cardType: CardType) => number;
  /** Chamado quando o dono do efeito joga uma carta (depois de pagar). Pode pôr `effect.ended = true`. */
  onOwnerPlay?: (params: P, effect: ActiveEffect, cardType: CardType) => void;
  /** Custo máximo das cartas que o dono do efeito pode jogar enquanto está ativo. */
  maxCost?: (params: P) => number;
  /** Posições da mão (0 = mais à esquerda) que o dono do efeito não pode jogar enquanto está ativo. */
  lockedSlots?: (params: P) => number[];
  /** Tipos de carta que o dono do efeito não pode jogar enquanto está ativo. */
  forbids?: (params: P) => CardType[];
  /** Cartas (ids) que o dono do efeito não pode jogar enquanto está ativo. */
  forbidsCards?: (params: P) => string[];
  /** Mensagem de erro se a carta não puder ser jogada agora (é verificado antes de pagar). */
  requires?: (state: GameState, source: PlayerIndex, params: P) => string | null;
  /** O próprio efeito trata das imunidades do alvo (o jogo não as verifica pelo tipo da carta). */
  ownImmunity?: boolean;
}

/** A doença mais forte (mais cara) destes tipos que `player` tem ativa e que se pode passar (não permanente). */
export function spreadable(state: GameState, player: PlayerIndex, types: CardType[]): string | null {
  let best: string | null = null;
  for (const e of state.players[player].effects) {
    if (e.source === player || !types.includes(e.cardType)) continue;
    const card = getCard(e.cardId);
    if (card.permanent) continue;
    if (!best || card.cost > getCard(best).cost) best = e.cardId;
  }
  return best;
}

function defineMechanic<P>(def: MechanicDef<P>): MechanicDef<P> {
  return def;
}

type OverTimeParams = { amount: number; duration: number };

/** Aplica `amount` distribuído uniformemente por `duration` segundos, em pontos inteiros. */
function overTime(apply: (ctx: MechanicContext, amount: number) => void): MechanicDef<OverTimeParams> {
  const step = (ctx: MechanicContext, p: OverTimeParams, e: ActiveEffect) => {
    const due = Math.floor(p.amount * Math.min(1, e.elapsed / p.duration));
    const done = e.data.done ?? 0;
    if (due > done) {
      e.data.done = due;
      apply(ctx, due - done);
    }
  };
  return { duration: (p) => p.duration, onTick: step, onExpire: step };
}

type InfectionParams = {
  /** Dano por segundo. */
  perSecond: number;
  /** Dano total até acabar. Sem total, dura até ser curada. */
  total?: number;
  /** Probabilidade (0–1), a cada `cureInterval` segundos, de a doença passar sozinha. */
  cureChance?: number;
  /** Segundos entre cada tentativa de cura (por omissão 1). */
  cureInterval?: number;
};

export const MECHANICS = {
  /** Dano imediato. */
  damage: defineMechanic<{ amount: number }>({
    onApply: ({ state, target, cardType }, p) => damage(state, target, p.amount, cardType),
  }),

  /** Dano imediato: `base` + `per` por cada doença ativa no alvo (opcionalmente só de um tipo). */
  damagePerDisease: defineMechanic<{ base: number; per: number; types?: CardType[] }>({
    onApply: ({ state, target, cardType }, p) => damage(state, target, p.base + p.per * countDiseases(state, target, p.types), cardType),
  }),

  /** Dano imediato; faz `low` em vez de `amount` se o alvo tiver menos de `below` de vida (golpe final). */
  finisher: defineMechanic<{ amount: number; low: number; below: number }>({
    onApply: ({ state, target, cardType }, p) => damage(state, target, state.players[target].hp < p.below ? p.low : p.amount, cardType),
  }),

  /** Cura imediata. */
  heal: defineMechanic<{ amount: number }>({
    onApply: ({ state, target }, p) => heal(state, target, p.amount),
  }),

  /** Dano distribuído ao longo do tempo. */
  damageOverTime: overTime(({ state, target, cardType }, n) => damage(state, target, n, cardType)),

  /** Cura distribuída ao longo do tempo. */
  healOverTime: overTime(({ state, target }, n) => heal(state, target, n)),

  /** Dano contínuo por segundo, com hipótese de passar sozinha. */
  infection: defineMechanic<InfectionParams>({
    duration: (p) => (p.total ? p.total / p.perSecond : null),
    onTick: ({ state, target, cardType }, p, e, dt) => {
      const done = e.data.done ?? 0;
      e.data.acc = (e.data.acc ?? 0) + p.perSecond * dt;
      let n = Math.floor(e.data.acc);
      if (p.total) n = Math.min(n, p.total - done);
      if (n > 0) {
        e.data.acc -= n;
        e.data.done = done + n;
        damage(state, target, n, cardType);
      }
      if (p.total && (e.data.done ?? 0) >= p.total) {
        e.ended = true;
        return;
      }
      if (!p.cureChance) return;
      e.data.roll = (e.data.roll ?? 0) + dt;
      const interval = p.cureInterval ?? 1;
      while (e.data.roll >= interval) {
        e.data.roll -= interval;
        if (random(state) < p.cureChance) {
          e.ended = true;
          state.events.push({ type: 'cured', player: target, cardId: e.cardId });
          return;
        }
      }
    },
    // Acerta arredondamentos quando a doença chega ao fim do tempo sem ser curada.
    onExpire: ({ state, target, cardType }, p, e) => {
      const rest = (p.total ?? 0) - (e.data.done ?? 0);
      if (!e.ended && rest > 0) damage(state, target, rest, cardType);
    },
  }),

  /** Altera um stat. Sem `duration` é permanente. */
  statModifier: defineMechanic<{ stat: StatName; op: StatModifier['op']; value: number; duration?: number }>({
    duration: (p) => p.duration ?? null,
    modifiers: (p) => [{ stat: p.stat, op: p.op, value: p.value }],
  }),

  /** Retira energia imediatamente. */
  drainEnergy: defineMechanic<{ amount: number }>({
    onApply: ({ state, target }, p) => drainEnergy(state, target, p.amount),
  }),

  /** Retira energia ao longo do tempo. */
  drainEnergyOverTime: overTime(({ state, target }, n) => drainEnergy(state, target, n)),

  /** Retira a energia acima de `keep`. */
  drainEnergyAbove: defineMechanic<{ keep: number }>({
    onApply: ({ state, target }, p) => drainEnergy(state, target, state.players[target].energy - p.keep),
  }),

  /** A carta mais cara da mão do alvo vai para o fim da fila e entra a próxima. */
  forgetBest: defineMechanic<Record<string, never>>({
    onApply: ({ state, target }) => {
      const pl = state.players[target];
      let best = 0;
      pl.hand.forEach((id, i) => {
        if (getCard(id).cost > getCard(pl.hand[best]).cost) best = i;
      });
      if (!pl.borrowed[best]) pl.deck.push(pl.hand[best]);
      pl.hand[best] = pl.deck.shift()!;
      pl.borrowed[best] = false;
    },
  }),

  /** O alvo deixa de ver as suas doenças durante `duration` segundos (tratado na vista, shared/protocol.ts). */
  blind: defineMechanic<{ duration: number }>({
    duration: (p) => p.duration,
  }),

  /** Durante `duration` segundos o alvo só pode jogar cartas até custo `max`. */
  costLimit: defineMechanic<{ max: number; duration: number }>({
    duration: (p) => p.duration,
    maxCost: (p) => p.max,
  }),

  /** Passa ao alvo uma cópia da doença mais forte destes tipos que quem joga tem (e continua com ela). */
  spread: defineMechanic<{ types: CardType[] }>({
    ownImmunity: true,
    requires: (state, source, p) => (spreadable(state, source, p.types) ? null : 'Não tens nenhum vírus nem bactéria para espirrar.'),
    onApply: (ctx, p) => {
      const id = spreadable(ctx.state, ctx.source, p.types);
      if (id) ctx.cast(id);
    },
  }),

  /** Durante `duration` segundos o alvo não pode jogar cartas destes tipos. */
  forbidTypes: defineMechanic<{ types: CardType[]; duration: number }>({
    duration: (p) => p.duration,
    forbids: (p) => p.types,
  }),

  /** Durante `duration` segundos o alvo não pode jogar as cartas nestas posições da mão. */
  lockSlots: defineMechanic<{ slots: number[]; duration: number }>({
    duration: (p) => p.duration,
    lockedSlots: (p) => p.slots,
  }),

  /** Energia imediata. A partir da 2.ª vez nesta partida, tira vida a quem joga: `penalty`, e duplica a cada vez (2, 4, 8…). */
  energyBurst: defineMechanic<{ amount: number; penalty: number }>({
    onApply: ({ state, source, cardId }, p) => {
      gainEnergy(state, source, p.amount);
      const times = state.players[source].played[cardId] ?? 1;
      if (times > 1) damage(state, source, p.penalty * 2 ** (times - 2));
    },
  }),

  /** Dá energia ao longo do tempo. */
  gainEnergyOverTime: overTime(({ state, target }, n) => gainEnergy(state, target, n)),

  /** A próxima carta destes tipos custa +`amount`; o efeito desaparece quando for jogada. */
  costIncrease: defineMechanic<{ types: CardType[]; amount: number }>({
    duration: () => null,
    costDelta: (p, type) => (p.types.includes(type) ? p.amount : 0),
    onOwnerPlay: (p, e, type) => {
      if (p.types.includes(type)) e.ended = true;
    },
  }),

  /** Durante `duration` segundos todas as cartas do alvo custam +`amount`. */
  costUp: defineMechanic<{ amount: number; duration: number }>({
    duration: (p) => p.duration,
    costDelta: (p) => p.amount,
  }),

  /** Durante `duration` segundos o alvo não pode jogar estas cartas. */
  forbidCards: defineMechanic<{ cards: string[]; duration: number }>({
    duration: (p) => p.duration,
    forbidsCards: (p) => p.cards,
  }),

  /** Troca a mão do alvo por cartas aleatórias de ambos os baralhos. As cartas originais voltam para o fim da fila. */
  shuffleHand: defineMechanic<Record<string, never>>({
    onApply: ({ state, target }) => {
      const pl = state.players[target];
      pl.hand.forEach((id, i) => {
        if (!pl.borrowed[i]) pl.deck.push(id);
      });
      // Sem cartas que trocam a mão, para não haver ciclos infinitos.
      const pool = shuffle(
        state,
        state.pool.filter((id) => !getCard(id).effects.some((e) => e.mechanic === 'shuffleHand')),
      );
      pl.hand = pool.slice(0, CONFIG.handSize);
      pl.borrowed = pl.hand.map(() => true);
    },
  }),

  /** Remove as doenças (efeitos hostis) do alvo. Sem `types`, remove todas. As cartas `permanent` nunca saem. */
  cleanse: defineMechanic<{ types?: CardType[] }>({
    onApply: ({ state, target }, p) => {
      const pl = state.players[target];
      pl.effects = pl.effects.filter(
        (e) => e.source === target || getCard(e.cardId).permanent || (p.types !== undefined && !p.types.includes(e.cardType)),
      );
    },
  }),

  /** Durante `duration` segundos, cartas hostis destes tipos não têm efeito. */
  immunity: defineMechanic<{ types: CardType[]; duration: number }>({
    duration: (p) => p.duration,
    blocks: (p) => p.types,
  }),
} satisfies Record<string, MechanicDef<any>>;

export type MechanicId = keyof typeof MECHANICS;

type ParamsOf<K extends MechanicId> = (typeof MECHANICS)[K] extends MechanicDef<infer P> ? P : never;

/** Um efeito tal como é escrito na definição de uma carta. */
export type EffectSpec = {
  [K in MechanicId]: {
    mechanic: K;
    params: ParamsOf<K>;
    /** Por omissão usa o alvo da carta. */
    target?: TargetKind;
  };
}[MechanicId];

export function getMechanic(id: string): MechanicDef<any> {
  const m = (MECHANICS as Record<string, MechanicDef<any>>)[id];
  if (!m) throw new Error(`Mecânica desconhecida: ${id}`);
  return m;
}
