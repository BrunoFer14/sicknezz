// Estatísticas e ranking. Guardado em PostgreSQL se existir DATABASE_URL, senão num ficheiro local (data/db.json).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_IDS } from '../shared/cards';
import type { PlayerIndex } from '../shared/engine/types';
import type { ReplayData } from '../shared/engine/replay';
import type { MatchRecord, StatsPayload } from '../shared/protocol';

/** Entrada do histórico tal como fica guardada (com o replay, que só é enviado quando pedido). */
type StoredMatch = MatchRecord & { replay?: ReplayData };

export interface Profile {
  id: string;
  secretHash: string;
  name: string;
  rating: number;
  games: number;
  rankedGames: number;
  wins: number;
  losses: number;
  draws: number;
  cardPlays: Record<string, number>;
  /** Últimas partidas (mais recente primeiro). Perfis antigos não têm. */
  history?: StoredMatch[];
}

export interface CardStat {
  plays: number;
  games: number;
  wins: number;
}

/** ranked: fila de matchmaking; friendly: sala com código; bot: contra a IA. */
export type GameMode = 'ranked' | 'friendly' | 'bot';

export interface GameResult {
  profiles: [Profile | null, Profile | null];
  names: [string, string];
  decks: [string[], string[]];
  plays: [Record<string, number>, Record<string, number>];
  winner: PlayerIndex | 'draw';
  mode: GameMode;
  /** Segundos de jogo. */
  duration: number;
  /** Quem desistiu, se alguém desistiu. */
  surrendered: PlayerIndex | null;
  replay: ReplayData;
}

/** Quantas partidas se guardam no histórico de cada jogador. */
const HISTORY_SIZE = 30;

const START_RATING = 1000;
const ELO_K = 32;

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const logError = (e: unknown) => console.error('Erro a guardar estatísticas:', e);

interface Backend {
  load(): Promise<{ profiles: Profile[]; cards: Record<string, CardStat> }>;
  saveProfile(p: Profile): Promise<void>;
  saveCard(id: string, s: CardStat): Promise<void>;
}

class FileBackend implements Backend {
  private data: { profiles: Record<string, Profile>; cards: Record<string, CardStat> } = { profiles: {}, cards: {} };
  private timer: NodeJS.Timeout | null = null;

  constructor(private path: string) {}

  async load() {
    if (existsSync(this.path)) this.data = JSON.parse(readFileSync(this.path, 'utf8'));
    return { profiles: Object.values(this.data.profiles), cards: this.data.cards };
  }

  async saveProfile(p: Profile) {
    this.data.profiles[p.id] = p;
    this.flush();
  }

  async saveCard(id: string, s: CardStat) {
    this.data.cards[id] = s;
    this.flush();
  }

  private flush() {
    this.timer ??= setTimeout(() => {
      this.timer = null;
      mkdirSync(dirname(this.path), { recursive: true });
      writeFileSync(this.path, JSON.stringify(this.data));
    }, 1000);
  }
}

class PgBackend implements Backend {
  private constructor(private pool: import('pg').Pool) {}

  static async create(url: string) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: url, max: 3 });
    pool.on('error', (e) => console.error('PostgreSQL:', e.message));
    await pool.query('create table if not exists profiles (id text primary key, data jsonb not null)');
    await pool.query('create table if not exists card_stats (id text primary key, data jsonb not null)');
    return new PgBackend(pool);
  }

  async load() {
    const p = await this.pool.query('select data from profiles');
    const c = await this.pool.query('select id, data from card_stats');
    return {
      profiles: p.rows.map((r) => r.data as Profile),
      cards: Object.fromEntries(c.rows.map((r) => [r.id, r.data as CardStat])),
    };
  }

  async saveProfile(p: Profile) {
    await this.pool.query('insert into profiles (id, data) values ($1, $2) on conflict (id) do update set data = excluded.data', [p.id, p]);
  }

  async saveCard(id: string, s: CardStat) {
    await this.pool.query('insert into card_stats (id, data) values ($1, $2) on conflict (id) do update set data = excluded.data', [id, s]);
  }
}

export class Store {
  private profiles = new Map<string, Profile>();
  private cards: Record<string, CardStat> = {};

  private constructor(private backend: Backend) {}

  static async open(): Promise<Store> {
    const url = process.env.DATABASE_URL;
    const backend = url ? await PgBackend.create(url) : new FileBackend(fileURLToPath(new URL('../data/db.json', import.meta.url)));
    console.log(url ? 'Estatísticas guardadas em PostgreSQL' : 'Estatísticas guardadas em data/db.json (sem DATABASE_URL)');
    const store = new Store(backend);
    const data = await backend.load();
    for (const p of data.profiles) store.profiles.set(p.id, p);
    store.cards = data.cards;
    return store;
  }

