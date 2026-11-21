import { describe, expect, it } from 'vitest';
import { sellValue } from '@/engine/economy';
import { mapOf } from '@/engine/selectors';
import type { Action, BotLevel, GameState, Pending } from '@/engine/types';
import { decideBotAction, isLegalAction, planBotAction } from './bot';
import { makeContext } from './context';
import { RANDOM_SUM_PROB, sumProbabilities } from './dice';
import { minLossCover } from './decide/raiseFunds';
import { mulberry32 } from './rng';
import { THREAT_VALUE, WIN_VALUE, gainValue, monopolyPotential } from './strategy';
import { T, makeState, withLevel } from './testing/fixtures';

const LEVELS: BotLevel[] = ['mudah', 'sedang', 'sulit'];

function decideAs(state: GameState, level: BotLevel): Action {
  const s = withLevel(state, level);
  const a = planBotAction(s);
  expect(isLegalAction(s, a)).toBe(true);
  return a;
}

function powerOf(a: Action): number {
  if (a.type !== 'ROLL' || a.power === undefined) throw new Error(`expected ROLL with power, got ${JSON.stringify(a)}`);
  return a.power;
}

describe('strategy potential', () => {
  it('scores a finished monopoly as a win and one-away as a threat', () => {
    const map = mapOf(makeState());
    const win = makeState({ owned: { 5: ['p1', 0], 11: ['p1', 0], 21: ['p1', 0], 27: ['p1', 0] } });
    expect(monopolyPotential(map, win.tiles, 'p1')).toBe(WIN_VALUE);
    const threat = makeState({ owned: { 5: ['p1', 0], 11: ['p1', 0], 21: ['p1', 0] } });
    expect(monopolyPotential(map, threat.tiles, 'p1')).toBeGreaterThanOrEqual(THREAT_VALUE);
  });

  it("values blocking an opponent's last missing tile highly", () => {
    const s = makeState({ owned: { 5: ['p2', 0], 11: ['p2', 0], 21: ['p2', 0] } });
    const ctx = makeContext(s);
    expect(gainValue(ctx, T.RAJA_AMPAT, 0)).toBeGreaterThan(500);
    expect(gainValue(ctx, T.BANDA_ACEH, 0)).toBeLessThan(100);
  });

  it('a landmark owned by someone else kills the structure', () => {
    const map = mapOf(makeState());
    const open = makeState({ owned: { 1: ['p1', 0], 2: ['p1', 0], 4: ['p1', 0], 5: ['p1', 0], 6: ['p1', 0], 7: ['p2', 3] } });
    const dead = makeState({ owned: { 1: ['p1', 0], 2: ['p1', 0], 4: ['p1', 0], 5: ['p1', 0], 6: ['p1', 0], 7: ['p2', 4] } });
    expect(monopolyPotential(map, open.tiles, 'p1')).toBeGreaterThan(monopolyPotential(map, dead.tiles, 'p1'));
  });
});

