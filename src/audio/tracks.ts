/**
 * Generative gamelan × lo-fi tracks. Each track is a step function called once per 16th note by the
 * scheduler in music.ts. Structure borrows from gamelan: a core melody (balungan) in 4-beat phrases
 * (gatra) whose goal tone lands on the next downbeat, elaborating instruments above it, kempul/gong
 * punctuating the cycle, kendang driving the groove — plus sub bass and hats for a modern touch.
 */
import { bass, bonang, brass, gender, gong, hat, kempul, kendang, peking, saron, type Stroke } from './instruments';
import { pick, type Rng } from './rng';
import { PELOG, SLENDRO, degreeHz, pc, type Scale } from './scales';
import type { Ctx } from './synth';
import type { MusicTrack } from './types';

/** Schedules every note of 16th-step `step` at time `t`. */
export type StepFn = (step: number, t: number) => void;

export interface TrackSpec {
  bpm: number;
  /** Delay of odd 16ths, as a fraction of a 16th. */
  swing16: number;
  /** Delay of off-beat 8ths, as a fraction of a 16th (lazy lo-fi shuffle). */
  swing8: number;
  /** Trim into the music bus. */
  level: number;
  fadeIn: number;
  /** How long the previous track takes to fade out when this one takes over. */
  crossfade: number;
  create(ctx: Ctx, out: AudioNode, rng: Rng): StepFn;
}

const BAR = 16;

type Melody = ReadonlyArray<number | null>;

