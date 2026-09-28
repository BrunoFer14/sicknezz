// Sons simples gerados no momento (Web Audio), sem ficheiros de áudio.

const MUTE_KEY = 'sicknezz:muted';
let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, { type = 'sine' as OscillatorType, vol = 0.12, to = 0, delay = 0 } = {}) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Evita que muitos eventos seguidos (ex.: dano contínuo) façam barulho a mais. */
function throttle(fn: () => void, ms: number) {
  let last = 0;
  return () => {
    const now = performance.now();
    if (now - last < ms) return;
    last = now;
    fn();
  };
}

export const sfx = {
  play: () => tone(260, 0.14, { type: 'triangle', to: 620 }),
  hitMe: throttle(() => tone(150, 0.12, { type: 'square', vol: 0.05, to: 70 }), 250),
  hitOpp: throttle(() => tone(320, 0.08, { type: 'square', vol: 0.04, to: 180 }), 250),
  heal: throttle(() => {
    tone(660, 0.12, { vol: 0.07 });
    tone(880, 0.15, { vol: 0.07, delay: 0.08 });
  }, 400),
  mana: () => tone(500, 0.2, { type: 'sawtooth', vol: 0.04, to: 200 }),
  blocked: () => {
    tone(1200, 0.06, { type: 'square', vol: 0.04 });
    tone(1200, 0.06, { type: 'square', vol: 0.04, delay: 0.09 });
  },
  cured: () => [523, 659, 784].forEach((f, i) => tone(f, 0.15, { vol: 0.07, delay: i * 0.07 })),
  error: () => tone(140, 0.18, { type: 'sawtooth', vol: 0.05 }),
  tick: () => tone(520, 0.1, { vol: 0.1 }),
  go: () => tone(780, 0.3, { vol: 0.12 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.1, delay: i * 0.12 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.1, delay: i * 0.15 })),
  found: () => [660, 990].forEach((f, i) => tone(f, 0.15, { vol: 0.1, delay: i * 0.1 })),
};

export function isMuted() {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignorar */
  }
  return muted;
}
