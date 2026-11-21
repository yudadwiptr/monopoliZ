/**
 * choose_tile decisions: airport flight, festival host, start/card upgrade, force sale.
 */
import {
  LANDMARK_LEVEL,
  investedValue,
  levelCost,
  sellValue,
  tollAt,
} from '@/engine/economy';
import { BOARD_SIZE, forwardDistance } from '@/data/layout';
import type { Action, Pending } from '@/engine/types';
import type { BotContext } from '../context';
import { TARGET_SUMS, powerForTarget } from '../dice';
import { sedangReserve } from '../risk';
import { hostToll, simpleTileScore, tollGainOneLevel } from '../simple';
import { strategicDelta, threatCount, threatTiles, winsByOwning, withTile } from '../strategy';
import {
  BASE_LAND_RATE,
  INCOME_DISCOUNT,
  LANDMARK_PROTECTION_RATE,
  bestRollTarget,
  buildOptions,
  expectedLandings,
  festivalHostGain,
  landingValue,
  memoTileValue,
} from '../valuation';
import { buildsOnHoldings } from './property';

type ChoosePending = Extract<Pending, { kind: 'choose_tile' }>;

const SKIP: Action = { type: 'SKIP' };
const choose = (tile: number): Action => ({ type: 'CHOOSE_TILE', tile });

/** Highest-scoring candidate (first wins ties), or null when there are none. */
function argmax(candidates: readonly number[], score: (tile: number) => number): { tile: number; score: number } | null {
  let best: { tile: number; score: number } | null = null;
  for (const tile of candidates) {
    const s = score(tile);
    if (!best || s > best.score) best = { tile, score: s };
  }
  return best;
}

/** Pick something legal when we'd rather not choose. */
function decline(p: ChoosePending): Action {
  if (p.optional || p.candidates.length === 0) return SKIP;
  return choose(p.candidates[0]);
}

export function decideChooseTile(ctx: BotContext, p: ChoosePending): Action {
  if (p.candidates.length === 0) return SKIP;
  switch (p.purpose) {
    case 'airport':
      return decideAirport(ctx, p);
    case 'festival':
    case 'card_festival':
      return decideFestival(ctx, p);
    case 'start_upgrade':
      return decideStartUpgrade(ctx, p);
    case 'card_upgrade':
      return decideCardUpgrade(ctx, p);
    case 'force_sale':
      return decideForceSale(ctx, p);
    default:
      return decline(p);
  }
}

// ───────────────────────────── airport ─────────────────────────────

function flightOpts(from: number, to: number) {
  const steps = forwardDistance(from, to);
  return { steps, passStart: from + steps >= BOARD_SIZE };
}

function decideAirport(ctx: BotContext, p: ChoosePending): Action {
  const from = ctx.me.position;
  const cands = p.candidates;

  if (ctx.level === 'mudah') {
    if (ctx.rng.chance(0.4)) return decline(p);
    const nice = cands.filter((i) => {
      const def = ctx.defs[i];
      const owner = ctx.state.tiles[i]?.owner;
      if (def.kind === 'city' || def.kind === 'tourist') {
        return owner === ctx.me.id || (!owner && (def.price ?? 0) <= ctx.me.cash);
      }
      return def.kind === 'chance' || def.kind === 'start';
    });
    return nice.length > 0 ? choose(ctx.rng.pick(nice)) : decline(p);
  }

  if (ctx.level === 'sedang') {
    const reserve = sedangReserve(ctx, from);
    const threats = threatTiles(ctx);
    const best = argmax(cands, (i) => {
      const { passStart } = flightOpts(from, i);
      const cash = ctx.me.cash + (passStart ? ctx.salary : 0);
      const def = ctx.defs[i];
      const t = ctx.state.tiles[i];
      const price = def.price ?? 0;
      if ((def.kind === 'city' || def.kind === 'tourist') && !t?.owner && price <= cash) {
        if (winsByOwning(ctx, i)) return 10_000;
        if (threats.has(i)) return 3_000;
        if (buildsOnHoldings(ctx, i)) return 200 + price;
      }
      if (def.kind === 'city' && t?.owner === ctx.me.id && t.level === LANDMARK_LEVEL - 1) {
        if (cash - levelCost(def, LANDMARK_LEVEL) >= reserve) return 400 + price;
      }
      return simpleTileScore(ctx, i, cash, reserve) + (passStart ? ctx.salary * 0.5 : 0);
    });
    const roll = bestRollTarget(
      from,
      TARGET_SUMS,
      (tile, o) => simpleTileScore(ctx, tile, ctx.me.cash, reserve) + (o.passStart ? ctx.salary * 0.5 : 0),
      {},
      powerForTarget,
    );
    return best && best.score >= Math.max(80, roll.ev + 40) ? choose(best.tile) : decline(p);
  }

  // sulit: full landing evaluation of every destination vs. the best gauge roll.
  const valueAt = memoTileValue((tile, opts) => landingValue(ctx, tile, opts));
  const best = argmax(cands, (i) => valueAt(i, flightOpts(from, i)));
  const roll = bestRollTarget(from, TARGET_SUMS, valueAt, {}, powerForTarget);
  return best && best.score > roll.ev + 5 ? choose(best.tile) : decline(p);
}

