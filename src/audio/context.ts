/**
 * The single shared AudioContext and master bus.
 *
 *   sfx voices   → sfxIn  → sfxVol ─────────────┬→ compressor → limiter → master → speakers
 *   music tracks → musicIn → musicVol → duck ───┤
 *   sfxVol / duck → sends → high-pass → reverb ─┘
 *
 * Nothing is created until unlockContext() runs inside a user gesture, and every entry point is
 * a silent no-op when Web Audio is unavailable (SSR, node, vitest, very old browsers).
 */

export type Bus = 'sfx' | 'music';

export interface AudioGraph {
  ctx: BaseAudioContext;
  /** Voices connect here. */
  sfxIn: GainNode;
  musicIn: GainNode;
  sfxVol: GainNode;
  musicVol: GainNode;
  /** Briefly lowered while big sfx moments play. */
  duck: GainNode;
}

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContext;

const MASTER_GAIN = 0.85;
const SFX_REVERB_SEND = 0.1;
const MUSIC_REVERB_SEND = 0.3;
/** Right after unlock the context may still be "suspended" for a few ms while resume() settles. */
const UNLOCK_GRACE_MS = 1500;

const volume: Record<Bus, number> = { sfx: 0.7, music: 0.35 };
let ctx: AudioContext | null = null;
let graph: AudioGraph | null = null;
let unlockedAt = 0;
let listening = false;

const noop = (): void => {};
const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const pageHidden = (): boolean => typeof document !== 'undefined' && document.hidden === true;

/** Run something that may throw or return a rejecting promise, ignoring both. */
function settle(fn: () => unknown): void {
  try {
    Promise.resolve(fn()).catch(noop);
  } catch {
    /* ignore */
  }
}

export function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

/** Slider value 0..1 → gain. Squared so the slider feels even to the ear; 0 is true silence. */
export function volumeToGain(v: number): number {
  const c = clamp01(v);
  return c * c;
}

function findCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Synthetic room: stereo decaying noise whose tail gets darker over time. */
function impulseResponse(c: BaseAudioContext, seconds: number, curve: number): AudioBuffer {
  const rate = c.sampleRate;
  const len = Math.max(1, Math.floor(rate * seconds));
  const buf = c.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const x = i / len;
      lp += (Math.random() * 2 - 1 - lp) * (0.9 - 0.82 * x);
      data[i] = lp * Math.pow(1 - x, curve);
    }
  }
  return buf;
}

/** Builds the master chain on any context (also used with OfflineAudioContext for level checks). */
export function buildGraph(c: BaseAudioContext): AudioGraph {
  const gain = (v: number): GainNode => {
    const g = c.createGain();
    g.gain.value = v;
    return g;
  };

  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;

  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;

  const master = gain(MASTER_GAIN);
  comp.connect(limiter);
  limiter.connect(master);
  master.connect(c.destination);

  const verbIn = c.createBiquadFilter();
  verbIn.type = 'highpass';
  verbIn.frequency.value = 300; // keep sub bass and gong fundamentals out of the reverb
  const verb = c.createConvolver();
  verb.buffer = impulseResponse(c, 1.9, 2.8);
  verbIn.connect(verb);
  verb.connect(comp);

  const sfxIn = gain(1);
  const sfxVol = gain(volumeToGain(volume.sfx));
  const sfxSend = gain(SFX_REVERB_SEND);
  sfxIn.connect(sfxVol);
  sfxVol.connect(comp);
  sfxVol.connect(sfxSend);
  sfxSend.connect(verbIn);

  const musicIn = gain(1);
  const musicVol = gain(volumeToGain(volume.music));
  const duck = gain(1);
  const musicSend = gain(MUSIC_REVERB_SEND);
  musicIn.connect(musicVol);
  musicVol.connect(duck);
  duck.connect(comp);
  duck.connect(musicSend);
  musicSend.connect(verbIn);

  return { ctx: c, sfxIn, musicIn, sfxVol, musicVol, duck };
}

/** The live graph, or null before unlock / without Web Audio. */
export function getGraph(): AudioGraph | null {
  return graph;
}

/** iOS Safari only opens the output once something actually plays inside the gesture. */
function primeOutput(c: AudioContext): void {
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, c.sampleRate);
  src.connect(c.destination);
  src.onended = () => src.disconnect();
  src.start(0);
}

export function resumeIfNeeded(): void {
  const c = ctx;
  if (!c || c.state === 'running' || c.state === 'closed' || pageHidden()) return;
  settle(() => c.resume());
}

function onVisibilityChange(): void {
  const c = ctx;
  if (!c) return;
  if (pageHidden()) {
    if (c.state === 'running') settle(() => c.suspend());
  } else {
    resumeIfNeeded();
  }
}

function listen(): void {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('visibilitychange', onVisibilityChange);
  // Mobile browsers can suspend audio after calls/interruptions; any later gesture revives it.
  for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
    window.addEventListener(type, resumeIfNeeded, { capture: true, passive: true });
  }
}

/** Create (once) and resume the AudioContext. Call from a user gesture. */
export function unlockContext(): AudioGraph | null {
  if (typeof window === 'undefined') return null;
  if (!graph) {
    const Ctor = findCtor();
    if (!Ctor) return null;
    let created: AudioContext | null = null;
    try {
      created = new Ctor({ latencyHint: 'interactive' });
      graph = buildGraph(created);
      ctx = created;
      unlockedAt = nowMs();
      primeOutput(created);
      listen();
    } catch {
      graph = null;
      ctx = null;
      const broken = created;
      if (broken) settle(() => broken.close());
      return null;
    }
  }
  resumeIfNeeded();
  return graph;
}

/**
 * True when a sound scheduled now is heard now. While the page is hidden or the context is stuck
 * suspended we drop sounds instead of letting them queue up and burst out later.
 */
export function isLive(): boolean {
  const c = ctx;
  if (!c || pageHidden()) return false;
  if (c.state === 'running') return true;
  resumeIfNeeded();
  return c.state === 'suspended' && nowMs() - unlockedAt < UNLOCK_GRACE_MS;
}

export function getBusVolume(bus: Bus): number {
  return volume[bus];
}

export function setBusVolume(bus: Bus, v: number): void {
  volume[bus] = clamp01(v);
  const g = graph;
  if (!g) return;
  const p = (bus === 'sfx' ? g.sfxVol : g.musicVol).gain;
  const target = volumeToGain(volume[bus]);
  try {
    const t = g.ctx.currentTime;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(target, t, 0.03);
    if (target === 0) p.setValueAtTime(0, t + 0.3);
  } catch {
    p.value = target;
  }
}

/** Temporarily lower the music (gain `depth`) for `hold` seconds, then recover smoothly. */
export function duckMusic(depth: number, hold: number): void {
  const g = graph;
  if (!g) return;
  try {
    const t = g.ctx.currentTime;
    const p = g.duck.gain;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(clamp01(depth), t, 0.05);
    p.setTargetAtTime(1, t + hold, 0.6);
  } catch {
    /* ducking is cosmetic */
  }
}
