/**
 * Small deterministic RNG for bot decisions. Seeded from the game state so the same state always yields
 * the same choice (reproducible games, testable bots). Never uses Math.random.
 */
import type { GameState } from '@/engine/types';

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
}

function mix32(h: number, v: number): number {
  h ^= v >>> 0;
  h = Math.imul(h, 0x01000193) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return h >>> 0;
}

export function hashSeed(parts: readonly (number | string)[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) {
    if (typeof part === 'number') {
      h = mix32(h, Math.floor(part) & 0xffffffff);
    } else {
      for (let i = 0; i < part.length; i++) h = mix32(h, part.charCodeAt(i));
    }
  }
  return h >>> 0;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => (n <= 0 ? 0 : Math.floor(next() * n)),
    chance: (p) => next() < p,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
}

/** RNG for one decision of the current player. `salt` separates independent decisions of the same state. */
export function botRng(state: GameState, salt: string): Rng {
  const me = state.players[state.current];
  return mulberry32(
    hashSeed([state.turnCount, state.current, state.round, state.rng, state.logSeq, me?.id ?? '', salt]),
  );
}
