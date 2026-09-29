// Aleatoriedade do jogo com semente (mulberry32). Com a mesma semente e as mesmas jogadas,
// a partida repete-se exatamente igual — é isso que permite os replays.

/** Número entre 0 e 1. Avança o estado `rng` do jogo. */
export function random(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Semente nova para uma partida. */
export function newSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

/** Baralha no sítio (Fisher–Yates). */
export function shuffle<T>(state: { rng: number }, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
