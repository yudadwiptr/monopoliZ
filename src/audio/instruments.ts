/**
 * Synthesized instruments shared by music and sfx. Signature: (ctx, out, time, Hz, velocity 0..1).
 * Gamelan voices pair each fundamental with a slightly detuned twin to get the shimmering
 * "ombak" beating that real paired gamelan instruments have.
 */
import { additive, autoRelease, envelope, fm, hz, noise, tone, type Ctx } from './synth';

/** Ratio for a partner partial that beats against `f` at `beatHz`. */
const twin = (f: number, beatHz: number): number => 1 + beatHz / Math.max(f, 1);

/** Saron: bronze bar, bright inharmonic overtones, medium decay. Carries the core melody. */
export function saron(ctx: Ctx, out: AudioNode, t: number, f: number, v = 1): number {
  return additive(
    ctx,
    out,
    t,
    f,
    0.3 * v,
    [
      [1, 1, 1.1],
      [twin(f, 2.4), 0.5, 1],
      [2.76, 0.3, 0.3],
      [5.4, 0.1, 0.09],
    ],
    0.0015,
  );
}

/** Peking: small high saron — short, glassy, for fast figuration. */
export function peking(ctx: Ctx, out: AudioNode, t: number, f: number, v = 1): number {
  return additive(
    ctx,
    out,
    t,
    f,
    0.22 * v,
    [
      [1, 1, 0.5],
      [twin(f, 3.2), 0.4, 0.45],
      [2.76, 0.22, 0.14],
    ],
    0.0012,
  );
}

/** Gender: thin bars over tube resonators — soft, round, long ringing tail. */
export function gender(ctx: Ctx, out: AudioNode, t: number, f: number, v = 1): number {
  return additive(
    ctx,
    out,
    t,
    f,
    0.24 * v,
    [
      [1, 1, 2.4],
      [twin(f, 1.6), 0.7, 2.2],
      [2.92, 0.1, 0.35],
    ],
    0.005,
  );
}

/** Bonang: small kettle gong — clangy FM strike settling into a warm hum. */
export function bonang(ctx: Ctx, out: AudioNode, t: number, f: number, v = 1): number {
  tone(ctx, out, t, { freq: f * twin(f, 2.5), attack: 0.002, decay: 0.65, peak: 0.07 * v });
  return fm(ctx, out, t, { freq: f, ratio: 2.76, index: 1.3, indexDecay: 0.07, attack: 0.0015, decay: 0.8, peak: 0.22 * v });
}

/** Gong ageng: low, long, slowly beating partials plus a soft mallet thump. */
export function gong(ctx: Ctx, out: AudioNode, t: number, f: number, v = 1, dur = 5.5): number {
  noise(ctx, out, t, { filter: 'lowpass', freq: 220, attack: 0.004, decay: 0.3, peak: 0.3 * v });
  return additive(
    ctx,
    out,
    t,
    f,
    0.55 * v,
    [
      [1, 1, dur],
      [twin(f, 0.8), 0.9, dur * 0.95],
      [2.015, 0.4, dur * 0.5],
      [2.76, 0.14, dur * 0.25],
      [4.2, 0.07, 0.7],
    ],
    0.025,
  );
}

/** Kempul: hanging gong, higher and shorter than the big gong. Marks the middle of a cycle. */
export function kempul(ctx: Ctx, out: AudioNode, t: number, f: number, v = 1): number {
  return additive(
    ctx,
    out,
    t,
    f,
    0.32 * v,
    [
      [1, 1, 2.2],
      [twin(f, 1.3), 0.8, 2],
      [2.04, 0.3, 0.8],
      [3.02, 0.1, 0.3],
    ],
    0.008,
  );
}

export type Stroke = 'dhung' | 'tung' | 'tak' | 'ket';

/** Kendang (hand drum): dhung = deep open bass, tung = mid open, tak = slap, ket = muted tap. */
export function kendang(ctx: Ctx, out: AudioNode, t: number, stroke: Stroke, v = 1): number {
  switch (stroke) {
    case 'dhung':
      noise(ctx, out, t, { filter: 'lowpass', freq: 700, attack: 0.001, decay: 0.03, peak: 0.1 * v });
      return tone(ctx, out, t, { freq: 155, to: 70, glide: 0.11, attack: 0.002, decay: 0.34, peak: 0.6 * v });
    case 'tung':
      tone(ctx, out, t, { type: 'triangle', freq: 600, attack: 0.001, decay: 0.03, peak: 0.06 * v });
      return tone(ctx, out, t, { freq: 300, to: 235, glide: 0.06, attack: 0.002, decay: 0.2, peak: 0.34 * v });
    case 'tak':
      tone(ctx, out, t, { freq: 480, to: 330, glide: 0.03, attack: 0.001, decay: 0.04, peak: 0.16 * v });
      return noise(ctx, out, t, { freq: 2400, q: 1.3, attack: 0.001, decay: 0.07, peak: 0.6 * v });
    case 'ket':
      return noise(ctx, out, t, { freq: 1500, q: 2.2, attack: 0.001, decay: 0.028, peak: 0.4 * v });
  }
}

