/**
 * Gamelan-flavoured 5-note scales, in cents above the root. Real gamelan sets each have their own
 * tuning; these are tasteful approximations that still sit nicely next to a modern sub bass.
 */
export type Scale = readonly number[];

/** Slendro-ish: five almost-equal steps (~240 cents). Bright, open, floating. */
export const SLENDRO: Scale = [0, 231, 474, 717, 955];

/** Pelog-ish (bem subset 1-2-3-5-6): small and large steps mixed. Moody, exotic colour. */
export const PELOG: Scale = [0, 128, 276, 677, 791];

/** Frequency of scale degree `deg` (any integer; 5 = one octave up, -1 = below the root). */
export function degreeHz(root: number, scale: Scale, deg: number): number {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  const idx = deg - oct * n;
  return root * Math.pow(2, (scale[idx] + 1200 * oct) / 1200);
}

/** Pitch class (0..4) of a degree. */
export const pc = (deg: number): number => ((deg % 5) + 5) % 5;
