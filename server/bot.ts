// IA para o modo "contra o computador". Olha para o estado do jogo como um jogador (a sua mão, a energia,
// as doenças ativas) e dá uma pontuação a cada carta; joga a melhor quando tiver energia para ela.
import { getCard, validateDeck, type CardDef } from '../shared/cards';
import { cardCost, lockedSlots, maxPlayableCost, other, unmetRequirement } from '../shared/engine/game';
import { spreadable } from '../shared/engine/mechanics';
import { computeStats } from '../shared/engine/stats';
import type { CardType, GameState, PlayerIndex, PlayerState, Side } from '../shared/engine/types';

export type BotLevel = 'facil' | 'normal' | 'dificil';

/** `random`: probabilidade de jogar uma carta qualquer em vez da melhor; `noise`: erro na avaliação das cartas. */
export const BOT_LEVELS: Record<BotLevel, { name: string; reaction: [number, number]; noise: number; random: number }> = {
  /** Reage devagar e engana-se muitas vezes. */
  facil: { name: 'Fácil', reaction: [1.8, 3.2], noise: 1, random: 0.5 },
  normal: { name: 'Normal', reaction: [0.9, 1.8], noise: 0.4, random: 0.15 },
  /** Reage depressa e escolhe sempre a melhor carta. */
  dificil: { name: 'Difícil', reaction: [0.35, 0.8], noise: 0, random: 0 },
};

/** Baralhos que a IA usa (um ao calhas por partida). */
const BOT_DECKS: string[][] = [
  ['constipacao', 'gripe', 'covid', 'pneumonia', 'sepsis', 'salmonela', 'enxaqueca', 'vacina', 'hospital', 'vitaminas'],
  ['sedentarismo', 'obesidade', 'hipertensao', 'diabetes', 'fratura', 'gripe', 'tuberculose', 'fisioterapia', 'vitaminas', 'medicacao'],
  ['ansiedade', 'enxaqueca', 'burnout', 'paranoia', 'amnesia', 'covid', 'herpes', 'terapia', 'cafe', 'vitaminas'],
  ['constipacao', 'gripe', 'herpes', 'ebola', 'sida', 'avc', 'alergia', 'vacina', 'hospital', 'cafe'],
];

export function botDeck(): string[] {
  const valid = BOT_DECKS.filter((d) => validateDeck(d) === null);
  return [...valid[Math.floor(Math.random() * valid.length)]];
}

export interface BotMove {
  handIndex: number;
  side: Side;
}

export class Bot {
  /** Segundos até voltar a pensar (simula o tempo de reação). */
  private wait: number;

  constructor(
    readonly level: BotLevel,
    readonly me: PlayerIndex,
  ) {
    this.wait = this.reaction();
  }

  /** Chamado a cada atualização do jogo. Devolve a carta a jogar agora, ou null. */
  think(state: GameState, dt: number): BotMove | null {
    if (state.time < 0 || state.winner !== null) return null;
    this.wait -= dt;
    if (this.wait > 0) return null;

    const choice = this.choose(state);
    if (!choice) {
      this.wait = 0.5;
      return null;
    }
    const p = state.players[this.me];
    if (p.energy < cardCost(p, p.hand[choice.handIndex])) {
      this.wait = 0.25; // à espera de energia para a carta escolhida
      return null;
    }
    this.wait = this.reaction();
    return choice;
  }

  private reaction(): number {
    const [a, b] = BOT_LEVELS[this.level].reaction;
    return a + Math.random() * (b - a);
  }

  /** Escolhe a carta com melhor pontuação (com algum ruído, conforme a dificuldade). */
  private choose(state: GameState): (BotMove & { score: number }) | null {
    const p = state.players[this.me];
    const max = maxPlayableCost(p);
    const locked = lockedSlots(p);
    const maxEnergy = computeStats(p).maxEnergy;
    const noise = BOT_LEVELS[this.level].noise;

    const options: (BotMove & { score: number })[] = [];
    p.hand.forEach((id, handIndex) => {
      const cost = cardCost(p, id);
      if (locked.has(handIndex) || (max !== null && getCard(id).cost > max) || cost > maxEnergy) return;
      const card = getCard(id);
      if (unmetRequirement(state, this.me, card)) return; // sintoma sem a doença de que precisa
      const side: Side = card.target === 'self' ? 'self' : card.target === 'any' ? this.pickSide(state, card) : 'opponent';
      const value = this.value(state, card, side);
      if (value <= 0) return;
      // Eficiência: valor por energia, mas sem desprezar cartas grandes.
      const score = (value / (cost + 2)) * (1 + (Math.random() * 2 - 1) * noise);
      options.push({ handIndex, side, score });
    });
    if (!options.length) return null;
    if (Math.random() < BOT_LEVELS[this.level].random) return options[Math.floor(Math.random() * options.length)];
    return options.reduce((a, b) => (b.score > a.score ? b : a));
  }

  private pickSide(state: GameState, card: CardDef): Side {
    // Alzheimer: troca a própria mão se estiver má (cartas que não dá para jogar), senão estraga a do adversário.
    if (card.effects.some((e) => e.mechanic === 'shuffleHand')) return this.handIsBad(state) ? 'self' : 'opponent';
    return 'opponent';
  }

  private handIsBad(state: GameState): boolean {
    const p = state.players[this.me];
    return p.hand.filter((id) => getCard(id).cost > computeStats(p).maxEnergy || getCard(id).cost >= 7).length >= 2;
  }

