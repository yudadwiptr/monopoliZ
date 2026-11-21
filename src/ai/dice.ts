import type { Parity } from '@/engine/types';

/**
 * Probability model of a 2d6 roll, including the dice gauge.
 *
 * SPEC: with probability GAUGE_BIAS_CHANCE the engine re-samples up to 3 times (GAUGE_SAMPLES = 4 rolls in
 * total, stopping early on an exact hit) and keeps the roll whose sum is closest to `2 + power * 10`, the
 * earlier roll winning ties; otherwise the roll is purely random. "Best of 4, first wins ties" is exactly
 * that distribution (an exact hit can never be beaten, so stopping early changes nothing).
 */

export interface DiceOutcome {
  sum: number;
  double: boolean;
  p: number;
}

export const GAUGE_BIAS_CHANCE = 0.5;
export const GAUGE_SAMPLES = 4;
export const MIN_SUM = 2;
export const MAX_SUM = 12;

/** The 17 distinct (sum, double) outcomes of a fair 2d6 roll. */
export const BASE_OUTCOMES: readonly DiceOutcome[] = (() => {
  const acc = new Map<string, DiceOutcome>();
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const sum = a + b;
      const double = a === b;
      const key = `${sum}:${double}`;
      const prev = acc.get(key);
      if (prev) prev.p += 1 / 36;
      else acc.set(key, { sum, double, p: 1 / 36 });
    }
  }
  return [...acc.values()].sort((x, y) => x.sum - y.sum || Number(x.double) - Number(y.double));
})();

/** P(sum) of a fair roll, indexed by sum (0..12). */
export const RANDOM_SUM_PROB: readonly number[] = (() => {
  const out = new Array<number>(MAX_SUM + 1).fill(0);
  for (const o of BASE_OUTCOMES) out[o.sum] += o.p;
  return out;
})();

export function clampPower(power: number): number {
  if (!Number.isFinite(power)) return 0.5;
  return Math.min(1, Math.max(0, power));
}

export function powerForTarget(sum: number): number {
  return clampPower((sum - MIN_SUM) / (MAX_SUM - MIN_SUM));
}

export function targetForPower(power: number): number {
  return MIN_SUM + clampPower(power) * (MAX_SUM - MIN_SUM);
}

const cache = new Map<string, DiceOutcome[]>();

/** Outcome distribution of ROLL{power}. `undefined` = no gauge (pure random). */
export function rollOutcomes(power?: number): readonly DiceOutcome[] {
  if (power === undefined) return BASE_OUTCOMES;
  const target = targetForPower(power);
  const key = target.toFixed(4);
  const hit = cache.get(key);
  if (hit) return hit;

  const biased = new Array<number>(BASE_OUTCOMES.length).fill(0);
  const n = BASE_OUTCOMES.length;
  const idx = new Array<number>(GAUGE_SAMPLES).fill(0);
  // Enumerate every ordered tuple of GAUGE_SAMPLES outcomes (17^4 ≈ 84k): cheap, and cached per target.
  for (;;) {
    let best = idx[0];
    let bestDist = Math.abs(BASE_OUTCOMES[best].sum - target);
    let p = BASE_OUTCOMES[best].p;
    for (let k = 1; k < GAUGE_SAMPLES; k++) {
      const o = BASE_OUTCOMES[idx[k]];
      p *= o.p;
      const d = Math.abs(o.sum - target);
      if (d < bestDist) {
        bestDist = d;
        best = idx[k];
      }
    }
    biased[best] += p;
    let k = GAUGE_SAMPLES - 1;
    while (k >= 0 && ++idx[k] === n) {
      idx[k] = 0;
      k--;
    }
    if (k < 0) break;
  }

  const out = BASE_OUTCOMES.map((o, i) => ({
    sum: o.sum,
    double: o.double,
    p: (1 - GAUGE_BIAS_CHANCE) * o.p + GAUGE_BIAS_CHANCE * biased[i],
  }));
  cache.set(key, out);
  return out;
}

/**
 * Outcome distribution of ROLL{power, parity}: a result whose sum doesn't match the Genap/Ganjil pick is
 * re-rolled once with the same gauge, and the second throw stands.
 */
export function rollOutcomesWithParity(power: number | undefined, parity?: Parity): readonly DiceOutcome[] {
  const base = rollOutcomes(power);
  if (!parity) return base;
  const match = (o: DiceOutcome) => (o.sum % 2 === 0) === (parity === 'genap');
  let miss = 0;
  for (const o of base) if (!match(o)) miss += o.p;
  return base.map((o) => ({ ...o, p: match(o) ? o.p * (1 + miss) : o.p * miss }));
}

/** P(sum) for ROLL{power}, indexed by sum (0..12). */
export function sumProbabilities(power?: number): number[] {
  const out = new Array<number>(MAX_SUM + 1).fill(0);
  for (const o of rollOutcomes(power)) out[o.sum] += o.p;
  return out;
}

export function doubleProbability(power?: number): number {
  let p = 0;
  for (const o of rollOutcomes(power)) if (o.double) p += o.p;
  return p;
}

/** Integer gauge targets 2..12 the bots consider. */
export const TARGET_SUMS: readonly number[] = Array.from({ length: MAX_SUM - MIN_SUM + 1 }, (_, i) => MIN_SUM + i);
