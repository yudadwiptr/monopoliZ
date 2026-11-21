/** Small seeded PRNG so generative music is reproducible in tests but different every session. */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);

export function pick<T>(r: Rng, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)];
}
