import { clamp01, duckMusic, getBusVolume, getGraph, isLive, volumeToGain } from './context';
import { bonang, brass, chime, coin, gender, gong, kempul, knock, peking, saron, wah } from './instruments';
import { SLENDRO, degreeHz } from './scales';
import { additive, noise, rand, tone, type Ctx } from './synth';
import type { SfxName, SfxOptions } from './types';

/** Schedules one sound into `out` at time `t` with pitch multiplier `p`. Returns its length (s). */
export type SfxVoice = (ctx: Ctx, out: AudioNode, t: number, p: number) => number;

const sl = (root: number, deg: number): number => degreeHz(root, SLENDRO, deg);

/** Cash-register bell: bright inharmonic partials. */
const ching = (c: Ctx, o: AudioNode, t: number, f: number, v: number): number =>
  additive(
    c,
    o,
    t,
    f,
    0.14 * v,
    [
      [1, 1, 0.7],
      [1.004, 0.6, 0.6],
      [2.32, 0.35, 0.3],
      [3.86, 0.2, 0.16],
    ],
    0.001,
  );

export const SFX: Record<SfxName, SfxVoice> = {
  click(c, o, t, p) {
    tone(c, o, t, { type: 'triangle', freq: 1500 * p, to: 950 * p, glide: 0.03, attack: 0.001, decay: 0.05, peak: 0.3 });
    noise(c, o, t, { filter: 'highpass', freq: 5200, attack: 0.001, decay: 0.012, peak: 0.1 });
    return 0.08;
  },

  hover(c, o, t, p) {
    tone(c, o, t, { freq: 2300 * p, attack: 0.004, decay: 0.035, peak: 0.05 });
    return 0.05;
  },

  open(c, o, t, p) {
    tone(c, o, t, { freq: 380 * p, to: 780 * p, glide: 0.09, attack: 0.004, decay: 0.14, peak: 0.22 });
    noise(c, o, t, { freq: 1200, to: 4200, glide: 0.14, q: 0.8, attack: 0.06, decay: 0.08, peak: 0.08 });
    chime(c, o, t + 0.06, 1175 * p, 0.4, 0.35);
    return 0.45;
  },

  close(c, o, t, p) {
    tone(c, o, t, { freq: 720 * p, to: 330 * p, glide: 0.1, attack: 0.003, decay: 0.13, peak: 0.2 });
    noise(c, o, t, { freq: 3600, to: 900, glide: 0.12, q: 0.8, attack: 0.03, decay: 0.08, peak: 0.07 });
    return 0.25;
  },

  dice_shake(c, o, t, p) {
    // cupped-hands rumble + irregular dice-on-dice clacks
    noise(c, o, t, { freq: 900, q: 0.7, attack: 0.08, hold: 0.32, decay: 0.15, peak: 0.06 });
    let tt = t;
    for (let i = 0; i < 10; i++) {
      tt += rand(0.04, 0.075);
      noise(c, o, tt, { freq: rand(2000, 4200) * p, q: rand(2, 5), attack: 0.001, decay: rand(0.012, 0.03), peak: rand(0.35, 0.7) });
      if (i % 2 === 0) {
        tone(c, o, tt + 0.003, { type: 'triangle', freq: rand(900, 1500) * p, attack: 0.001, decay: 0.02, peak: rand(0.05, 0.1) });
      }
    }
    return tt - t + 0.1;
  },

  dice_land(c, o, t, p) {
    tone(c, o, t, { freq: 160, to: 70, glide: 0.08, attack: 0.001, decay: 0.12, peak: 0.3 });
    knock(c, o, t, 480 * p, 1);
    knock(c, o, t + rand(0.075, 0.1), 570 * p, 0.7);
    return 0.3;
  },

  step(c, o, t, p) {
    knock(c, o, t, 620 * p, 0.55);
    return 0.12;
  },

  coin_in(c, o, t, p) {
    const base = 1046.5 * p;
    [1, 1.26, 1.5, 2].forEach((r, i) => coin(c, o, t + i * 0.05, base * r, 0.85 - i * 0.1));
    chime(c, o, t + 0.2, base * 3, 0.15, 0.4);
    return 0.65;
  },

  coin_out(c, o, t, p) {
    const base = 880 * p;
    [2, 1.5, 1.26, 1].forEach((r, i) => coin(c, o, t + i * 0.055, base * r, 0.7 - i * 0.08, true));
    tone(c, o, t, { freq: 900 * p, to: 380 * p, glide: 0.22, attack: 0.01, decay: 0.22, peak: 0.05 });
    return 0.45;
  },

  buy(c, o, t, p) {
    // "ka-": drawer clack ... "-ching": bright register bells + a coin
    knock(c, o, t, 260 * p, 0.8);
    noise(c, o, t, { freq: 1800, q: 1.2, attack: 0.001, decay: 0.04, peak: 0.45 });
    noise(c, o, t + 0.05, { freq: 800, q: 1, attack: 0.002, decay: 0.06, peak: 0.3 });
    const b = 2093 * p;
    ching(c, o, t + 0.1, b, 1);
    ching(c, o, t + 0.135, b * 1.335, 0.75);
    coin(c, o, t + 0.2, b * 1.26, 0.4);
    return 0.95;
  },

  build(c, o, t, p) {
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.13;
      knock(c, o, tt, 300 * p * (1 + i * 0.07), 0.95);
      tone(c, o, tt, { type: 'triangle', freq: 1750 * p, attack: 0.001, decay: 0.05, peak: 0.07 });
    }
    tone(c, o, t + 0.4, { type: 'triangle', freq: 440 * p, to: 880 * p, glide: 0.22, attack: 0.02, decay: 0.28, peak: 0.18 });
    chime(c, o, t + 0.62, 1320 * p, 0.55, 0.6);
    return 1.3;
  },

  landmark(c, o, t, p) {
    gong(c, o, t, 82 * p, 1, 4);
    tone(c, o, t, { freq: 75, to: 42, glide: 0.45, attack: 0.004, decay: 0.7, peak: 0.4 });
    const root = 523.25 * p;
    for (let i = 0; i < 9; i++) saron(c, o, t + 0.1 + i * 0.065, sl(root, i), 0.55 + i * 0.04);
    const chord = t + 0.1 + 9 * 0.065 + 0.04;
    for (const d of [0, 2, 4, 5]) gender(c, o, chord, sl(root, d + 5), 0.55);
    for (let i = 0; i < 12; i++) peking(c, o, chord + 0.05 + i * 0.055, sl(root, i % 2 ? 9 : 10), 0.45 * (1 - i / 12));
    return 4.2;
  },

  acquire(c, o, t, p) {
    noise(c, o, t, { freq: 300, sweep: [[0.33, 3600]], q: 1.2, attack: 0.3, decay: 0.05, peak: 0.45 });
    const hit = t + 0.34;
    tone(c, o, hit, { freq: 120 * p, to: 40, glide: 0.4, attack: 0.002, decay: 0.6, peak: 0.65 });
    noise(c, o, hit, { filter: 'lowpass', freq: 1400, to: 200, glide: 0.25, attack: 0.001, decay: 0.3, peak: 0.45 });
    bonang(c, o, hit, 311 * p, 0.9);
    bonang(c, o, hit, 330 * p, 0.7);
    brass(c, o, hit, 147 * p, 0.3, 0.9);
    brass(c, o, hit, 156 * p, 0.3, 0.7);
    return 1.4;
  },

  card(c, o, t, p) {
    noise(c, o, t, { freq: 2500 * p, to: 6500 * p, glide: 0.08, q: 0.9, attack: 0.02, decay: 0.05, peak: 0.3 });
    noise(c, o, t + 0.075, { filter: 'highpass', freq: 3000, attack: 0.001, decay: 0.025, peak: 0.2 });
    noise(c, o, t + 0.11, { freq: 4500 * p, q: 1.5, attack: 0.001, decay: 0.02, peak: 0.18 });
    return 0.25;
  },

  festival(c, o, t, p) {
    tone(c, o, t, { freq: 700, to: 2600, glide: 0.32, attack: 0.03, decay: 0.3, peak: 0.06 });
    noise(c, o, t, { filter: 'highpass', freq: 4000, attack: 0.25, decay: 0.08, peak: 0.06 });
    for (const dt of [0.34, 0.5, 0.63, 0.82]) {
      const pop = t + dt + rand(-0.02, 0.02);
      noise(c, o, pop, { freq: rand(700, 1600), q: 0.8, attack: 0.001, decay: 0.09, peak: 0.6 });
      tone(c, o, pop, { freq: 190, to: 60, glide: 0.09, attack: 0.001, decay: 0.1, peak: 0.25 });
      let crackle = pop + 0.05;
      for (let k = 0; k < 4; k++) {
        crackle += rand(0.02, 0.05);
        noise(c, o, crackle, { filter: 'highpass', freq: 6000, attack: 0.001, decay: 0.012, peak: 0.15 });
      }
    }
    const root = 659.25 * p;
    [0, 1, 2, 3, 4, 5, 7].forEach((d, i) => bonang(c, o, t + 0.36 + i * 0.075, sl(root, d), 0.75));
    return 1.9;
  },

  fly(c, o, t, p) {
    noise(c, o, t, { freq: 350 * p, sweep: [[0.55, 2600 * p], [1.15, 500 * p]], q: 1.1, attack: 0.5, hold: 0.1, decay: 0.55, peak: 0.5 });
    noise(c, o, t, { filter: 'lowpass', freq: 260, attack: 0.3, hold: 0.3, decay: 0.5, peak: 0.25 });
    tone(c, o, t, {
      type: 'triangle',
      freq: 520 * p,
      sweep: [[0.6, 1250 * p], [1.15, 700 * p]],
      attack: 0.4,
      hold: 0.2,
      decay: 0.5,
      peak: 0.035,
    });
    return 1.3;
  },

  island(c, o, t, p) {
    // two waves washing in, then a gentle sad fall on the gender
    noise(c, o, t, { filter: 'lowpass', freq: 500, sweep: [[0.5, 1600], [1.1, 400]], q: 0.5, attack: 0.5, decay: 0.7, peak: 0.35 });
    noise(c, o, t + 0.6, { filter: 'lowpass', freq: 400, sweep: [[0.4, 1200], [0.9, 300]], q: 0.5, attack: 0.4, decay: 0.6, peak: 0.22 });
    [659.25, 587.33, 493.88, 440].forEach((f, i) => gender(c, o, t + 0.25 + i * 0.24, f * p, 0.75 - i * 0.06));
    return 2.4;
  },

  bankrupt(c, o, t, p) {
    const notes = [
      [146.83, 0, 0.28],
      [138.59, 0.33, 0.28],
      [130.81, 0.66, 0.28],
      [123.47, 0.99, 1],
    ] as const;
    notes.forEach(([f, dt, dur], i) => wah(c, o, t + dt, f * p, dur, 1, i === notes.length - 1));
    return 2.3;
  },

  win(c, o, t, p) {
    const r = 523.25 * p;
    brass(c, o, t, r, 0.1, 0.9);
    brass(c, o, t + 0.13, r * 1.26, 0.1, 0.9);
    brass(c, o, t + 0.26, r * 1.5, 0.1, 0.9);
    const big = t + 0.4;
    brass(c, o, big, r * 2, 0.8, 1);
    brass(c, o, big, r * 1.5, 0.8, 0.6);
    brass(c, o, big, r * 1.26, 0.8, 0.5);
    gong(c, o, big, 98 * p, 0.7, 3);
    noise(c, o, t + 0.05, { filter: 'highpass', freq: 6000, attack: 0.35, decay: 1.1, peak: 0.1 });
    for (let i = 0; i < 8; i++) peking(c, o, big + 0.05 + i * 0.05, sl(r * 2, i % 6), 0.4);
    return 2.6;
  },

  lose(c, o, t, p) {
    [392, 349.23, 311.13, 261.63].forEach((f, i) =>
      tone(c, o, t + i * 0.2, { type: 'triangle', freq: f * p, attack: 0.01, hold: 0.08, decay: 0.35, peak: 0.2 - i * 0.02 }),
    );
    kempul(c, o, t + 0.8, 98 * p, 0.8);
    return 2.4;
  },

  alert(c, o, t, p) {
    for (let i = 0; i < 4; i++) {
      const f = (i % 2 === 0 ? 932 : 698) * p;
      tone(c, o, t + i * 0.12, { type: 'square', freq: f, attack: 0.004, hold: 0.07, decay: 0.03, peak: 0.06 });
      tone(c, o, t + i * 0.12, { type: 'triangle', freq: f, attack: 0.004, hold: 0.07, decay: 0.04, peak: 0.16 });
    }
    return 0.55;
  },

  turn(c, o, t, p) {
    chime(c, o, t, 987.77 * p, 0.55, 0.6);
    chime(c, o, t + 0.09, 1479.98 * p, 0.45, 0.8);
    return 0.95;
  },

  error(c, o, t, p) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(o);
    tone(c, lp, t, { type: 'sawtooth', freq: 155 * p, to: 140 * p, glide: 0.2, attack: 0.005, hold: 0.12, decay: 0.07, peak: 0.18 });
    tone(c, lp, t, { type: 'square', freq: 158 * p, to: 143 * p, glide: 0.2, attack: 0.005, hold: 0.12, decay: 0.07, peak: 0.09 });
    return 0.25;
  },

  whoosh(c, o, t, p) {
    noise(c, o, t, { freq: 500 * p, sweep: [[0.18, 3200 * p], [0.36, 900 * p]], q: 1.4, attack: 0.16, decay: 0.2, peak: 0.45 });
    return 0.4;
  },

  gauge(c, o, t, p) {
    tone(c, o, t, { type: 'triangle', freq: 2400 * p, attack: 0.001, decay: 0.018, peak: 0.08 });
    return 0.03;
  },
};

