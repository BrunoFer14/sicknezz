// Replays: em vez de gravar o jogo todo, guarda-se só a semente, os baralhos e as jogadas.
// Para ver o replay, o motor volta a simular a partida (é determinístico: ver random.ts).
import { CONFIG } from './config';
import { createGame, playCard, tick } from './game';
import type { GameEvent, GameState, PlayerIndex } from './types';

/** O servidor avança o jogo sempre em passos deste tamanho, para o replay dar exatamente o mesmo. */
export const TICK_DT = 1 / CONFIG.tickRate;

/** Uma jogada: no passo `tick`, `player` jogou a carta na posição `handIndex` da mão (side 1 = na própria área). */
export type ReplayMove = [tick: number, player: PlayerIndex, handIndex: number, side: 0 | 1];

export interface ReplayData {
  v: 1;
  seed: number;
  names: [string, string];
  decks: [string[], string[]];
  moves: ReplayMove[];
  /** Passo em que a partida acabou. */
  endTick: number;
  /** A partida acabou porque alguém desistiu ou saiu. */
  forfeit: { tick: number; loser: PlayerIndex; surrender: boolean } | null;
  /** Vida final de cada jogador: serve para detetar replays de versões antigas do jogo (que já não batem certo). */
  final: [number, number];
}

/** Volta a simular uma partida a partir do replay. */
export class ReplaySim {
  state: GameState;
  /** Passos já simulados. */
  tick = 0;
  /** Próxima jogada por aplicar. */
  private next = 0;
  /** Último passo cujas jogadas já foram aplicadas. */
  private applied = -1;

  constructor(readonly data: ReplayData) {
    this.state = createGame(data.names, data.decks, data.seed);
  }

  /** Avança até ao passo `target` e devolve os eventos que aconteceram pelo caminho. */
  stepTo(target: number): GameEvent[] {
    target = Math.min(target, this.data.endTick);
    // Mesma ordem que o servidor: as jogadas feitas no passo k acontecem antes de o jogo avançar para k+1.
    for (;;) {
      this.applyMoves();
      if (this.tick >= target) break;
      tick(this.state, TICK_DT);
      this.tick++;
    }
    const events = this.state.events;
    this.state.events = [];
    return events;
  }

  private applyMoves() {
    if (this.applied === this.tick) return;
    this.applied = this.tick;
    const { moves, forfeit } = this.data;
    while (this.next < moves.length && moves[this.next][0] === this.tick) {
      const [, player, handIndex, side] = moves[this.next++];
      playCard(this.state, player, handIndex, side ? 'self' : 'opponent');
    }
    if (forfeit && forfeit.tick === this.tick && this.state.winner === null) {
      this.state.winner = forfeit.loser === 0 ? 1 : 0;
      if (forfeit.surrender) this.state.events.push({ type: 'surrender', player: forfeit.loser });
    }
  }

  /** O replay deu o mesmo resultado que a partida original? (Muda se as cartas forem alteradas depois.) */
  matches(): boolean {
    const [a, b] = this.data.final;
    return this.state.players[0].hp === a && this.state.players[1].hp === b;
  }
}
