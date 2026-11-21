/**
 * Seeded, serialisable PRNG (mulberry32). The whole generator state is a single uint32 so it can live
 * inside GameState (`state.rng`) and survive JSON save/load. The engine NEVER uses Math.random.
 */

/** Normalise any number into a valid uint32 seed/state. */
export function seedState(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  return Math.floor(seed) >>> 0;
}

/** One mulberry32 step: returns a float in [0, 1) and the next state. */
export function nextRandom(state: number): { value: number; state: number } {
  const a = (state + 0x6d2b79f5) | 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: a >>> 0 };
}

/** Anything that carries a mutable rng state (GameState does). */
export interface RngHolder {
  rng: number;
}

/** Draws a float in [0, 1) and advances `holder.rng` in place. */
export function random(holder: RngHolder): number {
  const r = nextRandom(holder.rng);
  holder.rng = r.state;
  return r.value;
}

/** Integer in [min, max] inclusive. */
export function randomInt(holder: RngHolder, min: number, max: number): number {
  return min + Math.floor(random(holder) * (max - min + 1));
}

export function rollDie(holder: RngHolder): number {
  return randomInt(holder, 1, 6);
}

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(holder: RngHolder, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(holder, 0, i);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Small standalone generator (handy for tests / AI simulations). */
export class Rng implements RngHolder {
  rng: number;
  constructor(seed: number) {
    this.rng = seedState(seed);
  }
  next(): number {
    return random(this);
  }
  int(min: number, max: number): number {
    return randomInt(this, min, max);
  }
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick from empty list');
    return items[randomInt(this, 0, items.length - 1)];
  }
}