/** Minimum seconds between two plays of the same sound, so rapid-fire triggers don't pile up. */
const MIN_GAP: Partial<Record<SfxName, number>> = {
  step: 0.045,
  gauge: 0.035,
  hover: 0.07,
  click: 0.03,
  coin_in: 0.07,
  coin_out: 0.07,
  dice_shake: 0.15,
  dice_land: 0.08,
};
const DEFAULT_GAP = 0.025;

/** Random pitch spread per play (± fraction). Melodic stingers vary less. */
const SPREAD: Partial<Record<SfxName, number>> = {
  landmark: 0.008,
  win: 0.008,
  lose: 0.008,
  festival: 0.01,
  island: 0.01,
  bankrupt: 0.01,
  turn: 0.012,
  coin_in: 0.015,
  coin_out: 0.015,
  buy: 0.015,
};
const DEFAULT_SPREAD = 0.03;

/** Big moments push the music down: [gain while ducked, seconds held]. */
const DUCK: Partial<Record<SfxName, readonly [number, number]>> = {
  landmark: [0.4, 2.2],
  win: [0.35, 2.2],
  lose: [0.5, 1.8],
  bankrupt: [0.5, 1.8],
  acquire: [0.55, 1.1],
  festival: [0.6, 1.3],
};

const LOW_PRIORITY: ReadonlySet<SfxName> = new Set<SfxName>(['hover', 'gauge', 'step', 'click', 'coin_in', 'coin_out']);
const SOFT_VOICE_CAP = 24;
const HARD_VOICE_CAP = 40;

