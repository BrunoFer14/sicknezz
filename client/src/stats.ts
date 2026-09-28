import { CARD_TYPES, getCard } from '../../shared/cards';
import type { StatsPayload } from '../../shared/protocol';
import { escapeHtml } from './card';

type Tab = 'me' | 'ranking' | 'cards';

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export class StatsScreen {
  private root = document.createElement('div');
  private stats: StatsPayload | null = null;
  private tab: Tab = 'me';

  constructor(
    container: HTMLElement,
    private onBack: () => void,
  ) {
    this.root.className = 'stats-screen';
    this.root.innerHTML = `
      <header class="builder-head">
        <button class="btn" id="back">← Voltar</button>
        <div class="builder-title"><h2>Estatísticas</h2></div>
        <span style="width:80px"></span>
      </header>
      <div class="filters">
        <button class="chip" data-tab="me">👤 As tuas</button>
        <button class="chip" data-tab="ranking">🏆 Ranking</button>
        <button class="chip" data-tab="cards">🃏 Cartas</button>
      </div>
      <div class="stats-body"><p class="muted">A carregar…</p></div>`;
    this.root.querySelector('#back')!.addEventListener('click', () => {
      this.root.remove();
      this.onBack();
    });
    this.root.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab as Tab;
        this.render();
      }),
    );
    container.append(this.root);
    this.render();
  }

  show(stats: StatsPayload) {
    this.stats = stats;
    this.render();
  }

  private render() {
    this.root.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === this.tab));
    if (!this.stats) return;
    const body = this.root.querySelector('.stats-body')!;
    body.innerHTML = this.tab === 'me' ? this.renderMe() : this.tab === 'ranking' ? this.renderRanking() : this.renderCards();
  }

  private renderMe(): string {
    const me = this.stats!.me;
    if (!me) return '<p class="muted">Ainda não jogaste nenhuma partida. Joga uma e volta aqui!</p>';
    const tiles: [string, string | number][] = [
      ['Pontos', me.rankedGames ? me.rating : '—'],
      ['Partidas', me.games],
      ['Vitórias', me.wins],
      ['Derrotas', me.losses],
      ['Empates', me.draws],
      ['% vitórias', pct(me.wins, me.games)],
    ];
    const top = Object.entries(me.cardPlays)
      .filter(([id]) => safeCard(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return `
      <h3 class="stats-name">${escapeHtml(me.name)}</h3>
      <div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <p class="muted">Os pontos só mudam nas partidas de "Procurar adversário". As salas com código são amigáveis.</p>
      <h4>Cartas que mais jogas</h4>
      ${top.length ? `<ol class="top-cards">${top.map(([id, n]) => `<li>${getCard(id).emoji} ${escapeHtml(getCard(id).name)} <span class="muted">${n}×</span></li>`).join('')}</ol>` : '<p class="muted">—</p>'}`;
  }

  private renderRanking(): string {
    const rows = this.stats!.leaderboard;
    if (!rows.length) return '<p class="muted">Ainda ninguém jogou uma partida ranked.</p>';
    return `
      <div class="table-wrap"><table class="stats-table">
        <thead><tr><th>#</th><th>Jogador</th><th>Pontos</th><th>V</th><th>D</th><th>E</th></tr></thead>
        <tbody>${rows
          .map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td><b>${r.rating}</b></td><td>${r.wins}</td><td>${r.losses}</td><td>${r.draws}</td></tr>`)
          .join('')}</tbody>
      </table></div>`;
  }

  private renderCards(): string {
    const rows = this.stats!.cards.filter((c) => safeCard(c.cardId));
    return `
      <p class="muted">Dados de todas as partidas de todos os jogadores. "% vitórias" = partidas ganhas por quem tinha a carta no baralho.</p>
      <div class="table-wrap"><table class="stats-table">
        <thead><tr><th>Carta</th><th>Tipo</th><th>Jogada</th><th>Em baralhos</th><th>% vitórias</th></tr></thead>
        <tbody>${rows
          .map((c) => {
            const card = getCard(c.cardId);
            return `<tr><td>${card.emoji} ${escapeHtml(card.name)}</td><td>${CARD_TYPES[card.type].emoji}</td><td>${c.plays}</td><td>${c.games}</td><td>${pct(c.wins, c.games)}</td></tr>`;
          })
          .join('')}</tbody>
      </table></div>`;
  }
}

/** Cartas removidas do jogo podem ainda aparecer nas estatísticas antigas. */
function safeCard(id: string): boolean {
  try {
    getCard(id);
    return true;
  } catch {
    return false;
  }
}