/** Gentle lo-fi hi-hat. */
export function hat(ctx: Ctx, out: AudioNode, t: number, v = 1, open = false): number {
  return noise(ctx, out, t, {
    filter: 'highpass',
    freq: 7200,
    q: 0.7,
    attack: 0.001,
    decay: open ? 0.22 : 0.04,
    peak: 0.14 * v,
  });
}

/** Soft sub bass with a quiet 2nd harmonic so it still reads on phone speakers. */
export function bass(ctx: Ctx, out: AudioNode, t: number, f: number, dur: number, v = 1): number {
  tone(ctx, out, t, { freq: f * 2, attack: 0.015, hold: dur * 0.5, decay: 0.2, peak: 0.12 * v });
  return tone(ctx, out, t, { freq: f, attack: 0.015, hold: Math.max(0, dur - 0.05), decay: 0.25, peak: 0.5 * v });
}

/** Short wooden knock (pawn steps, dice). */
export function knock(ctx: Ctx, out: AudioNode, t: number, f: number, v = 1): number {
  tone(ctx, out, t, { type: 'triangle', freq: f * 2.31, attack: 0.001, decay: 0.03, peak: 0.14 * v });
  noise(ctx, out, t, { freq: f * 4, q: 1.5, attack: 0.001, decay: 0.015, peak: 0.25 * v });
  return tone(ctx, out, t, { freq: f * 1.35, to: f, glide: 0.012, attack: 0.001, decay: 0.08, peak: 0.5 * v });
}

/** Clean notification bell. */
export function chime(ctx: Ctx, out: AudioNode, t: number, f: number, v = 1, decay = 0.6): number {
  tone(ctx, out, t, { freq: f * 2.01, attack: 0.001, decay: decay * 0.3, peak: 0.05 * v });
  return fm(ctx, out, t, { freq: f, ratio: 3.5, index: 0.8, indexDecay: 0.12, attack: 0.002, decay, peak: 0.26 * v });
}

/** Coin blip: bright triangle with a sparkle harmonic (or a duller one for spending). */
export function coin(ctx: Ctx, out: AudioNode, t: number, f: number, v = 1, dull = false): number {
  if (!dull) tone(ctx, out, t, { freq: f * 3, attack: 0.001, decay: 0.07, peak: 0.05 * v });
  return tone(ctx, out, t, {
    type: dull ? 'sine' : 'triangle',
    freq: f,
    attack: 0.001,
    decay: dull ? 0.16 : 0.24,
    peak: 0.24 * v,
  });
}

/** Brassy stab: two detuned saws through an opening low-pass. */
export function brass(ctx: Ctx, out: AudioNode, t: number, f: number, dur: number, v = 1): number {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 1.2;
  lp.frequency.setValueAtTime(hz(f * 1.5), t);
  lp.frequency.exponentialRampToValueAtTime(hz(f * 6), t + 0.05);
  lp.frequency.exponentialRampToValueAtTime(hz(f * 2.5), t + 0.05 + dur + 0.2);
  const g = ctx.createGain();
  g.gain.value = 0;
  const end = envelope(g.gain, t, 0.12 * v, 0.025, 0.22, Math.max(0, dur - 0.025));
  lp.connect(g);
  g.connect(out);
  const oscs = [-8, 8].map((cents) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(hz(f), t);
    o.detune.setValueAtTime(cents, t);
    o.connect(lp);
    o.start(t);
    o.stop(end + 0.03);
    return o;
  });
  autoRelease(oscs[0], [...oscs, lp, g]);
  return end;
}

/** Tuba-ish "wah": saws through a resonant low-pass that opens and closes. `sad` adds wobble + droop. */
export function wah(ctx: Ctx, out: AudioNode, t: number, f: number, dur: number, v = 1, sad = false): number {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 7;
  const cut = lp.frequency;
  cut.setValueAtTime(hz(f * 1.4), t);
  const waves = sad ? Math.max(1, Math.round(dur / 0.25)) : 1;
  const w = dur / waves;
  for (let k = 0; k < waves; k++) {
    const a = t + k * w;
    cut.exponentialRampToValueAtTime(hz(f * 7), a + w * 0.4);
    cut.exponentialRampToValueAtTime(hz(f * 1.5), a + w);
  }
  const g = ctx.createGain();
  g.gain.value = 0;
  const end = envelope(g.gain, t, 0.3 * v, 0.03, 0.15, Math.max(0, dur - 0.05));
  lp.connect(g);
  g.connect(out);
  const oscs = [-6, 6].map((cents) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(hz(f), t);
    if (sad) o.frequency.linearRampToValueAtTime(hz(f * 0.94), t + dur);
    o.detune.setValueAtTime(cents, t);
    o.connect(lp);
    o.start(t);
    o.stop(end + 0.03);
    return o;
  });
  autoRelease(oscs[0], [...oscs, lp, g]);
  return end;
}
