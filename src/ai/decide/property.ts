/**
 * Buy / build / acquire decisions.
 */
import {
  LANDMARK_LEVEL,
  applyDiscount,
  purchaseCost,
  upgradeCost,
} from '@/engine/economy';
import { groupTiles, touristTiles } from '@/engine/selectors';
import { tileSide } from '@/data/layout';
import type { Action, Pending } from '@/engine/types';
import type { BotContext } from '../context';
import { mudahReserve, sedangReserve } from '../risk';
import { threatCount, threatTiles, winsByOwning, withTile } from '../strategy';
import { acquireUtility, bestOption, buildOptions, purchaseOptions } from '../valuation';

type BuyPending = Extract<Pending, { kind: 'buy' }>;
type BuildPending = Extract<Pending, { kind: 'build' }>;
type AcquirePending = Extract<Pending, { kind: 'acquire' }>;

const SKIP: Action = { type: 'SKIP' };

/** Highest level in [from, to] whose cost keeps at least `keep` cash, or -1. */
function highestKeeping(cash: number, from: number, to: number, cost: (level: number) => number, keep: number): number {
  let best = -1;
  for (let level = from; level <= to; level++) if (cash - cost(level) >= keep) best = level;
  return best;
}

/** Do we already hold part of the colour group / tourist set / side this tile belongs to? */
export function buildsOnHoldings(ctx: BotContext, tile: number): boolean {
  const def = ctx.defs[tile];
  const mine = (i: number) => i !== tile && ctx.state.tiles[i]?.owner === ctx.me.id;
  if (def.kind === 'city' && def.group !== undefined && groupTiles(ctx.map, def.group).some(mine)) return true;
  if (def.kind === 'tourist' && touristTiles(ctx.map).some(mine)) return true;
  const side = tileSide(tile);
  if (side < 0) return false;
  const sideOwned = ctx.state.tiles.filter((t, i) => tileSide(i) === side && t.owner === ctx.me.id && i !== tile).length;
  return sideOwned >= 3;
}

export function decideBuy(ctx: BotContext, p: BuyPending): Action {
  const def = ctx.defs[p.tile];
  const cash = ctx.me.cash;
  const top = def.kind === 'tourist' ? 0 : Math.max(0, p.maxLevel);
  const cost = (level: number) => applyDiscount(purchaseCost(def, level), p.discount);
  if (cost(0) > cash) return SKIP;
  if (winsByOwning(ctx, p.tile)) return { type: 'BUY', level: 0 };

  switch (ctx.level) {
    case 'mudah': {
      if (!ctx.rng.chance(0.85)) return SKIP;
      const maxOk = highestKeeping(cash, 0, top, cost, mudahReserve(ctx, p.tile));
      if (maxOk < 0) return ctx.rng.chance(0.4) ? { type: 'BUY', level: 0 } : SKIP;
      return { type: 'BUY', level: ctx.rng.int(maxOk + 1) };
    }
    case 'sedang': {
      const reserve = sedangReserve(ctx, p.tile);
      const blocks = threatTiles(ctx).has(p.tile);
      const keep = blocks ? 0 : buildsOnHoldings(ctx, p.tile) ? reserve * 0.5 : reserve;
      const level = highestKeeping(cash, 0, top, cost, keep);
      if (level < 0) return SKIP;
      // Blocking: grab the land, build only if the reserve still allows it.
      if (blocks) return { type: 'BUY', level: Math.max(0, highestKeeping(cash, 0, top, cost, reserve * 0.5)) };
      return { type: 'BUY', level };
    }
    default: {
      const best = bestOption(purchaseOptions(ctx, p.tile, top, p.discount));
      return best && best.utility > 0 ? { type: 'BUY', level: best.level } : SKIP;
    }
  }
}

export function decideBuild(ctx: BotContext, p: BuildPending): Action {
  const def = ctx.defs[p.tile];
  const cash = ctx.me.cash;
  const cost = (level: number) => applyDiscount(upgradeCost(def, p.fromLevel, level), p.discount);
  const lo = p.fromLevel + 1;
  if (p.maxLevel < lo || cost(lo) > cash) return SKIP;

  switch (ctx.level) {
    case 'mudah': {
      if (ctx.rng.chance(0.35)) return SKIP;
      const maxOk = highestKeeping(cash, lo, p.maxLevel, cost, mudahReserve(ctx, p.tile));
      if (maxOk < 0) return SKIP;
      return { type: 'BUILD', level: lo + ctx.rng.int(maxOk - lo + 1) };
    }
    case 'sedang': {
      const reserve = sedangReserve(ctx, p.tile);
      // An opponent needs this tile for a monopoly → a landmark makes it untouchable.
      const contested = threatTiles(ctx).has(p.tile) && p.maxLevel >= LANDMARK_LEVEL;
      const level = highestKeeping(cash, lo, p.maxLevel, cost, contested ? reserve * 0.3 : reserve);
      return level < 0 ? SKIP : { type: 'BUILD', level };
    }
    default: {
      const best = bestOption(buildOptions(ctx, p.tile, p.fromLevel, p.maxLevel, p.discount));
      return best && best.utility > 0 ? { type: 'BUILD', level: best.level } : SKIP;
    }
  }
}

function completesGroup(ctx: BotContext, tile: number): boolean {
  const def = ctx.defs[tile];
  if (def.kind !== 'city' || def.group === undefined) return false;
  return groupTiles(ctx.map, def.group).every((i) => i === tile || ctx.state.tiles[i]?.owner === ctx.me.id);
}

export function decideAcquire(ctx: BotContext, p: AcquirePending): Action {
  const cash = ctx.me.cash;
  if (p.price > cash) return SKIP;
  if (winsByOwning(ctx, p.tile)) return { type: 'ACQUIRE' };
  const t = ctx.state.tiles[p.tile];
  if (!t) return SKIP;

  switch (ctx.level) {
    case 'mudah':
      return ctx.rng.chance(0.08) && cash - p.price > 400 ? { type: 'ACQUIRE' } : SKIP;
    case 'sedang': {
      const reserve = sedangReserve(ctx, p.tile);
      const before = ctx.state.tiles;
      const after = withTile(before, p.tile, ctx.me.id, t.level);
      const left = cash - p.price;
      const blocks = threatCount(ctx.map, after, p.ownerId) < threatCount(ctx.map, before, p.ownerId);
      if (blocks && left >= reserve * 0.3) return { type: 'ACQUIRE' };
      const creates =
        threatCount(ctx.map, after, ctx.me.id) > threatCount(ctx.map, before, ctx.me.id) || completesGroup(ctx, p.tile);
      if (creates && left >= reserve * 0.6) return { type: 'ACQUIRE' };
      const highValue = t.level >= 2 || (ctx.defs[p.tile].kind === 'tourist' && buildsOnHoldings(ctx, p.tile));
      if (highValue && left >= reserve + 200) return { type: 'ACQUIRE' };
      return SKIP;
    }
    default:
      return acquireUtility(ctx, p.tile, p.price) > 0 ? { type: 'ACQUIRE' } : SKIP;
  }
}
