import { getCard } from '../../shared/cards';
import type { GameEvent, Side } from '../../shared/engine/types';
import type { ClientMsg, EffectView, GameView, PlayerView } from '../../shared/protocol';
import { cardEl, escapeHtml } from './card';
import { isMuted, sfx, toggleMute } from './sound';

interface Hud {
  root: HTMLElement;
  name: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  manaCells: HTMLElement;
  manaText: HTMLElement;
  regen: HTMLElement;
}

interface Board {
  root: HTMLElement;
  effects: HTMLElement;
  els: Map<number, HTMLElement>;
}

const HUD_HTML = `
  <div class="hud">
    <div class="name"></div>
    <div class="hp"><div class="hp-fill"></div><span class="hp-text"></span></div>
    <div class="mana-row">
      <div class="mana-cells"></div>
      <span class="mana-text"></span>
      <span class="regen"></span>
    </div>
  </div>`;

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const clockText = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** Escurece a carta enquanto não há mana suficiente para a jogar. */
function showCharge(cardNode: HTMLElement, mana: number, cost: number) {
  const ready = mana >= cost;
  cardNode.classList.toggle('unaffordable', !ready);
  (cardNode.querySelector('.charge') as HTMLElement).style.height = `${ready ? 0 : (1 - mana / cost) * 100}%`;
}

export class GameScreen {
  private root = document.createElement('div');
  private view: GameView | null = null;
  private hud: { me: Hud; opp: Hud };
  private board: { me: Board; opp: Board };
  private handSlots: HTMLElement[] = [];
  private handIds: (string | null)[] = [];
  private oppHand: HTMLElement;
  private nextSlot: HTMLElement;
  private nextId: string | null = null;
  private clock: HTMLElement;
  private countdown: HTMLElement;
  private overlay: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;
  private logList: HTMLElement;
  private lastWinner: GameView['winner'] = null;
  private lastCount = 0;
  private banner: HTMLElement;
  /** Cópia da carta que está a ser arrastada (tem de acompanhar a mana também). */
  private dragGhost: { index: number; el: HTMLElement } | null = null;
  private onKey = (e: KeyboardEvent) => {
    const n = Number(e.key);
    if (n >= 1 && n <= this.handSlots.length) this.tryPlay(n - 1);
  };

  constructor(
    container: HTMLElement,
    private send: (msg: ClientMsg) => void,
    private onExit: () => void,
  ) {
    this.root.className = 'game-wrap';
    this.root.innerHTML = `
      <div class="game">
      <section class="side opp">${HUD_HTML}<div class="opp-hand"></div></section>
      <section class="board opp-board">
        <div class="zone-label">Área do adversário</div>
        <div class="effects"></div>
      </section>
      <div class="midline">
        <span class="clock">0:00</span>
        <button class="icon-btn mute" title="Som"></button>
        <button class="icon-btn log-toggle" title="Histórico">📜</button>
      </div>
      <section class="board my-board">
        <div class="zone-label">A tua área</div>
        <div class="effects"></div>
      </section>
      <section class="side me">
        <div class="hand-row">
          <div class="hand"></div>
          <div class="next"><span>Próxima</span><div class="next-slot"></div></div>
        </div>
        ${HUD_HTML}
      </section>
      <div class="countdown" hidden></div>
      <div class="opp-banner" hidden></div>
      </div>
      <aside class="log">
        <div class="log-head"><h3>Histórico</h3><button class="log-close" title="Fechar">✕</button></div>
        <div class="log-list"><p class="log-empty">Ainda nada aconteceu.</p></div>
      </aside>
      <div class="overlay" hidden></div>
      <div class="toast"></div>`;

    const q = <T extends HTMLElement>(sel: string, from: ParentNode = this.root) => from.querySelector<T>(sel)!;
    const makeHud = (side: HTMLElement): Hud => ({
      root: q('.hud', side),
      name: q('.name', side),
      hpFill: q('.hp-fill', side),
      hpText: q('.hp-text', side),
      manaCells: q('.mana-cells', side),
      manaText: q('.mana-text', side),
      regen: q('.regen', side),
    });
    const makeBoard = (el: HTMLElement): Board => ({ root: el, effects: q('.effects', el), els: new Map() });

    this.hud = { me: makeHud(q('.side.me')), opp: makeHud(q('.side.opp')) };
    this.board = { me: makeBoard(q('.my-board')), opp: makeBoard(q('.opp-board')) };
    this.logList = q('.log-list');
    const log = q('.log');
    q('.log-toggle').addEventListener('click', () => log.classList.toggle('open'));
    q('.log-close').addEventListener('click', () => log.classList.remove('open'));
    this.oppHand = q('.opp-hand');
    this.nextSlot = q('.next-slot');
    this.clock = q('.clock');
    this.countdown = q('.countdown');
    this.overlay = q('.overlay');
    this.toastEl = q('.toast');
    this.banner = q('.opp-banner');
    const mute = q('.mute');
    mute.textContent = isMuted() ? '🔇' : '🔊';
    mute.addEventListener('click', () => (mute.textContent = toggleMute() ? '🔇' : '🔊'));

    const hand = q('.hand');
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      hand.append(slot);
      this.handSlots.push(slot);
      this.handIds.push(null);
      this.setupDrag(slot, i);
    }