  /** Quanto vale jogar esta carta agora (em "pontos de vida equivalentes"). 0 = não vale a pena. */
  private value(state: GameState, card: CardDef, side: Side): number {
    const me = state.players[this.me];
    const opp = state.players[other(this.me)];
    const target = side === 'self' ? me : opp;
    const hostile = target !== me;

    if (hostile && !card.effects.some((e) => e.mechanic === 'spread') && opp.effects.some((e) => e.blocks.includes(card.type))) return 0; // imune: seria desperdício
    // Não acumula: voltar a jogar a mesma doença quase não vale nada.
    const alreadyActive = hostile && target.effects.some((e) => getCard(e.cardId).name === card.name && e.source === this.me);

    let value = 0;
    for (const e of card.effects) {
      switch (e.mechanic) {
        case 'damage':
          value += this.dmg(opp, card.type, e.params.amount);
          break;
        case 'damageOverTime':
          value += this.dmg(opp, card.type, e.params.amount) * 0.9;
          break;
        case 'finisher':
          value += this.dmg(opp, card.type, opp.hp < e.params.below ? e.params.low : e.params.amount);
          break;
        case 'damagePerDisease':
          value += this.dmg(opp, card.type, e.params.base + e.params.per * diseases(opp, this.me, e.params.types));
          break;
        case 'infection':
          value += this.dmg(opp, card.type, e.params.total ? 29 : 20);
          break;
        case 'heal':
        case 'healOverTime':
          value += Math.min(e.params.amount, computeStats(me).maxHp - me.hp) * 1.2;
          break;
        case 'cleanse': {
          const cured = me.effects.filter(
            (x) => x.source !== this.me && !getCard(x.cardId).permanent && (!e.params.types || e.params.types.includes(x.cardType)),
          );
          value += new Set(cured.map((x) => x.playId)).size * 9;
          break;
        }
        case 'immunity':
          // Vale mais se o adversário tiver energia para atacar e ainda não estivermos protegidos.
          if (!me.effects.some((x) => e.params.types.every((t) => x.blocks.includes(t)))) value += opp.energy >= 4 ? 4 : 1;
          break;
        case 'drainEnergy':
          value += Math.min(e.params.amount, opp.energy) * 3;
          break;
        case 'drainEnergyOverTime':
          value += e.params.amount * 2;
          break;
        case 'drainEnergyAbove':
          value += Math.max(0, opp.energy - e.params.keep) * 3;
          break;
        case 'gainEnergyOverTime':
          value += me.energy < 6 ? e.params.amount * 2.5 : 1;
          break;
        case 'statModifier': {
          const { stat, value: v } = e.params;
          const dur = e.params.duration ?? 40;
          if (stat === 'energyRegen') value += Math.abs(1 - v) * dur * 0.8;
          else if (stat === 'maxEnergy') value += Math.abs(v) * 3;
          else if (stat === 'maxHp') value += Math.abs(v) * 0.7;
          else if (stat === 'healingTaken') value += opp.hp < computeStats(opp).maxHp - 10 ? 8 : 3; // Lepra
          else if (side === 'self') {
            // Redução do dano de vírus em mim: vale pelos vírus ativos.
            const viruses = new Set(me.effects.filter((x) => x.source !== this.me && x.cardType === 'virus').map((x) => x.playId)).size;
            value += viruses * 6;
          } else if (v >= 2) value += 14; // SIDA
          else value += diseases(opp, this.me, ['virus', 'bacteria']) * 5; // Febre
          break;
        }
        case 'spread': {
          // Espirro: vale mais ou menos o que a doença copiada vale (se o adversário não estiver protegido).
          const id = spreadable(state, this.me, e.params.types);
          if (id && !opp.effects.some((x) => x.blocks.includes(getCard(id).type))) value += getCard(id).cost * 4;
          break;
        }
        case 'forbidTypes':
          // Quarentena: vale a pena quando o adversário tem energia para atacar.
          value += opp.energy >= 5 ? 7 : 2;
          break;
        case 'costUp':
          value += opp.energy >= 4 ? 7 : 4;
          break;
        case 'forbidCards':
          value += opp.hand.some((id) => e.params.cards.includes(id)) ? 3 : 0.5;
          break;
        case 'costLimit':
        case 'lockSlots':
          value += opp.energy >= 4 ? 8 : 4;
          break;
        case 'costIncrease':
        case 'forgetBest':
        case 'blind':
          value += 5;
          break;
        case 'shuffleHand':
          value += side === 'self' ? (this.handIsBad(state) ? 8 : 0) : 4;
          break;
      }
    }
    if (alreadyActive) value *= 0.15;
    if (card.contagion) value *= 1 - card.contagion * 0.8;
    return value;
  }

  /** Dano que uma carta faria ao adversário (a contar com a SIDA). Um golpe fatal vale muito mais. */
  private dmg(opp: PlayerState, type: CardType, amount: number): number {
    const s = computeStats(opp);
    const mult = type === 'virus' ? s.virusDamageTaken : type === 'bacteria' ? s.bacteriaDamageTaken : 1;
    const real = amount * mult;
    return real >= opp.hp ? real * 3 : real;
  }
}

function diseases(p: PlayerState, from: PlayerIndex, types?: CardType[]): number {
  return new Set(p.effects.filter((e) => e.source === from && (!types || types.includes(e.cardType))).map((e) => e.playId)).size;
}