/** A melody plus the tone that sounds on its very first downbeat (the previous phrase's goal). */
interface Line {
  notes: Melody;
  pickup: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function nearestOctave(pitchClass: number, from: number, lo: number, hi: number): number {
  let best = pitchClass;
  let bestDist = Infinity;
  for (let d = pitchClass; d <= hi; d += 5) {
    if (d < lo) continue;
    const dist = Math.abs(d - from);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Random-walk balungan: `gatras` × 4 beats. Each gatra walks toward a goal tone on its 4th beat; the
 * final goal is always the tonic so every cycle resolves onto the gong. `null` = rest.
 */
export function balungan(r: Rng, gatras: number, lo: number, hi: number, restChance: number): Array<number | null> {
  const out: Array<number | null> = [];
  let cur = lo + Math.floor(r() * (hi - lo + 1));
  let prevGoal = -1;
  for (let g = 0; g < gatras; g++) {
    let goalPc = 0;
    if (g < gatras - 1) {
      do {
        goalPc = Math.floor(r() * 5);
      } while (goalPc === prevGoal || (g === gatras - 2 && goalPc === 0));
    }
    prevGoal = goalPc;
    const goal = nearestOctave(goalPc, cur, lo, hi);
    for (let k = 0; k < 3; k++) {
      let n = Math.round(cur + (goal - cur) / (4 - k) + (r() - 0.5) * 2.4);
      n = clamp(n, lo, hi);
      if (n === cur) n = clamp(n + (r() < 0.5 ? -1 : 1), lo, hi);
      out.push(k < 2 && r() < restChance ? null : n);
      cur = n;
    }
    out.push(goal);
    cur = goal;
  }
  return out;
}

function lastNote(m: Melody, fallback: number): number {
  for (let i = m.length - 1; i >= 0; i--) {
    const n = m[i];
    if (n !== null && n !== undefined) return n;
  }
  return fallback;
}

/** Note struck on `beat` (end-weighted: beat 0 = pickup, beat k = notes[k-1]). */
function noteAt(l: Line, beat: number): number | null {
  return beat <= 0 ? l.pickup : (l.notes[beat - 1] ?? null);
}

/** Last sounding tone at or before `beat` (skips rests). */
function heldAt(l: Line, beat: number): number {
  for (let b = Math.min(beat, l.notes.length); b > 0; b--) {
    const n = l.notes[b - 1];
    if (n !== null && n !== undefined) return n;
  }
  return l.pickup;
}

const STROKES: Partial<Record<string, Stroke>> = { D: 'dhung', t: 'tung', T: 'tak', k: 'ket' };

/** Kendang patterns as 16-char strings: D dhung, t tung, T tak, k ket, . rest. */
function drum(ctx: Ctx, out: AudioNode, t: number, pattern: string, i: number, v: number, r: Rng): void {
  const stroke = STROKES[pattern.charAt(i)];
  if (stroke) kendang(ctx, out, t, stroke, v * (stroke === 'ket' ? 0.7 : 1) * (0.88 + r() * 0.2));
}

// ───────────────────────────── menu: calm, spacious ─────────────────────────────

const MENU_ROOT = 261.63;
const MENU_BPM = 80;
const MENU_SD = 60 / MENU_BPM / 4;
const MENU_KENDANG = 'D.....k.T.....k.';

/** 8-bar cycles; the balungan moves every half bar on the gender. Cycles alternate calm / groove. */
function menuTrack(ctx: Ctx, out: AudioNode, r: Rng): StepFn {
  const f = (deg: number, oct = 0): number => degreeHz(MENU_ROOT, SLENDRO, deg + oct * 5);
  const low = (deg: number): number => degreeHz(MENU_ROOT / 4, SLENDRO, deg);
  let cycle = 0;
  let line: Line = { notes: balungan(r, 4, 0, 7, 0), pickup: 0 };

  return (s, t) => {
    const bar = Math.floor(s / BAR);
    const cyc = Math.floor(bar / 8);
    if (cyc !== cycle) {
      cycle = cyc;
      line = { notes: balungan(r, 4, 0, 7, 0), pickup: lastNote(line.notes, 0) };
    }
    const i = s % BAR;
    const cb = bar % 8;
    const mode = cyc % 4; // 0 calm · 1 groove · 2 calm + bonang · 3 groove + bonang
    const groove = mode % 2 === 1;
    const half = cb * 2 + (i >> 3);
    const seleh = heldAt(line, cb * 2);
    const cur = heldAt(line, half);
    const next = heldAt(line, half + 1);

    if (i === 0 && cb === 0) gong(ctx, out, t, MENU_ROOT / 4, 0.8, 6.5);
    if (i === 0 && cb === 4) kempul(ctx, out, t, f(pc(seleh), -1), 0.42);

    if (i % 8 === 0) {
      gender(ctx, out, t, f(cur), i === 0 ? 0.6 : 0.5);
      if (i === 0) gender(ctx, out, t, f(pc(cur), -1), 0.3);
    } else if (i % 2 === 0 && r() < (groove ? 0.45 : 0.6)) {
      gender(ctx, out, t, f(next + pick(r, [-1, 0, 1, 2]), 1), 0.18 + r() * 0.08);
    }
    if (mode >= 2 && (i === 4 || i === 12)) bonang(ctx, out, t, f(next, 1), 0.28);

    if (groove) {
      drum(ctx, out, t, MENU_KENDANG, i, 0.6, r);
      if (i % 4 === 2) hat(ctx, out, t, 0.32);
      if (i === 0) bass(ctx, out, t, low(pc(seleh)), MENU_SD * 11, 0.65);
      if (i === 12) bass(ctx, out, t, low(pc(seleh) + 3), MENU_SD * 3, 0.45);
    } else if (i === 0 && cb % 4 === 0) {
      bass(ctx, out, t, low(pc(seleh)), MENU_SD * 28, 0.4);
    }
  };
}

// ─────────────────────────── game: upbeat, not distracting ───────────────────────────

const GAME_ROOT = 293.66;
const GAME_BPM = 105;
const GAME_SD = 60 / GAME_BPM / 4;

/** Bonang imbal figures: offsets from the coming balungan tone, one per 16th. */
const IMBAL = [
  [1, 0, 1, 0],
  [0, 1, 2, 1],
  [2, 1, 0, 1],
  [-1, 0, 1, 0],
  [1, 2, 1, 0],
] as const;

/** Gender "pipilan": flowing 8ths around the coming goal tone. */
const PIPILAN = [0, 2, 1, 3, 2, 1, 0, -1] as const;

const GAME_KENDANG = {
  a: 'D..kT..D..D.T.kk',
  a2: 'D..kT.tD..D.T.kt',
  b: 'D.kkT.kDk.D.TkTk',
  c: 'D.......T.....k.',
  fill: 'D..kT..DTkTkttTD',
} as const;

/** Section B bass: [step, degree offset from the bar's tone, length in 16ths]. */
const GAME_BASS_B = [
  [0, 0, 3],
  [3, 0, 2],
  [6, 3, 2],
  [8, 0, 3],
  [11, 5, 2],
  [14, 3, 2],
] as const;

/**
 * 32-bar cycle of four 8-bar sections, each starting on the gong:
 * A (saron + peking) · B (bonang imbal, busier drums) · A' (A melody, denser peking) · C (pelog breakdown
 * on gender). All melodies are regenerated every cycle, so it never loops verbatim.
 */
function gameTrack(ctx: Ctx, out: AudioNode, r: Rng): StepFn {
  let cycle = 0;
  let line: Line = { notes: [], pickup: 0 };
  let figures: number[] = [];
  const regen = (): void => {
    const a = balungan(r, 8, 0, 7, 0.08);
    const b = balungan(r, 8, 0, 7, 0.04);
    const c = balungan(r, 8, 0, 6, 0.3);
    line = { notes: [...a, ...b, ...a, ...c], pickup: lastNote(line.notes, 0) };
    figures = Array.from({ length: 32 }, () => Math.floor(r() * IMBAL.length));
  };
  regen();

  return (s, t) => {
    const bar = Math.floor(s / BAR);
    const cyc = Math.floor(bar / 32);
    if (cyc !== cycle) {
      cycle = cyc;
      regen();
    }
    const i = s % BAR;
    const beat = i >> 2;
    const sub = i & 3;
    const cb = bar % 32;
    const section = cb >> 3;
    const sb = cb & 7;
    const scale: Scale = section === 3 ? PELOG : SLENDRO;
    const f = (deg: number, oct = 0): number => degreeHz(GAME_ROOT, scale, deg + oct * 5);
    const low = (deg: number): number => degreeHz(GAME_ROOT / 4, scale, deg);
    const g = cb * 4 + beat;
    const seleh = heldAt(line, cb * 4);
    const cur = heldAt(line, g);
    const next = heldAt(line, g + 1);
    const nextGoal = heldAt(line, cb * 4 + 4);

    // colotomic punctuation
    if (i === 0 && sb === 0) gong(ctx, out, t, GAME_ROOT / 4, 0.85);
    if (i === 0 && (sb === 2 || sb === 4 || sb === 6)) kempul(ctx, out, t, f(pc(seleh), -1), 0.5);

    // balungan on saron
    if (sub === 0) {
      const n = noteAt(line, g);
      if (section < 3 && n !== null) saron(ctx, out, t, f(n), beat === 0 ? 0.9 : 0.7);
      else if (section === 3 && beat === 0) saron(ctx, out, t, f(seleh), 0.5);
    }

    // elaboration
    if (section === 0 && sub % 2 === 0) {
      peking(ctx, out, t, f(sub === 0 ? cur : next, 1), sub === 0 ? 0.55 : 0.4);
    } else if (section === 2) {
      peking(ctx, out, t, f(sub < 2 ? cur : next, 1), [0.5, 0.26, 0.42, 0.26][sub]);
    } else if (section === 1) {
      const d = next + IMBAL[figures[cb] ?? 0][sub];
      bonang(ctx, out, t, f(d, sub % 2), [0.55, 0.3, 0.45, 0.3][sub]);
    } else if (section === 3 && sub % 2 === 0) {
      const k = beat * 2 + (sub >> 1);
      gender(ctx, out, t, f(nextGoal + PIPILAN[k] - 1), k === 0 ? 0.55 : 0.38);
      if (k === 0) gender(ctx, out, t, f(pc(seleh), -1), 0.32);
    }

    // kendang
    const pattern =
      sb === 7
        ? GAME_KENDANG.fill
        : section === 0
          ? GAME_KENDANG.a
          : section === 1
            ? GAME_KENDANG.b
            : section === 2
              ? GAME_KENDANG.a2
              : GAME_KENDANG.c;
    drum(ctx, out, t, pattern, i, 0.8, r);

    // hats
    if (section === 0 || section === 2) {
      if (i === 14 && (sb === 3 || sb === 7)) hat(ctx, out, t, 0.32, true);
      else if (i % 4 === 2) hat(ctx, out, t, 0.55);
      else if (i === 15) hat(ctx, out, t, 0.2);
    } else if (section === 1) {
      hat(ctx, out, t, [0.22, 0.12, 0.5, 0.14][sub]);
    } else if (sb >= 4 && i % 4 === 2) {
      hat(ctx, out, t, 0.25);
    }

    // sub bass follows the bar's goal tone
    const root = pc(seleh);
    if (section === 0 || section === 2) {
      if (i === 0) bass(ctx, out, t, low(root), GAME_SD * 5, 0.8);
      else if (i === 7) bass(ctx, out, t, low(root + 3), GAME_SD * 2, 0.55);
      else if (i === 10) bass(ctx, out, t, low(root), GAME_SD * 4, 0.65);
    } else if (section === 1) {
      for (const [st, off, len] of GAME_BASS_B) if (st === i) bass(ctx, out, t, low(root + off), GAME_SD * len, off === 5 ? 0.5 : 0.7);
    } else if (i === 0) {
      bass(ctx, out, t, low(root), GAME_SD * 14, 0.6);
    }
  };
}

// ─────────────────────────── victory: fanfare, then a happy loop ───────────────────────────

const WIN_ROOT = 329.63;
const WIN_BPM = 116;
const WIN_SD = 60 / WIN_BPM / 4;
/** [step, degree, length in 16ths] over the first two bars. */
const FANFARE = [
  [0, 0, 2],
  [2, 2, 2],
  [4, 4, 2],
  [6, 5, 5],
  [12, 4, 2],
  [14, 5, 2],
  [16, 7, 10],
] as const;
const FANFARE_STEPS = 32;
const FANFARE_FILL = 'T.Tkt.tD'; // steps 24..31
/** A fixed, catchy balungan that alternates with generated ones so the loop has a recognisable hook. */
const HOOK: Melody = [4, 5, 7, 5, 4, 2, 3, 2, 4, 5, 7, 8, 7, 5, 4, 5];
const WIN_KENDANG = { groove: 'D.k.T.kDD.k.T.kt', fill: 'D.k.T.kDTkTktttD' } as const;
const WIN_BOUNCE = [
  [0, 0, 2],
  [3, 5, 1],
  [6, 0, 2],
  [8, 3, 2],
  [11, 5, 1],
  [14, 0, 2],
] as const;

function victoryTrack(ctx: Ctx, out: AudioNode, r: Rng): StepFn {
  const f = (deg: number, oct = 0): number => degreeHz(WIN_ROOT, SLENDRO, deg + oct * 5);
  const low = (deg: number): number => degreeHz(WIN_ROOT / 4, SLENDRO, deg);
  let cycle = -1;
  let line: Line = { notes: HOOK, pickup: 5 };

  const fanfare = (s: number, t: number): void => {
    if (s === 0) {
      gong(ctx, out, t, WIN_ROOT / 4, 1, 5);
      bass(ctx, out, t, low(0), WIN_SD * 14, 0.8);
    }
    for (const [step, deg, len] of FANFARE) {
      if (step !== s) continue;
      saron(ctx, out, t, f(deg), 0.95);
      bonang(ctx, out, t, f(deg, 1), 0.55);
      brass(ctx, out, t, f(deg), len * WIN_SD * 0.92, 0.8);
    }
    if (s === 16) {
      bass(ctx, out, t, low(0), WIN_SD * 12, 0.85);
      for (const d of [0, 2, 4]) gender(ctx, out, t, f(d, 1), 0.45);
    }
    if (s >= 18 && s < 26) peking(ctx, out, t, f(s % 2 ? 7 : 9, 1), 0.25);
    if (s >= 24) {
      const stroke = STROKES[FANFARE_FILL.charAt(s - 24)];
      if (stroke) kendang(ctx, out, t, stroke, 0.8);
    }
  };

  return (s, t) => {
    if (s < FANFARE_STEPS) {
      fanfare(s, t);
      return;
    }
    const ls = s - FANFARE_STEPS;
    const bar = Math.floor(ls / BAR);
    const cyc = Math.floor(bar / 4);
    if (cyc !== cycle) {
      line = { notes: cyc % 2 === 0 ? HOOK : balungan(r, 4, 2, 9, 0.05), pickup: cycle < 0 ? 5 : lastNote(line.notes, 5) };
      cycle = cyc;
    }
    const i = ls % BAR;
    const beat = i >> 2;
    const sub = i & 3;
    const cb = bar % 4;
    const g = cb * 4 + beat;
    const seleh = heldAt(line, cb * 4);
    const cur = heldAt(line, g);
    const next = heldAt(line, g + 1);

    if (i === 0 && cb === 0) gong(ctx, out, t, WIN_ROOT / 4, 0.75, 4);
    if (i === 0 && cb === 2) kempul(ctx, out, t, f(pc(seleh), -1), 0.45);

    if (sub === 0) {
      const n = noteAt(line, g);
      if (n !== null) saron(ctx, out, t, f(n), beat === 0 ? 0.85 : 0.7);
    }
    peking(ctx, out, t, f((sub % 2 === 0 ? cur : next) + (sub === 3 ? 1 : 0), 1), [0.42, 0.26, 0.36, 0.24][sub]);

    drum(ctx, out, t, cb === 3 ? WIN_KENDANG.fill : WIN_KENDANG.groove, i, 0.75, r);
    if (i % 4 === 2) hat(ctx, out, t, i === 14 ? 0.35 : 0.5, i === 14);
    else if (sub % 2 === 1) hat(ctx, out, t, 0.14);

    const root = pc(seleh);
    for (const [st, off, len] of WIN_BOUNCE) {
      if (st === i) bass(ctx, out, t, low(root + off), len * WIN_SD, off === 5 ? 0.5 : 0.75);
    }
  };
}

export const TRACKS: Record<MusicTrack, TrackSpec> = {
  menu: { bpm: MENU_BPM, swing16: 0, swing8: 0.3, level: 0.9, fadeIn: 2, crossfade: 1.6, create: menuTrack },
  game: { bpm: GAME_BPM, swing16: 0.12, swing8: 0, level: 0.8, fadeIn: 1.2, crossfade: 1.2, create: gameTrack },
  victory: { bpm: WIN_BPM, swing16: 0.08, swing8: 0, level: 0.85, fadeIn: 0.12, crossfade: 0.6, create: victoryTrack },
};