const lastPlayed = new Map<SfxName, number>();
let activeVoices = 0;

function cleanPitch(p: number | undefined): number {
  return p !== undefined && Number.isFinite(p) && p > 0 ? Math.min(4, Math.max(0.25, p)) : 1;
}

export function playSfx(name: SfxName, opts?: SfxOptions): void {
  const g = getGraph();
  const voice: SfxVoice | undefined = SFX[name];
  if (!g || !voice || getBusVolume('sfx') <= 0 || !isLive()) return;

  const ctx = g.ctx;
  const now = ctx.currentTime;
  const last = lastPlayed.get(name);
  if (last !== undefined && now >= last && now - last < (MIN_GAP[name] ?? DEFAULT_GAP)) return;
  if (activeVoices >= HARD_VOICE_CAP || (activeVoices >= SOFT_VOICE_CAP && LOW_PRIORITY.has(name))) return;

  const gain = volumeToGain(clamp01(opts?.volume ?? 1));
  if (gain <= 0) return;
  const spread = SPREAD[name] ?? DEFAULT_SPREAD;
  const pitch = cleanPitch(opts?.pitch) * (1 + (Math.random() * 2 - 1) * spread);
  lastPlayed.set(name, now);

  const out = ctx.createGain();
  out.gain.value = gain;
  out.connect(g.sfxIn);
  let length = 1;
  try {
    length = voice(ctx, out, now + 0.005, pitch);
  } catch {
    /* a broken voice must never break the game */
  }
  const duck = DUCK[name];
  if (duck) duckMusic(duck[0], duck[1]);

  activeVoices++;
  setTimeout(
    () => {
      activeVoices = Math.max(0, activeVoices - 1);
      try {
        out.disconnect();
      } catch {
        /* already gone */
      }
    },
    (length + 0.3) * 1000,
  );
}