describe('dice gauge', () => {
  it('aiming shifts probability toward the target sum', () => {
    const p7 = sumProbabilities(0.5);
    expect(p7.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(p7[7]).toBeGreaterThan(RANDOM_SUM_PROB[7]);
    const p12 = sumProbabilities(1);
    expect(p12[12]).toBeGreaterThan(RANDOM_SUM_PROB[12] * 1.5);
    const mean = (p: number[]) => p.reduce((s, v, i) => s + v * i, 0);
    expect(mean(sumProbabilities(0))).toBeLessThan(mean(sumProbabilities(1)));
  });
});

describe('roll', () => {
  it('every level returns ROLL with a power in [0,1]', () => {
    for (const level of LEVELS) {
      const p = powerOf(decideAs(makeState(), level));
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('sulit steers away from opponent landmarks', () => {
    const s = makeState({ owned: { 6: ['p2', 4], 7: ['p2', 4] }, players: [{ position: 0 }, { position: 20 }] });
    const probs = sumProbabilities(powerOf(decideAs(s, 'sulit')));
    expect(probs[6] + probs[7]).toBeLessThan(RANDOM_SUM_PROB[6] + RANDOM_SUM_PROB[7]);
  });

  it('sulit aims for its own hotel to build a landmark', () => {
    // Before the first lap other cities can only get a Rumah, so the hotel → landmark is the prize.
    const owned: Record<number, [string, number]> = { 9: ['p1', 3], 10: ['p2', 0], 11: ['p2', 0], 12: ['p2', 0] };
    const s = makeState({ owned, players: [{ position: 0, cash: 1500, laps: 0 }, { position: 20 }] });
    const probs = sumProbabilities(powerOf(decideAs(s, 'sulit')));
    expect(probs[9]).toBeGreaterThan(RANDOM_SUM_PROB[9] * 1.3);
  });

  it('is deterministic for the same state', () => {
    const s = withLevel(makeState(), 'mudah');
    expect(planBotAction(s)).toEqual(planBotAction(s));
  });
});

describe('island', () => {
  const pending: Pending = { kind: 'island', turnsLeft: 3, fee: 100, canPay: true, hasCard: false };

  it('sulit stays put (rolls) when the road ahead is deadly', () => {
    const owned: Record<number, [string, number]> = {};
    for (const i of [9, 10, 12, 14, 15, 17, 18, 20]) owned[i] = ['p2', 4];
    const s = makeState({ owned, pending, players: [{ position: 8, islandTurns: 3, cash: 1500 }, { position: 2 }] });
    expect(decideAs(s, 'sulit').type).toBe('ROLL');
  });

  it('sulit pays to escape when the road ahead is full of opportunities', () => {
    const s = makeState({ pending, players: [{ position: 8, islandTurns: 3, cash: 2500 }, { position: 2 }] });
    expect(decideAs(s, 'sulit').type).toBe('PAY_ESCAPE');
  });

  it('uses the escape card when it has one and the board is attractive', () => {
    const p: Pending = { ...pending, hasCard: true };
    const s = makeState({ pending: p, players: [{ position: 8, islandTurns: 3, cash: 2500, cards: ['escape'] }, {}] });
    expect(decideAs(s, 'sulit').type).toBe('USE_ESCAPE_CARD');
    expect(decideAs(s, 'sedang').type).toBe('USE_ESCAPE_CARD');
  });
});

describe('buy', () => {
  it('always buys the tile that wins the game', () => {
    const s = makeState({
      owned: { 5: ['p1', 0], 11: ['p1', 0], 21: ['p1', 0] },
      pending: { kind: 'buy', tile: T.RAJA_AMPAT, maxLevel: 0, discount: false },
      players: [{ position: T.RAJA_AMPAT }, {}],
    });
    for (const level of LEVELS) expect(decideAs(s, level)).toEqual({ type: 'BUY', level: 0 });
  });

  it("sedang and sulit block an opponent's monopoly", () => {
    const s = makeState({
      owned: { 5: ['p2', 0], 11: ['p2', 0], 21: ['p2', 0] },
      pending: { kind: 'buy', tile: T.RAJA_AMPAT, maxLevel: 0, discount: false },
      players: [{ position: T.RAJA_AMPAT, cash: 400 }, {}],
    });
    expect(decideAs(s, 'sedang').type).toBe('BUY');
    expect(decideAs(s, 'sulit').type).toBe('BUY');
  });

  it('sulit keeps its cash when a landmark ahead could bankrupt it', () => {
    const s = makeState({
      owned: { 9: ['p2', 4], 10: ['p2', 4], 12: ['p2', 4] },
      pending: { kind: 'buy', tile: T.PADANG, maxLevel: 3, discount: false },
      players: [{ position: T.PADANG, cash: 420 }, { position: 20 }],
    });
    expect(decideAs(s, 'sulit')).toEqual({ type: 'SKIP' });
  });

  it('builds higher straight away when rich and safe', () => {
    const s = makeState({
      pending: { kind: 'buy', tile: T.JAKARTA, maxLevel: 3, discount: false },
      players: [{ position: T.JAKARTA, cash: 5000 }, { position: 22 }],
    });
    const a = decideAs(s, 'sulit');
    expect(a.type).toBe('BUY');
    if (a.type === 'BUY') expect(a.level).toBeGreaterThanOrEqual(2);
    expect(decideAs(s, 'sedang')).toEqual({ type: 'BUY', level: 3 });
  });

  it('never picks an unaffordable level (discount included)', () => {
    const s = makeState({
      pending: { kind: 'buy', tile: T.JAKARTA, maxLevel: 3, discount: true },
      players: [{ position: T.JAKARTA, cash: 400, cards: ['discount'] }, {}],
    });
    for (const level of LEVELS) decideAs(s, level);
  });
});

describe('build', () => {
  it('turns a hotel into a landmark when it can afford it', () => {
    const s = makeState({
      owned: { 31: ['p1', 3] },
      pending: { kind: 'build', tile: T.JAKARTA, fromLevel: 3, maxLevel: 4, discount: false },
      players: [{ position: T.JAKARTA, cash: 3000 }, { position: 20 }],
    });
    expect(decideAs(s, 'sulit')).toEqual({ type: 'BUILD', level: 4 });
    expect(decideAs(s, 'sedang')).toEqual({ type: 'BUILD', level: 4 });
  });

  it('sedang keeps a reserve proportional to the biggest toll ahead', () => {
    const s = makeState({
      owned: { 4: ['p1', 1], 15: ['p2', 4] },
      pending: { kind: 'build', tile: T.PADANG, fromLevel: 1, maxLevel: 3, discount: false },
      players: [{ position: T.PADANG, cash: 500 }, { position: 20 }],
    });
    expect(decideAs(s, 'sedang')).toEqual({ type: 'BUILD', level: 2 });
  });
});

describe('acquire', () => {
  it('takes over the tile that completes its monopoly', () => {
    const s = makeState({
      owned: { 5: ['p1', 0], 11: ['p1', 0], 21: ['p1', 0], 27: ['p2', 0] },
      pending: { kind: 'acquire', tile: T.RAJA_AMPAT, price: 400, ownerId: 'p2' },
      players: [{ position: T.RAJA_AMPAT, cash: 2000 }, {}],
    });
    for (const level of LEVELS) expect(decideAs(s, level)).toEqual({ type: 'ACQUIRE' });
  });

  it("breaks an opponent's monopoly threat", () => {
    const s = makeState({
      owned: { 5: ['p2', 0], 11: ['p2', 0], 21: ['p2', 0] },
      pending: { kind: 'acquire', tile: T.TOBA, price: 200, ownerId: 'p2' },
      players: [{ position: T.TOBA, cash: 2000 }, {}],
    });
    expect(decideAs(s, 'sedang')).toEqual({ type: 'ACQUIRE' });
    expect(decideAs(s, 'sulit')).toEqual({ type: 'ACQUIRE' });
  });

  it('sulit passes on pointless takeovers', () => {
    const s = makeState({
      owned: { 1: ['p2', 0] },
      pending: { kind: 'acquire', tile: T.BANDA_ACEH, price: 100, ownerId: 'p2' },
      players: [{ position: T.BANDA_ACEH, cash: 2000 }, {}],
    });
    expect(decideAs(s, 'sulit')).toEqual({ type: 'SKIP' });
  });
});

describe('choose_tile', () => {
  const allButAirport = Array.from({ length: 32 }, (_, i) => i).filter((i) => i !== T.AIRPORT);

  it('flies to the winning tile', () => {
    const s = makeState({
      owned: { 5: ['p1', 0], 11: ['p1', 0], 21: ['p1', 0] },
      pending: { kind: 'choose_tile', purpose: 'airport', candidates: allButAirport, optional: true },
      players: [{ position: T.AIRPORT, cash: 1000, pendingFlight: true }, {}],
    });
    expect(decideAs(s, 'sulit')).toEqual({ type: 'CHOOSE_TILE', tile: T.RAJA_AMPAT });
    expect(decideAs(s, 'sedang')).toEqual({ type: 'CHOOSE_TILE', tile: T.RAJA_AMPAT });
  });

  it('flies to block an opponent threat', () => {
    const s = makeState({
      owned: { 5: ['p2', 0], 11: ['p2', 0], 21: ['p2', 0] },
      pending: { kind: 'choose_tile', purpose: 'airport', candidates: allButAirport, optional: true },
      players: [{ position: T.AIRPORT, cash: 1000, pendingFlight: true }, {}],
    });
    // Buying the missing tile or taking over one of theirs both kill the threat.
    const a = decideAs(s, 'sulit');
    expect(a.type).toBe('CHOOSE_TILE');
    if (a.type === 'CHOOSE_TILE') expect([5, 11, 21, 27]).toContain(a.tile);
    expect(decideAs(s, 'sedang')).toEqual({ type: 'CHOOSE_TILE', tile: T.RAJA_AMPAT });
  });

  it('hosts the festival on the highest-toll property', () => {
    const s = makeState({
      owned: { 31: ['p1', 3], 1: ['p1', 1] },
      pending: { kind: 'choose_tile', purpose: 'festival', candidates: [1, 31], optional: true },
      players: [{ position: T.FESTIVAL }, { position: 25 }],
    });
    for (const level of ['sedang', 'sulit'] as const) {
      expect(decideAs(s, level)).toEqual({ type: 'CHOOSE_TILE', tile: T.JAKARTA });
    }
  });

  it('free upgrade goes to the hotel → landmark', () => {
    const s = makeState({
      owned: { 31: ['p1', 3], 4: ['p1', 1] },
      pending: { kind: 'choose_tile', purpose: 'card_upgrade', candidates: [4, 31], optional: true },
      players: [{ position: T.CHANCE_A }, { position: 25 }],
    });
    for (const level of ['sedang', 'sulit'] as const) {
      expect(decideAs(s, level)).toEqual({ type: 'CHOOSE_TILE', tile: T.JAKARTA });
    }
  });

  it('force sale breaks the monopoly threat first', () => {
    const s = makeState({
      owned: { 5: ['p2', 0], 11: ['p2', 0], 21: ['p2', 0], 31: ['p2', 2] },
      pending: { kind: 'choose_tile', purpose: 'force_sale', candidates: [5, 11, 21, 31], optional: true },
      players: [{ position: T.CHANCE_A }, { position: 25 }],
    });
    for (const level of ['sedang', 'sulit'] as const) {
      const a = decideAs(s, level);
      expect(a.type).toBe('CHOOSE_TILE');
      if (a.type === 'CHOOSE_TILE') expect([5, 11, 21]).toContain(a.tile);
    }
  });

  it('start upgrade picks a sensible city or skips', () => {
    const s = makeState({
      owned: { 31: ['p1', 2], 1: ['p1', 1] },
      pending: { kind: 'choose_tile', purpose: 'start_upgrade', candidates: [1, 31], optional: true },
      players: [{ position: T.START, cash: 3000 }, { position: 25 }],
    });
    expect(decideAs(s, 'sulit')).toEqual({ type: 'CHOOSE_TILE', tile: T.JAKARTA });
  });
});

describe('raise_funds', () => {
  const owesFrom = (cash: number, amount: number, owned: Record<number, [string, number]>, extra: Partial<Parameters<typeof makeState>[0]> = {}) =>
    makeState({
      owned,
      pending: { kind: 'raise_funds', amount, creditorId: 'p2', reason: 'toll' },
      players: [{ position: 10, cash }, { position: 25 }],
      ...extra,
    });

  // Jakarta hotel plus a handful of scattered small cities (no complete colour group).
  const portfolio: Record<number, [string, number]> = {
    31: ['p1', 3],
    1: ['p1', 0],
    4: ['p1', 1],
    9: ['p1', 1],
    12: ['p1', 0],
    17: ['p1', 1],
  };

  function sold(s: GameState, a: Action): number {
    if (a.type !== 'SELL') throw new Error(`expected SELL, got ${a.type}`);
    const defs = mapOf(s).tiles;
    return a.tiles.reduce((sum, i) => sum + sellValue(defs[i], s.tiles[i].level), 0);
  }

  it('covers the debt without dumping the landmark-to-be when small tiles suffice', () => {
    const s = owesFrom(100, 250, portfolio);
    for (const level of LEVELS) {
      const a = decideAs(s, level);
      expect(a.type).toBe('SELL');
      expect(s.players[0].cash + sold(s, a)).toBeGreaterThanOrEqual(250);
      if (a.type === 'SELL' && level !== 'mudah') expect(a.tiles).not.toContain(T.JAKARTA);
    }
  });

  it('never sells the tile an opponent needs for a monopoly when alternatives exist', () => {
    const s = owesFrom(50, 140, { 27: ['p1', 0], 22: ['p1', 0], 23: ['p1', 0] }, {
      owned: { 27: ['p1', 0], 22: ['p1', 0], 23: ['p1', 0], 5: ['p2', 0], 11: ['p2', 0], 21: ['p2', 0] },
    });
    for (const level of ['sedang', 'sulit'] as const) {
      const a = decideAs(s, level);
      expect(a.type).toBe('SELL');
      if (a.type === 'SELL') expect(a.tiles).not.toContain(T.RAJA_AMPAT);
    }
  });

  it('declares bankruptcy only when selling everything cannot cover', () => {
    const broke = owesFrom(0, 1000, { 1: ['p1', 0] });
    for (const level of LEVELS) expect(decideAs(broke, level)).toEqual({ type: 'BANKRUPT' });
    const ok = owesFrom(0, 600, portfolio);
    for (const level of LEVELS) expect(decideAs(ok, level).type).toBe('SELL');
  });

  it('min-loss cover finds the optimal subset', () => {
    const items = [
      { tile: 1, value: 100, loss: 10 },
      { tile: 2, value: 60, loss: 3 },
      { tile: 3, value: 50, loss: 3 },
      { tile: 4, value: 300, loss: 500 },
    ];
    expect(minLossCover(items, 105)?.sort()).toEqual([2, 3]);
    expect(minLossCover(items, 200)?.sort()).toEqual([1, 2, 3]);
    expect(minLossCover(items, 1000)).toBeNull();
  });
});

describe('legality fuzz', () => {
  it('always returns a legal action for random pendings, boards and levels', () => {
    const rng = mulberry32(2024);
    const props = Array.from({ length: 32 }, (_, i) => i).filter((i) => i % 8 !== 0 && i !== 3 && i !== 13 && i !== 19 && i !== 29);
    for (let n = 0; n < 400; n++) {
      const owned: Record<number, [string, number]> = {};
      for (const i of props) {
        const r = rng.next();
        if (r < 0.35) owned[i] = ['p1', rng.int(5)];
        else if (r < 0.7) owned[i] = [rng.chance(0.5) ? 'p2' : 'p3', rng.int(5)];
      }
      // Tourist tiles never have buildings.
      for (const i of [5, 11, 21, 27]) if (owned[i]) owned[i] = [owned[i][0], 0];
      const mine = Object.entries(owned).filter(([, [o]]) => o === 'p1').map(([i]) => Number(i));
      const theirs = Object.entries(owned).filter(([, [o, l]]) => o !== 'p1' && l < 4).map(([i]) => Number(i));
      const free = props.filter((i) => !owned[i]);
      const cash = rng.int(3000);
      const pos = rng.int(32);
      const kind = rng.int(9);
      let pending: Pending;
      switch (kind) {
        case 0:
          pending = { kind: 'roll' };
          break;
        case 1:
          pending = { kind: 'island', turnsLeft: 1 + rng.int(3), fee: 100, canPay: cash >= 100, hasCard: rng.chance(0.3) };
          break;
        case 2: {
          const tile = free.length ? rng.pick(free) : 1;
          pending = { kind: 'buy', tile, maxLevel: [5, 11, 21, 27].includes(tile) ? 0 : rng.pick([1, 3]), discount: rng.chance(0.2) };
          break;
        }
        case 3: {
          const cities = mine.filter((i) => ![5, 11, 21, 27].includes(i) && owned[i][1] < 4);
          const tile = cities.length ? rng.pick(cities) : 1;
          const from = owned[tile]?.[1] ?? 0;
          pending = { kind: 'build', tile, fromLevel: from, maxLevel: from >= 3 ? 4 : 3, discount: false };
          break;
        }
        case 4: {
          const tile = theirs.length ? rng.pick(theirs) : 1;
          pending = { kind: 'acquire', tile, price: 50 + rng.int(1500), ownerId: owned[tile]?.[0] ?? 'p2' };
          break;
        }
        case 5: {
          const purposes = ['airport', 'festival', 'start_upgrade', 'card_upgrade', 'card_festival', 'force_sale'] as const;
          const purpose = rng.pick(purposes);
          let candidates: number[];
          if (purpose === 'airport') candidates = Array.from({ length: 32 }, (_, i) => i).filter((i) => i !== 24);
          else if (purpose === 'force_sale') candidates = theirs;
          else candidates = mine;
          pending = { kind: 'choose_tile', purpose, candidates, optional: true };
          break;
        }
        case 6:
          pending = { kind: 'card', cardId: 'viral' };
          break;
        case 7:
          pending = { kind: 'raise_funds', amount: cash + rng.int(1500), creditorId: rng.chance(0.5) ? 'p2' : null, reason: 'toll' };
          break;
        default:
          pending = { kind: 'end_turn', extraRoll: false };
      }
      const s = makeState({
        owned,
        pending,
        festivalTile: rng.chance(0.3) ? rng.pick(props) : null,
        doublesInRow: rng.int(3),
        turnCount: n,
        players: [
          { position: pos, cash, laps: rng.int(3), cards: rng.chance(0.3) ? ['shield'] : [] },
          { position: rng.int(32), islandTurns: rng.chance(0.2) ? 2 : 0 },
          { position: rng.int(32), pendingFlight: rng.chance(0.1) },
        ],
      });
      for (const level of LEVELS) {
        const st = withLevel(s, level);
        const a = planBotAction(st);
        if (!isLegalAction(st, a)) throw new Error(`illegal ${JSON.stringify(a)} for ${JSON.stringify(pending)} (${level})`);
        expect(decideBotAction(st)).toEqual(a);
      }
    }
  });
});
