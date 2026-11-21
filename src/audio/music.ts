/**
 * Music player: lookahead scheduler (setInterval every 25 ms, notes scheduled ~100 ms ahead on the
 * audio clock) driving the step functions from tracks.ts, with crossfades between tracks.
 */
import { getBusVolume, getGraph, type AudioGraph } from './context';
import { mulberry32, randomSeed } from './rng';
import { TRACKS, type StepFn } from './tracks';
import type { MusicTrack } from './types';

const TICK_MS = 25;
const LOOKAHEAD = 0.1;
/** If the timer stalled (background tab, debugger) longer than this, skip ahead instead of bursting. */
const MAX_LAG = 0.2;
const STOP_FADE = 1;

interface Instance {
  track: MusicTrack;
  out: GainNode;
  play: StepFn;
  stepDur: number;
  swing16: number;
  swing8: number;
  step: number;
  next: number;
  /** Audio time this instance stops scheduling (Infinity while it is the current track). */
  endAt: number;
}

let current: Instance | null = null;
let fading: Instance[] = [];
/** Last requested track; remembered before unlock so it starts as soon as audio is allowed. */
let wanted: MusicTrack | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function launch(g: AudioGraph, track: MusicTrack): Instance {
  const spec = TRACKS[track];
  const ctx = g.ctx;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(spec.level, now + spec.fadeIn);
  out.connect(g.musicIn);
  const stepDur = 60 / spec.bpm / 4;
  return {
    track,
    out,
    play: spec.create(ctx, out, mulberry32(randomSeed())),
    stepDur,
    swing16: spec.swing16 * stepDur,
    swing8: spec.swing8 * stepDur,
    step: 0,
    next: now + 0.06,
    endAt: Infinity,
  };
}

function retire(inst: Instance, fade: number): void {
  const g = getGraph();
  if (!g) return;
  const now = g.ctx.currentTime;
  const p = inst.out.gain;
  try {
    p.cancelScheduledValues(now);
    p.setValueAtTime(p.value, now);
    p.linearRampToValueAtTime(0, now + fade);
  } catch {
    p.value = 0;
  }
  inst.endAt = now + fade;
  fading.push(inst);
}

function advance(inst: Instance, now: number, silent: boolean): void {
  if (inst.next < now - MAX_LAG) {
    const skipped = Math.ceil((now - inst.next) / inst.stepDur);
    inst.step += skipped;
    inst.next += skipped * inst.stepDur;
  }
  const horizon = Math.min(now + LOOKAHEAD, inst.endAt);
  while (inst.next < horizon) {
    if (!silent) {
      const s = inst.step;
      const t = inst.next + (s % 2 === 1 ? inst.swing16 : 0) + (s % 4 === 2 ? inst.swing8 : 0);
      try {
        inst.play(s, t);
      } catch {
        /* one bad note must not stop the music */
      }
    }
    inst.step++;
    inst.next += inst.stepDur;
  }
}

function tick(): void {
  const g = getGraph();
  if (!g) return;
  const ctx = g.ctx;
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;
  // At volume 0 keep the clock moving but skip synthesis entirely (saves CPU on muted devices).
  const silent = getBusVolume('music') <= 0;
  if (current) advance(current, now, silent);
  for (const inst of fading) advance(inst, now, silent);
  fading = fading.filter((inst) => {
    if (now < inst.endAt + 0.05) return true;
    try {
      inst.out.disconnect();
    } catch {
      /* already gone */
    }
    return false;
  });
  if (!current && fading.length === 0) stopTimer();
}

function ensureTimer(): void {
  if (timer === null) timer = setInterval(tick, TICK_MS);
  tick();
}

function stopTimer(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

export function playMusic(track: MusicTrack): void {
  wanted = track;
  const g = getGraph();
  if (!g || current?.track === track) return;
  if (current) retire(current, TRACKS[track].crossfade);
  current = launch(g, track);
  ensureTimer();
}

export function stopMusic(): void {
  wanted = null;
  if (!current) return;
  retire(current, STOP_FADE);
  current = null;
}

/** Called right after the context is unlocked: start whatever was requested before. */
export function startWantedMusic(): void {
  if (wanted && !current) playMusic(wanted);
}
