// Replay: volta a simular a partida com o motor do jogo a partir das jogadas guardadas (ver shared/engine/replay.ts).
import { ReplaySim, TICK_DT, type ReplayData } from '../../shared/engine/replay';
import type { GameEvent, PlayerIndex } from '../../shared/engine/types';
import { makeView, type GameView } from '../../shared/protocol';
import { GameScreen } from './game';

const SPEEDS = [1, 2, 4];
const clockText = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const EXTRAS = { rematch: [false, false] as [boolean, boolean], opponentConnected: true, opponentReconnectIn: null, ranked: false, rating: null, ratingDelta: null };

export class ReplayScreen {
  private game: GameScreen;
  private bar = document.createElement('div');
  private sim: ReplaySim;
  /** Posição atual, em passos de jogo (pode ter parte decimal). */
  private pos = 0;
  private speed = 1;
  private playing = true;
  private raf = 0;
  private lastNow = performance.now();
  private end: number;

  constructor(
    container: HTMLElement,
    private data: ReplayData,
    /** De que lado se está a ver (começa pelo teu). */
    private side: PlayerIndex,
    private onClose: () => void,
  ) {
    this.end = data.endTick;
    this.sim = new ReplaySim(data);
    this.game = new GameScreen(container, () => {}, onClose, { replay: true });
    this.render(this.sim.stepTo(0));

    // Replays de versões antigas do jogo (cartas entretanto alteradas) já não dão o mesmo resultado.
    const check = new ReplaySim(data);
    check.stepTo(data.endTick);
    const outdated = !check.matches();

    this.bar.className = 'replay-bar';
    this.bar.innerHTML = `
      <span class="replay-label">▶️ REPLAY</span>
      <button class="icon-btn" id="rp-play" title="Pausa">⏸</button>
      <button class="icon-btn" id="rp-speed" title="Velocidade">1×</button>
      <input type="range" id="rp-seek" min="0" max="${this.end}" step="1" value="0" />
      <span class="replay-time"></span>
      <button class="icon-btn" id="rp-side" title="Ver do lado do outro jogador">🔄</button>
      <button class="icon-btn" id="rp-close" title="Sair do replay">✕</button>
      ${outdated ? '<span class="replay-warn" title="As cartas mudaram desde esta partida: o replay pode não ser igual ao que aconteceu.">⚠️ versão antiga</span>' : ''}`;
    document.body.append(this.bar);

    this.bar.querySelector('#rp-play')!.addEventListener('click', () => {
      if (!this.playing && this.pos >= this.end) this.seek(0); // no fim: recomeça
      this.playing = !this.playing;
      this.updateBar();
    });
    this.bar.querySelector('#rp-speed')!.addEventListener('click', () => {
      this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
      this.updateBar();
    });
    this.bar.querySelector('#rp-side')!.addEventListener('click', () => {
      this.side = this.side === 0 ? 1 : 0;
      this.game.clearLog();
      this.render([]);
    });
    this.bar.querySelector<HTMLInputElement>('#rp-seek')!.addEventListener('input', (e) => this.seek(Number((e.target as HTMLInputElement).value)));
    this.bar.querySelector('#rp-close')!.addEventListener('click', () => this.close());

    this.updateBar();
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    const dt = Math.min(0.25, (now - this.lastNow) / 1000);
    this.lastNow = now;
    if (this.playing) {
      this.pos = Math.min(this.end, this.pos + (dt * this.speed) / TICK_DT);
      const events = this.sim.stepTo(Math.floor(this.pos));
      this.render(events);
      if (this.pos >= this.end) this.playing = false;
      this.updateBar();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Mostra o estado atual do lado escolhido. No replay vê-se também a mão do adversário. */
  private render(events: GameEvent[]) {
    const state = this.sim.state;
    const view: GameView = makeView(state, this.side, events, EXTRAS);
    view.opp.hand = [...state.players[this.side === 0 ? 1 : 0].hand];
    this.game.update(view);
  }

  /** Salta para o passo `pos` (volta a simular desde o início; sem repetir sons do que ficou para trás). */
  private seek(pos: number) {
    this.pos = pos;
    if (pos < this.sim.tick) this.sim = new ReplaySim(this.data);
    this.sim.stepTo(pos);
    this.game.clearLog();
    this.render([]);
    this.updateBar();
  }

  private updateBar() {
    this.bar.querySelector('#rp-play')!.textContent = this.playing ? '⏸' : '▶️';
    this.bar.querySelector('#rp-speed')!.textContent = `${this.speed}×`;
    const seek = this.bar.querySelector<HTMLInputElement>('#rp-seek')!;
    if (document.activeElement !== seek) seek.value = String(Math.floor(this.pos));
    const time = (p: number) => clockText(Math.max(0, this.sim.state.time + (p - this.sim.tick) * TICK_DT));
    const winner = this.sim.state.winner;
    const done = this.pos >= this.end && winner !== null;
    const result = winner === 'draw' ? 'Empate' : `Ganhou ${this.data.names[winner ?? 0]}`;
    this.bar.querySelector('.replay-time')!.textContent = done ? `Fim · ${result}` : `${time(this.pos)} / ${time(this.end)}`;
  }

  close() {
    cancelAnimationFrame(this.raf);
    this.bar.remove();
    this.game.destroy();
    this.onClose();
  }
}
