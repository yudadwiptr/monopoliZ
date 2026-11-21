/**
 * Low-level Web Audio building blocks. Each helper schedules its nodes at time `t`, disconnects them
 * once they finish and returns the time the sound has fully decayed.
 */
export type Ctx = BaseAudioContext;

/** Frequency path: [seconds after start, Hz] points reached with exponential ramps. */
export type Sweep = ReadonlyArray<readonly [number, number]>;

/** Additive partial: [frequency ratio, relative amplitude, decay seconds]. */
export type Overtone = readonly [number, number, number];

const EPS = 1e-4;
const noiseCache = new WeakMap<Ctx, AudioBuffer>();

export const rand = (min: number, max: number): number => min + Math.random() * (max - min);

/** Clamp to a frequency every browser accepts (exponential ramps need > 0). */
export const hz = (f: number): number => (Number.isFinite(f) ? Math.min(20000, Math.max(1, f)) : 440);

/** Two seconds of white noise, generated once per context and shared by every noise voice. */
export function noiseBuffer(ctx: Ctx): AudioBuffer {
  let buf = noiseCache.get(ctx);
  if (!buf) {
    const len = Math.floor(ctx.sampleRate * 2);
    buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buf);
  }
  return buf;
}

/** Attack → optional hold → exponential decay. Returns the end time. */
export function envelope(p: AudioParam, t: number, peak: number, attack: number, decay: number, hold = 0): number {
  const a = Math.max(attack, 0.001);
  const h = Math.max(hold, 0);
  const pk = Math.max(peak, EPS * 2);
  const end = t + a + h + Math.max(decay, 0.005);
  p.setValueAtTime(EPS, t);
  p.exponentialRampToValueAtTime(pk, t + a);
  if (h > 0) p.setValueAtTime(pk, t + a + h);
  p.exponentialRampToValueAtTime(EPS, end);
  return end;
}

/** Disconnect a voice's nodes when its source stops, so long sessions don't leak graph nodes. */
export function autoRelease(src: AudioScheduledSourceNode, nodes: readonly AudioNode[]): void {
  src.onended = () => {
    for (const n of nodes) {
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  };
}

function glide(p: AudioParam, t: number, from: number, sweep?: Sweep, to?: number, time?: number): void {
  p.setValueAtTime(hz(from), t);
  if (sweep) for (const [dt, f] of sweep) p.exponentialRampToValueAtTime(hz(f), t + Math.max(dt, 0.001));
  else if (to !== undefined) p.exponentialRampToValueAtTime(hz(to), t + Math.max(time ?? 0.1, 0.001));
}

export interface Shape {
  peak: number;
  decay: number;
  attack?: number;
  hold?: number;
}

export interface ToneOpts extends Shape {
  freq: number;
  type?: OscillatorType;
  /** Exponential pitch glide target, reached after `glide` seconds. */
  to?: number;
  glide?: number;
  sweep?: Sweep;
  detune?: number;
}

export function tone(ctx: Ctx, dest: AudioNode, t: number, o: ToneOpts): number {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  glide(osc.frequency, t, o.freq, o.sweep, o.to, o.glide ?? o.decay);
  if (o.detune) osc.detune.setValueAtTime(o.detune, t);
  const g = ctx.createGain();
  g.gain.value = 0;
  const end = envelope(g.gain, t, o.peak, o.attack ?? 0.003, o.decay, o.hold);
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(end + 0.03);
  autoRelease(osc, [osc, g]);
  return end;
}

export interface NoiseOpts extends Shape {
  /** Filter centre/cutoff. */
  freq: number;
  filter?: BiquadFilterType;
  q?: number;
  to?: number;
  glide?: number;
  sweep?: Sweep;
}

export function noise(ctx: Ctx, dest: AudioNode, t: number, o: NoiseOpts): number {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.filter ?? 'bandpass';
  f.Q.value = o.q ?? 1;
  glide(f.frequency, t, o.freq, o.sweep, o.to, o.glide ?? o.decay);
  const g = ctx.createGain();
  g.gain.value = 0;
  const end = envelope(g.gain, t, o.peak, o.attack ?? 0.002, o.decay, o.hold);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(t, Math.random() * 1.5);
  src.stop(end + 0.03);
  autoRelease(src, [src, f, g]);
  return end;
}

/** Additive synthesis: one sine per overtone, each with its own decay (metallophones, gongs). */
export function additive(
  ctx: Ctx,
  dest: AudioNode,
  t: number,
  freq: number,
  peak: number,
  overtones: readonly Overtone[],
  attack = 0.002,
): number {
  let end = t;
  for (const [ratio, amp, decay] of overtones) {
    const f = freq * ratio;
    if (f > 16000) continue;
    end = Math.max(end, tone(ctx, dest, t, { freq: f, peak: peak * amp, attack, decay }));
  }
  return end;
}

export interface FmOpts extends Shape {
  freq: number;
  /** Modulator frequency ratio — non-integer ratios give clangy, bell-like overtones. */
  ratio: number;
  /** Modulation index at the strike; it decays over `indexDecay` seconds. */
  index: number;
  indexDecay: number;
}

/** Two-operator FM: bright metallic strike that mellows into a near-sine tail. */
export function fm(ctx: Ctx, dest: AudioNode, t: number, o: FmOpts): number {
  const f = hz(o.freq);
  const mod = ctx.createOscillator();
  mod.frequency.setValueAtTime(hz(f * o.ratio), t);
  const depth = ctx.createGain();
  const dev = Math.max(o.index * f * o.ratio, EPS * 2);
  depth.gain.setValueAtTime(dev, t);
  depth.gain.exponentialRampToValueAtTime(Math.max(dev * 0.03, EPS), t + Math.max(o.indexDecay, 0.005));
  const car = ctx.createOscillator();
  car.frequency.setValueAtTime(f, t);
  const g = ctx.createGain();
  g.gain.value = 0;
  const end = envelope(g.gain, t, o.peak, o.attack ?? 0.002, o.decay, o.hold);
  mod.connect(depth);
  depth.connect(car.frequency);
  car.connect(g);
  g.connect(dest);
  mod.start(t);
  car.start(t);
  mod.stop(end + 0.03);
  car.stop(end + 0.03);
  autoRelease(mod, [mod, depth]);
  autoRelease(car, [car, g]);
  return end;
}