// ───────────────────────────── festival ─────────────────────────────

function decideFestival(ctx: BotContext, p: ChoosePending): Action {
  if (ctx.level === 'mudah') return choose(ctx.rng.pick(p.candidates));
  if (ctx.level === 'sedang') {
    const best = argmax(p.candidates, (i) => hostToll(ctx, i));
    return best ? choose(best.tile) : decline(p);
  }
  const best = argmax(p.candidates, (i) => {
    const owned = ctx.state.tiles[i]?.owner === ctx.me.id;
    // Gain if it's ours; if the engine ever offers non-own tiles, prefer leaving them alone.
    return owned ? festivalHostGain(ctx, i, 3) + tollAt(ctx.defs, ctx.state.tiles, i, i) * 0.01 : -1;
  });
  return best ? choose(best.tile) : decline(p);
}

// ───────────────────────────── upgrades ─────────────────────────────

function decideStartUpgrade(ctx: BotContext, p: ChoosePending): Action {
  const cash = ctx.me.cash;
  const nextCost = (i: number) => levelCost(ctx.defs[i], (ctx.state.tiles[i]?.level ?? 0) + 1);
  const affordable = p.candidates.filter((i) => nextCost(i) <= cash);
  if (affordable.length === 0) return decline(p);

  if (ctx.level === 'mudah') {
    return ctx.rng.chance(0.5) ? choose(ctx.rng.pick(affordable)) : decline(p);
  }
  if (ctx.level === 'sedang') {
    const reserve = sedangReserve(ctx, ctx.me.position);
    const ok = affordable.filter((i) => cash - nextCost(i) >= reserve);
    const best = argmax(ok, (i) => tollGainOneLevel(ctx, i));
    return best ? choose(best.tile) : decline(p);
  }
  // sulit: best utility per juta spent, only if worth it at all.
  let best: { tile: number; ratio: number } | null = null;
  for (const i of affordable) {
    const t = ctx.state.tiles[i];
    if (!t) continue;
    const opt = buildOptions(ctx, i, t.level, t.level + 1, false, { from: ctx.me.position })[0];
    if (!opt || opt.utility <= 0) continue;
    const ratio = opt.utility / Math.max(1, opt.cost);
    if (!best || ratio > best.ratio) best = { tile: i, ratio };
  }
  return best ? choose(best.tile) : decline(p);
}

function decideCardUpgrade(ctx: BotContext, p: ChoosePending): Action {
  if (ctx.level === 'mudah') return choose(ctx.rng.pick(p.candidates));
  if (ctx.level === 'sedang') {
    const best = argmax(p.candidates, (i) => tollGainOneLevel(ctx, i));
    return best ? choose(best.tile) : decline(p);
  }
  const before = ctx.state.tiles;
  const best = argmax(p.candidates, (i) => {
    const t = before[i];
    if (!t || t.owner !== ctx.me.id) return -1;
    const next = t.level + 1;
    let score = tollGainOneLevel(ctx, i) * expectedLandings(ctx, i) * INCOME_DISCOUNT;
    if (next >= LANDMARK_LEVEL) {
      score +=
        strategicDelta(ctx, before, withTile(before, i, ctx.me.id, next)) +
        LANDMARK_PROTECTION_RATE * investedValue(ctx.defs[i], next);
    }
    // Free levels also raise the takeover price (2× invested).
    return score + 0.05 * investedValue(ctx.defs[i], next);
  });
  return best ? choose(best.tile) : decline(p);
}

// ───────────────────────────── force sale ─────────────────────────────

function decideForceSale(ctx: BotContext, p: ChoosePending): Action {
  if (ctx.level === 'mudah') return choose(ctx.rng.pick(p.candidates));
  const before = ctx.state.tiles;
  const fest = ctx.state.festivalTile;

  if (ctx.level === 'sedang') {
    const breaker = argmax(p.candidates, (i) => {
      const owner = before[i]?.owner;
      if (!owner) return 0;
      return threatCount(ctx.map, before, owner) - threatCount(ctx.map, withTile(before, i, null, 0), owner);
    });
    if (breaker && breaker.score > 0) return choose(breaker.tile);
    const best = argmax(p.candidates, (i) => tollAt(ctx.defs, before, i, fest));
    return best ? choose(best.tile) : decline(p);
  }

  const best = argmax(p.candidates, (i) => {
    const t = before[i];
    if (!t?.owner || t.owner === ctx.me.id) return -Infinity;
    const def = ctx.defs[i];
    const strategic = strategicDelta(ctx, before, withTile(before, i, null, 0));
    const danger = tollAt(ctx.defs, before, i, fest) * BASE_LAND_RATE * ctx.horizon * INCOME_DISCOUNT;
    const ownerLoss = 0.3 * (investedValue(def, t.level) - sellValue(def, t.level));
    return strategic + danger + ownerLoss;
  });
  return best ? choose(best.tile) : decline(p);
}
