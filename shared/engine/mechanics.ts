// MECÂNICAS: os blocos reutilizáveis com que as cartas são feitas.
// Para criar uma mecânica nova, adiciona uma entrada a MECHANICS. O tipo dos params
// fica automaticamente disponível (com autocomplete) na definição das cartas.
import { countDiseases, damage, drainMana, heal } from './actions';
import type { ActiveEffect, CardType, GameState, PlayerIndex, StatModifier, StatName, TargetKind } from './types';

export interface MechanicContext {
  state: GameState;
  /** Jogador afetado. */
  target: PlayerIndex;
  /** Jogador que jogou a carta. */
  source: PlayerIndex;
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
  /** Probabilidade (0–1), a cada segundo, de a doença passar sozinha. */
  cureChance?: number;
};

export const MECHANICS = {
  /** Dano imediato. */
  damage: defineMechanic<{ amount: number }>({
    onApply: ({ state, target }, p) => damage(state, target, p.amount),
  }),

  /** Dano imediato: `base` + `per` por cada doença ativa no alvo (opcionalmente só de um tipo). */
  damagePerDisease: defineMechanic<{ base: number; per: number; type?: CardType }>({
    onApply: ({ state, target }, p) => damage(state, target, p.base + p.per * countDiseases(state, target, p.type)),
  }),

  /** Cura imediata. */
  heal: defineMechanic<{ amount: number }>({
    onApply: ({ state, target }, p) => heal(state, target, p.amount),
  }),

  /** Dano distribuído ao longo do tempo. */
  damageOverTime: overTime(({ state, target }, n) => damage(state, target, n)),

  /** Cura distribuída ao longo do tempo. */
  healOverTime: overTime(({ state, target }, n) => heal(state, target, n)),

  /** Dano contínuo por segundo, com hipótese de passar sozinha. */
  infection: defineMechanic<InfectionParams>({
    duration: (p) => (p.total ? p.total / p.perSecond : null),
    onTick: ({ state, target }, p, e, dt) => {
      const done = e.data.done ?? 0;
      e.data.acc = (e.data.acc ?? 0) + p.perSecond * dt;
      let n = Math.floor(e.data.acc);
      if (p.total) n = Math.min(n, p.total - done);
      if (n > 0) {
        e.data.acc -= n;
        e.data.done = done + n;
        damage(state, target, n);
      }
      if (p.total && (e.data.done ?? 0) >= p.total) {
        e.ended = true;
        return;
      }
      if (!p.cureChance) return;
      e.data.roll = (e.data.roll ?? 0) + dt;
      while (e.data.roll >= 1) {
        e.data.roll -= 1;
        if (Math.random() < p.cureChance) {
          e.ended = true;
          state.events.push({ type: 'cured', player: target, cardId: e.cardId });
          return;
        }
      }
    },
    // Acerta arredondamentos quando a doença chega ao fim do tempo sem ser curada.
    onExpire: ({ state, target }, p, e) => {
      const rest = (p.total ?? 0) - (e.data.done ?? 0);
      if (!e.ended && rest > 0) damage(state, target, rest);
    },
  }),

  /** Altera um stat. Sem `duration` é permanente. */
  statModifier: defineMechanic<{ stat: StatName; op: StatModifier['op']; value: number; duration?: number }>({
    duration: (p) => p.duration ?? null,
    modifiers: (p) => [{ stat: p.stat, op: p.op, value: p.value }],
  }),

  /** Retira mana imediatamente. */
  drainMana: defineMechanic<{ amount: number }>({
    onApply: ({ state, target }, p) => drainMana(state, target, p.amount),
  }),

  /** Retira mana ao longo do tempo. */
  drainManaOverTime: overTime(({ state, target }, n) => drainMana(state, target, n)),

  /** Remove as doenças (efeitos hostis) do alvo. Sem `types`, remove todas. */
  cleanse: defineMechanic<{ types?: CardType[] }>({
    onApply: ({ state, target }, p) => {
      const pl = state.players[target];
      pl.effects = pl.effects.filter((e) => e.source === target || (p.types !== undefined && !p.types.includes(e.cardType)));
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