  /** Devolve o perfil (cria-o se for novo), ou null se as credenciais forem inválidas. */
  auth(id: unknown, secret: unknown): Profile | null {
    if (typeof id !== 'string' || typeof secret !== 'string') return null;
    if (!/^[a-f0-9]{16,64}$/.test(id) || secret.length < 16 || secret.length > 128) return null;
    const hash = sha(secret);
    const existing = this.profiles.get(id);
    if (existing) return existing.secretHash === hash ? existing : null;
    const p: Profile = { id, secretHash: hash, name: 'Jogador', rating: START_RATING, games: 0, rankedGames: 0, wins: 0, losses: 0, draws: 0, cardPlays: {} };
    this.profiles.set(id, p); // só é gravado depois da primeira partida
    return p;
  }

  setName(p: Profile, name: string) {
    if (p.name === name) return;
    p.name = name;
    if (p.games > 0) this.backend.saveProfile(p).catch(logError);
  }

  /** Regista o fim de uma partida. Devolve os pontos ganhos/perdidos por cada jogador (só em ranked). */
  recordGame(r: GameResult): [number, number] | null {
    const [a, b] = r.profiles;
    if (a && b && a.id === b.id) return null; // a jogar contra si próprio (dois separadores): não conta
    const score = (i: PlayerIndex) => (r.winner === 'draw' ? 0.5 : r.winner === i ? 1 : 0);

    // As partidas contra a IA só entram no histórico (não contam para as estatísticas nem para o ranking).
    const pvp = r.mode !== 'bot';
    const touched = new Set<string>();
    const cardStat = (id: string) => {
      touched.add(id);
      return (this.cards[id] ??= { plays: 0, games: 0, wins: 0 });
    };
    for (const i of [0, 1] as const) {
      if (!pvp) continue;
      for (const id of r.decks[i]) {
        const s = cardStat(id);
        s.games++;
        if (score(i) === 1) s.wins++;
      }
      for (const [id, n] of Object.entries(r.plays[i])) cardStat(id).plays += n;

      const p = r.profiles[i];
      if (!p) continue;
      p.games++;
      if (score(i) === 1) p.wins++;
      else if (score(i) === 0) p.losses++;
      else p.draws++;
      for (const [id, n] of Object.entries(r.plays[i])) p.cardPlays[id] = (p.cardPlays[id] ?? 0) + n;
    }

    let delta: [number, number] | null = null;
    if (r.mode === 'ranked' && a && b) {
      const expected = 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
      const d = Math.round(ELO_K * (score(0) - expected));
      a.rating += d;
      b.rating -= d;
      a.rankedGames++;
      b.rankedGames++;
      delta = [d, -d];
    }

    r.profiles.forEach((p, i) => {
      if (!p) return;
      const opp = (1 - i) as PlayerIndex;
      const entry: StoredMatch = {
        at: Date.now(),
        opponent: r.names[opp],
        result: score(i as PlayerIndex) === 1 ? 'win' : score(i as PlayerIndex) === 0 ? 'loss' : 'draw',
        mode: r.mode,
        duration: Math.round(r.duration),
        ratingDelta: delta?.[i] ?? null,
        deck: [...r.decks[i]],
        surrendered: r.surrendered === null ? null : r.surrendered === i ? 'me' : 'opp',
        you: i as PlayerIndex,
        replay: r.replay,
      };
      p.history = [entry, ...(p.history ?? [])].slice(0, HISTORY_SIZE);
    });

    for (const p of r.profiles) if (p) this.backend.saveProfile(p).catch(logError);
    for (const id of touched) this.backend.saveCard(id, this.cards[id]).catch(logError);
    return delta;
  }

  /** Replay de uma partida do histórico (`at` identifica a partida; sem `at`, a mais recente). */
  getReplay(profile: Profile, at?: number): { replay: ReplayData; you: PlayerIndex } | null {
    const m = at === undefined ? profile.history?.[0] : profile.history?.find((h) => h.at === at);
    return m?.replay ? { replay: m.replay, you: m.you ?? 0 } : null;
  }

  stats(profileId: string | undefined): StatsPayload {
    const me = profileId ? this.profiles.get(profileId) : undefined;
    const leaderboard = [...this.profiles.values()]
      .filter((p) => p.rankedGames > 0)
      .sort((x, y) => y.rating - x.rating)
      .slice(0, 50)
      .map((p) => ({ name: p.name, rating: p.rating, wins: p.wins, losses: p.losses, draws: p.draws, me: p.id === profileId }));
    const cards = CARD_IDS.map((cardId) => ({ cardId, ...(this.cards[cardId] ?? { plays: 0, games: 0, wins: 0 }) })).sort((x, y) => y.plays - x.plays);
    return {
      me: me && me.games > 0
        ? { name: me.name, rating: me.rating, games: me.games, rankedGames: me.rankedGames, wins: me.wins, losses: me.losses, draws: me.draws, cardPlays: me.cardPlays }
        : null,
      // O replay não vai na lista (só quando for pedido, ver getReplay).
      history: (me?.history ?? []).map(({ replay, ...m }) => ({ ...m, hasReplay: !!replay })),
      leaderboard,
      cards,
    };
  }
}