    window.addEventListener('keydown', this.onKey);
    container.append(this.root);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }

  update(view: GameView) {
    this.view = view;
    this.updateHud(this.hud.me, view.me);
    this.updateHud(this.hud.opp, view.opp);
    this.updateHand(view);
    this.updateOppHand(view.opp.handCount);
    this.syncEffects(this.board.me, view.me.effects);
    this.syncEffects(this.board.opp, view.opp.effects);

    // Revanche: começa um histórico novo.
    if (view.winner === null && this.lastWinner !== null) this.logList.innerHTML = '<p class="log-empty">Ainda nada aconteceu.</p>';
    if (view.winner !== null && this.lastWinner === null) {
      if (view.winner === view.you) sfx.win();
      else if (view.winner !== 'draw') sfx.lose();
    }
    this.lastWinner = view.winner;

    this.clock.textContent = clockText(Math.max(0, view.time));
    this.countdown.hidden = view.time >= 0;
    const count = view.time < 0 ? Math.ceil(-view.time) : 0;
    if (count !== this.lastCount) {
      if (count > 0) sfx.tick();
      else sfx.go();
      this.lastCount = count;
    }
    if (count) this.countdown.textContent = String(count);

    const waiting = view.winner === null && view.opponentReconnectIn !== null;
    this.banner.hidden = !waiting;
    if (waiting) this.banner.textContent = `O adversário perdeu a ligação. Se não voltar em ${Math.ceil(view.opponentReconnectIn!)}s, ganhas.`;

    view.events.forEach((e) => this.handleEvent(e, view));
    this.updateOverlay(view);
  }

  toast(message: string) {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 1600);
  }

  // ---------- HUD ----------

  private updateHud(hud: Hud, p: PlayerView) {
    hud.name.textContent = p.name;
    const hpPct = Math.max(0, p.hp / p.stats.maxHp);
    hud.hpFill.style.width = `${hpPct * 100}%`;
    hud.hpFill.classList.toggle('low', hpPct < 0.3);
    hud.hpText.textContent = `${Math.ceil(p.hp)} / ${p.stats.maxHp}`;

    const cellCount = Math.max(p.base.maxMana, p.stats.maxMana);
    if (hud.manaCells.children.length !== cellCount) {
      hud.manaCells.innerHTML = '<div class="cell"><div class="cell-fill"></div></div>'.repeat(cellCount);
    }
    Array.from(hud.manaCells.children).forEach((cell, i) => {
      const locked = i >= p.stats.maxMana;
      cell.classList.toggle('locked', locked);
      const fill = Math.min(1, Math.max(0, p.mana - i));
      (cell.firstElementChild as HTMLElement).style.width = locked ? '0' : `${fill * 100}%`;
    });
    hud.manaText.textContent = `${Math.floor(p.mana)}/${p.stats.maxMana}`;
    hud.regen.textContent = p.stats.manaRegen > 0 ? `+1 a cada ${fmt(1 / p.stats.manaRegen)}s` : 'parada';
    hud.regen.classList.toggle('debuff', p.stats.manaRegen < p.base.manaRegen);
    hud.regen.classList.toggle('buff', p.stats.manaRegen > p.base.manaRegen);
  }

  // ---------- Mão ----------

  private updateHand(view: GameView) {
    const { hand, mana, next, costs, borrowed } = view.me;
    hand.forEach((id, i) => {
      const slot = this.handSlots[i];
      if (this.handIds[i] !== id) {
        this.handIds[i] = id;
        const el = cardEl(id);
        el.classList.add('enter');
        el.insertAdjacentHTML('beforeend', `<div class="key">[${i + 1}]</div>`);
        slot.replaceChildren(el);
      }
      const cost = costs[i];
      const el = slot.firstElementChild as HTMLElement;
      // Custo pode mudar durante o jogo (ex.: Alergia).
      (el.querySelector('.cost') as HTMLElement).textContent = String(cost);
      el.classList.toggle('taxed', cost > getCard(id).cost);
      el.classList.toggle('borrowed', borrowed[i]);
      showCharge(el, mana, cost);
      if (this.dragGhost?.index === i) showCharge(this.dragGhost.el, mana, cost);
    });
    if (this.nextId !== next) {
      this.nextId = next;
      this.nextSlot.replaceChildren(cardEl(next, 'mini'));
    }
  }

  private updateOppHand(count: number) {
    if (this.oppHand.children.length !== count) {
      this.oppHand.innerHTML = '<div class="card-back"><span>🦠</span></div>'.repeat(count);
    }
  }

  private tryPlay(index: number, side: Side = 'opponent'): boolean {
    const v = this.view;
    const id = this.handIds[index];
    if (!v || !id || v.winner !== null) return false;
    if (v.time < 0) {
      this.toast('Espera pelo início do jogo!');
      return false;
    }
    if (v.me.mana < v.me.costs[index]) {
      this.toast('Mana insuficiente');
      sfx.error();
      this.shake(this.handSlots[index]);
      return false;
    }
    this.send({ t: 'play', handIndex: index, side });
    return true;
  }

  private shake(el: HTMLElement) {
    el.classList.remove('shake');
    void el.offsetWidth; // reinicia a animação
    el.classList.add('shake');
  }

  // ---------- Drag & drop ----------

  private setupDrag(slot: HTMLElement, index: number) {
    slot.addEventListener('pointerdown', (down) => {
      const id = this.handIds[index];
      const source = slot.firstElementChild as HTMLElement | null;
      if (!id || !source || down.button !== 0) return;
      down.preventDefault();

      const card = getCard(id);
      const opp = this.board.opp.root;
      const me = this.board.me.root;
      // Cartas 'any' (ex.: Alzheimer) podem ser largadas em qualquer das áreas.
      const zones = card.target === 'any' ? [opp, me] : card.target === 'opponent' ? [opp] : [me];
      const wrongZone = card.target === 'any' ? null : card.target === 'opponent' ? me : opp;
      const rect = source.getBoundingClientRect();
      const offX = down.clientX - rect.left;
      const offY = down.clientY - rect.top;

      const ghost = source.cloneNode(true) as HTMLElement;
      ghost.classList.remove('enter');
      ghost.classList.add('ghost');
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      const moveGhost = (x: number, y: number) => (ghost.style.transform = `translate(${x - offX}px, ${y - offY}px) rotate(-4deg) scale(1.05)`);
      moveGhost(down.clientX, down.clientY);
      document.body.append(ghost);
      this.dragGhost = { index, el: ghost };

      slot.classList.add('dragging');
      for (const z of zones) z.classList.add('drop-target');
      const inside = (el: HTMLElement, e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      };

      const move = (e: PointerEvent) => {
        moveGhost(e.clientX, e.clientY);
        for (const z of zones) z.classList.toggle('drop-hover', inside(z, e));
      };
      const end = (e: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        this.dragGhost = null;
        slot.classList.remove('dragging');
        for (const z of zones) z.classList.remove('drop-target', 'drop-hover');

        let played = false;
        const dropped = e.type === 'pointerup' ? zones.find((z) => inside(z, e)) : undefined;
        if (dropped) played = this.tryPlay(index, dropped === me ? 'self' : 'opponent');
        else if (e.type === 'pointerup' && wrongZone && inside(wrongZone, e)) {
          this.toast(card.target === 'opponent' ? 'Esta carta joga-se na área do adversário' : 'Esta carta joga-se na tua área');
        }

        if (played) {
          ghost.classList.add('consumed');
          setTimeout(() => ghost.remove(), 250);
        } else {
          ghost.classList.add('returning');
          ghost.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
          setTimeout(() => ghost.remove(), 200);
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
  }

  // ---------- Efeitos ativos ----------

  private syncEffects(board: Board, effects: EffectView[]) {
    const alive = new Set<number>();
    for (const e of effects) {
      alive.add(e.id);
      let el = board.els.get(e.id);
      if (!el) {
        el = document.createElement('div');
        el.className = `effect-card type-${getCard(e.cardId).type} ${e.hostile ? 'hostile' : 'friendly'}`;
        el.append(cardEl(e.cardId));
        el.insertAdjacentHTML(
          'beforeend',
          e.duration === null
            ? '<div class="e-time perm">Permanente</div>'
            : '<div class="e-timer"><div class="e-fill"></div></div><div class="e-time"></div>',
        );
        board.effects.append(el);
        board.els.set(e.id, el);
      }
      if (e.remaining !== null && e.duration) {
        (el.querySelector('.e-fill') as HTMLElement).style.width = `${(e.remaining / e.duration) * 100}%`;
        (el.querySelector('.e-time') as HTMLElement).textContent = `${Math.ceil(e.remaining)}s`;
      }
    }
    for (const [id, el] of board.els) {
      if (alive.has(id)) continue;
      board.els.delete(id);
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 250);
    }
  }

  // ---------- Eventos / animações ----------

  private handleEvent(e: GameEvent, view: GameView) {
    const mine = (p: number) => p === view.you;
    switch (e.type) {
      case 'played': {
        const board = mine(e.target) ? this.board.me : this.board.opp;
        const splash = document.createElement('div');
        splash.className = `splash ${mine(e.player) ? 'by-me' : 'by-opp'}`;
        splash.append(cardEl(e.cardId, 'mini'));
        board.root.append(splash);
        setTimeout(() => splash.remove(), 1200);
        sfx.play();
        const who = mine(e.player) ? 'Tu' : escapeHtml(view.opp.name);
        const where = e.target === e.player ? '' : mine(e.target) ? ' em ti' : ' no adversário';
        this.log(view, e.cardId, `<b>${who}</b> jogou <b>${escapeHtml(getCard(e.cardId).name)}</b>${where}`, mine(e.player) ? 'me' : 'opp');
        break;
      }
      case 'damage':
        this.float(mine(e.player) ? this.hud.me : this.hud.opp, `-${Math.round(e.amount)}`, 'dmg');
        if (mine(e.player)) sfx.hitMe();
        else sfx.hitOpp();
        break;
      case 'heal':
        this.float(mine(e.player) ? this.hud.me : this.hud.opp, `+${Math.round(e.amount)}`, 'heal');
        sfx.heal();
        break;
      case 'manaLoss':
        this.float(mine(e.player) ? this.hud.me : this.hud.opp, `-${fmt(e.amount)} mana`, 'mana');
        sfx.mana();
        break;
      case 'blocked': {
        sfx.blocked();
        const name = escapeHtml(getCard(e.cardId).name);
        this.float(mine(e.player) ? this.hud.me : this.hud.opp, `Imune a ${getCard(e.cardId).name}!`, 'info');
        this.log(view, e.cardId, mine(e.player) ? `Estavas imune a <b>${name}</b>` : `O adversário estava imune a <b>${name}</b>`, 'info');
        break;
      }
      case 'cured': {
        sfx.cured();
        const name = escapeHtml(getCard(e.cardId).name);
        this.float(mine(e.player) ? this.hud.me : this.hud.opp, `${getCard(e.cardId).name} passou!`, 'info');
        this.log(view, e.cardId, mine(e.player) ? `<b>${name}</b> passou-te sozinha` : `<b>${name}</b> passou ao adversário`, 'info');
        break;
      }
    }
  }

  private log(view: GameView, cardId: string, html: string, cls: 'me' | 'opp' | 'info') {
    const card = getCard(cardId);
    this.logList.querySelector('.log-empty')?.remove();
    const el = document.createElement('div');
    el.className = `log-entry ${cls} type-${card.type}`;
    el.dataset.card = cardId; // permite ver a carta em grande
    el.innerHTML = `<span class="log-time">${clockText(Math.max(0, view.time))}</span><span class="log-emoji">${card.emoji}</span><span class="log-text">${html}</span>`;
    this.logList.prepend(el);
    while (this.logList.children.length > 60) this.logList.lastElementChild!.remove();
  }

  private float(hud: Hud, text: string, cls: string) {
    const el = document.createElement('span');
    el.className = `float ${cls}`;
    el.textContent = text;
    el.style.left = `${40 + Math.random() * 30}%`;
    hud.root.append(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // ---------- Fim de jogo ----------

  private updateOverlay(view: GameView) {
    if (view.winner === null) {
      this.overlay.hidden = true;
      return;
    }
    const title = view.winner === 'draw' ? 'Empate' : view.winner === view.you ? 'Vitória!' : 'Derrota';
    const cls = view.winner === 'draw' ? 'draw' : view.winner === view.you ? 'win' : 'lose';
    const oppIdx = view.you === 0 ? 1 : 0;
    const asked = view.rematch[view.you];
    const oppAsked = view.rematch[oppIdx];
    const note = !view.opponentConnected ? 'O adversário saiu.' : oppAsked ? 'O adversário quer revanche!' : '';
    const d = view.ratingDelta;
    const rating =
      view.ranked && d !== null && view.rating !== null
        ? `<p class="rating ${d >= 0 ? 'up' : 'down'}">Ranking: ${d >= 0 ? '+' : ''}${d} pontos · agora tens ${view.rating}</p>`
        : '';
    const key = `${cls}|${asked}|${note}|${rating}`;
    if (this.overlay.dataset.key === key && !this.overlay.hidden) return;
    this.overlay.dataset.key = key;

    this.overlay.innerHTML = `
      <div class="result ${cls}">
        <h2>${title}</h2>
        ${rating}
        <p>${escapeHtml(note)}</p>
        <div class="row">
          ${view.opponentConnected ? `<button class="btn primary" id="rematch" ${asked ? 'disabled' : ''}>${asked ? 'À espera…' : 'Revanche'}</button>` : ''}
          <button class="btn" id="exit">Sair</button>
        </div>
      </div>`;
    this.overlay.querySelector('#rematch')?.addEventListener('click', () => this.send({ t: 'rematch' }));
    this.overlay.querySelector('#exit')!.addEventListener('click', () => this.onExit());
    this.overlay.hidden = false;
  }
}
