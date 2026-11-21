import { describe, expect, it } from 'vitest';
import { matchesParity } from './actions';
import { act, newGame, ofType } from './testkit';

function rollMany(parity: 'genap' | 'ganjil' | undefined, n: number): number {
  let match = 0;
  for (let seed = 1; seed <= n; seed++) {
    const g = newGame({ seed });
    const r = act(g, { type: 'ROLL', parity });
    const dice = ofType(r.events, 'dice')[0].dice;
    if (matchesParity(dice, parity ?? 'genap')) match++;
  }
  return match / n;
}

describe('Genap/Ganjil pick', () => {
  it('matchesParity reads the sum', () => {
    expect(matchesParity([1, 3], 'genap')).toBe(true);
    expect(matchesParity([1, 2], 'genap')).toBe(false);
    expect(matchesParity([2, 3], 'ganjil')).toBe(true);
  });

  it('biases toward the picked parity (~75%) without guaranteeing it', () => {
    const genap = rollMany('genap', 600);
    const ganjil = 1 - rollMany('ganjil', 600); // share of rolls that came out even when asking for odd
    expect(genap).toBeGreaterThan(0.66);
    expect(genap).toBeLessThan(0.86);
    expect(ganjil).toBeLessThan(0.34);
  });

  it('no pick keeps the plain roll (same seed, same dice as before the feature)', () => {
    const a = act(newGame({ seed: 42 }), { type: 'ROLL' });
    const b = act(newGame({ seed: 42 }), { type: 'ROLL', parity: undefined });
    expect(ofType(a.events, 'dice')[0].dice).toEqual(ofType(b.events, 'dice')[0].dice);
    const plain = rollMany(undefined, 600);
    expect(plain).toBeGreaterThan(0.4);
    expect(plain).toBeLessThan(0.6);
  });
});

describe('Genap/Ganjil charges', () => {
  it('start with 3, spend one per pick, refuse when empty', () => {
    let g = newGame({ seed: 7 });
    expect(g.players[0].parityCharges).toBe(3);
    for (let i = 0; i < 3; i++) {
      g.players[0].position = 10; // stay away from start
      g.current = 0;
      g.pending = { kind: 'roll' };
      g = act(g, { type: 'ROLL', parity: 'genap' }).state;
    }
    expect(g.players[0].parityCharges).toBe(0);
    g.current = 0;
    g.pending = { kind: 'roll' };
    expect(() => act(g, { type: 'ROLL', parity: 'ganjil' })).toThrow(/habis/);
    // A plain roll still works with no charges.
    expect(() => act(g, { type: 'ROLL' })).not.toThrow();
  });

  it('passing start earns one back (capped at 3)', () => {
    const g = newGame({ seed: 3 });
    g.players[0].parityCharges = 1;
    g.players[0].position = 30;
    const r = act(g, { type: 'ROLL' });
    if (r.state.players[0].position < 30) expect(r.state.players[0].parityCharges).toBe(2);
    const full = newGame({ seed: 3 });
    full.players[0].position = 30;
    const r2 = act(full, { type: 'ROLL' });
    expect(r2.state.players[0].parityCharges).toBeLessThanOrEqual(3);
  });

  it('old saves without the field count as full', () => {
    const g = newGame({ seed: 5 });
    delete (g.players[0] as { parityCharges?: number }).parityCharges;
    const r = act(g, { type: 'ROLL', parity: 'genap' });
    expect(r.state.players[0].parityCharges).toBe(2);
  });
});
