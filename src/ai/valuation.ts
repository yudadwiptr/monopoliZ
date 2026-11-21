/**
 * Utility estimates (in juta-equivalent) used by the strong bot and, in simplified form, by the others:
 * toll income, purchase/upgrade/takeover utility, and the value of landing on a tile.
 */
import {
  LANDMARK_LEVEL,
  MAX_DOUBLES,
  acquirePrice,
  applyDiscount,
  buildCap,
  investedValue,
  levelCost,
  purchaseCost,
  sellValue,
  tollAt,
  upgradeCost,
} from '@/engine/economy';
import { checkMonopolyWin } from '@/engine/selectors';
import { BOARD_SIZE } from '@/data/layout';
import type { TileState } from '@/engine/types';
import type { BotContext } from './context';
import { rollOutcomes, type DiceOutcome } from './dice';
import { riskCost } from './risk';
import { WIN_VALUE, strategicDelta, withTile } from './strategy';

/** Average chance a given tile is landed on by one player during one turn (~1 / average move). */
export const BASE_LAND_RATE = 0.13;
/** Toll income is uncertain (takeovers, game end, forced sales): discount it. */
export const INCOME_DISCOUNT = 0.6;
/** Cash tied up in property can't be used for better chances later. */
export const OPPORTUNITY_RATE = 0.05;
export const DISCOUNT_CARD_VALUE = 40;
export const SHIELD_CARD_VALUE = 60;
export const ESCAPE_CARD_VALUE = 70;
export const CHANCE_VALUE = 15;
export const AIRPORT_VALUE = 60;
/** A landmark can't be taken over: worth a slice of its invested value. */
export const LANDMARK_PROTECTION_RATE = 0.15;

export interface LevelOption {
  level: number;
  cost: number;
  utility: number;
}

/** Expected opponent landings on `tile` over `horizon` rounds. */
export function expectedLandings(ctx: BotContext, tile: number, horizon = ctx.horizon): number {
  return ctx.opponentNextLanding(tile) + Math.max(0, horizon - 1) * ctx.opponents.length * BASE_LAND_RATE;
}

/** Tiles whose toll can change when `tile` changes hands (tourist tolls depend on how many you own). */
function affectedTiles(ctx: BotContext, tile: number): number[] {
  if (ctx.defs[tile]?.kind !== 'tourist') return [tile];
  return ctx.defs.filter((d) => d.kind === 'tourist').map((d) => d.index);
}

/** Change in the bot's discounted toll income when the board goes from `before` to `after`. */
export function incomeDelta(
  ctx: BotContext,
  before: TileState[],
  after: TileState[],
  tile: number,
  horizon = ctx.horizon,
): number {
  const fest = ctx.state.festivalTile;
  let delta = 0;
  for (const i of affectedTiles(ctx, tile)) {
    const tb = before[i]?.owner === ctx.me.id ? tollAt(ctx.defs, before, i, fest) : 0;
    const ta = after[i]?.owner === ctx.me.id ? tollAt(ctx.defs, after, i, fest) : 0;
    if (ta !== tb) delta += (ta - tb) * expectedLandings(ctx, i, horizon);
  }
  return delta * INCOME_DISCOUNT;
}

interface SpendOpts {
  /** Cash available at decision time (may include salary just collected). */
  cash?: number;
  /** Where the bot will roll from next. */
  from?: number;
  /** Board to evaluate against (defaults to the live board). */
  tiles?: TileState[];
}

function riskDelta(ctx: BotContext, from: number, cash: number, spend: number, liqGain: number): number {
  const liq = ctx.liquidation();
  return riskCost(ctx, from, cash - spend, liq + liqGain) - riskCost(ctx, from, cash, liq);
}

/** Utility of buying an unowned tile at each affordable level (strong-bot model). */
export function purchaseOptions(
  ctx: BotContext,
  tile: number,
  maxLevel: number,
  discount: boolean,
  opts: SpendOpts = {},
): LevelOption[] {
  const def = ctx.defs[tile];
  const cash = opts.cash ?? ctx.me.cash;
  const from = opts.from ?? tile;
  const before = opts.tiles ?? ctx.state.tiles;
  const top = def.kind === 'tourist' ? 0 : maxLevel;
  const strategic = strategicDelta(ctx, before, withTile(before, tile, ctx.me.id, 0));
  const out: LevelOption[] = [];
  for (let level = 0; level <= top; level++) {
    const cost = applyDiscount(purchaseCost(def, level), discount);
    if (cost > cash) break;
    const after = withTile(before, tile, ctx.me.id, level);
    const income = incomeDelta(ctx, before, after, tile);
    const risk = riskDelta(ctx, from, cash, cost, sellValue(def, level));
    const utility =
      strategic + income - risk - OPPORTUNITY_RATE * cost - (discount ? DISCOUNT_CARD_VALUE : 0);
    out.push({ level, cost, utility });
  }
  return out;
}

/** Utility of upgrading an own city from `fromLevel` to each affordable level up to `maxLevel`. */
export function buildOptions(
  ctx: BotContext,
  tile: number,
  fromLevel: number,
  maxLevel: number,
  discount: boolean,
  opts: SpendOpts = {},
): LevelOption[] {
  const def = ctx.defs[tile];
  if (def.kind !== 'city') return [];
  const cash = opts.cash ?? ctx.me.cash;
  const from = opts.from ?? tile;
  const before = opts.tiles ?? ctx.state.tiles;
  const out: LevelOption[] = [];
  for (let level = fromLevel + 1; level <= maxLevel; level++) {
    const cost = applyDiscount(upgradeCost(def, fromLevel, level), discount);
    if (cost > cash) break;
    const after = withTile(before, tile, ctx.me.id, level);
    const income = incomeDelta(ctx, before, after, tile);
    let strategic = 0;
    if (level >= LANDMARK_LEVEL) {
      strategic = strategicDelta(ctx, before, after) + LANDMARK_PROTECTION_RATE * investedValue(def, level);
    }
    const risk = riskDelta(ctx, from, cash, cost, sellValue(def, level) - sellValue(def, fromLevel));
    const utility =
      strategic + income - risk - OPPORTUNITY_RATE * cost - (discount ? DISCOUNT_CARD_VALUE : 0);
    out.push({ level, cost, utility });
  }
  return out;
}

export function bestOption(options: LevelOption[]): LevelOption | null {
  let best: LevelOption | null = null;
  for (const o of options) if (!best || o.utility > best.utility) best = o;
  return best;
}

/** Utility of taking over an opponent's tile for `price` (strong-bot model). */
export function acquireUtility(ctx: BotContext, tile: number, price: number, opts: SpendOpts = {}): number {
  const cash = opts.cash ?? ctx.me.cash;
  if (price > cash) return -Infinity;
  const from = opts.from ?? tile;
  const before = opts.tiles ?? ctx.state.tiles;
  const t = before[tile];
  const def = ctx.defs[tile];
  if (!t?.owner || t.owner === ctx.me.id || t.level >= LANDMARK_LEVEL) return -Infinity;
  const after = withTile(before, tile, ctx.me.id, t.level);
  if (checkMonopolyWin(ctx.map, after, ctx.me.id)) return WIN_VALUE;

  const strategic = strategicDelta(ctx, before, after);
  // Our new income, plus the owner losing theirs, plus tolls we no longer pay there ourselves.
  const income = incomeDelta(ctx, before, after, tile) * 1.3;
  const tollHere = tollAt(ctx.defs, before, tile, ctx.state.festivalTile);
  const savedTolls = tollHere * BASE_LAND_RATE * ctx.horizon * INCOME_DISCOUNT;
  // We pay 2× invested for a tile worth 1× invested; the owner pockets the difference.
  const assetLoss = (price - investedValue(def, t.level)) * (1 + 1 / Math.max(1, ctx.opponents.length));
  const risk = riskDelta(ctx, from, cash, price, sellValue(def, t.level));
  return strategic + income + savedTolls - assetLoss - risk - OPPORTUNITY_RATE * price;
}

/** Mean cost per landing over the whole board — how dangerous walking around is right now. */
export function boardDanger(ctx: BotContext): number {
  let sum = 0;
  for (let i = 0; i < BOARD_SIZE; i++) sum += ctx.landingCost(i);
  return sum / BOARD_SIZE;
}

/** Value of being parked on the island for a while (negative early, positive on a deadly board). */
export function islandValue(ctx: BotContext): number {
  return 1.5 * (boardDanger(ctx) - 0.22 * ctx.salary);
}

/** Value of the festival-corner choice: best extra toll from hosting on one of our properties. */
export function festivalHostGain(ctx: BotContext, tile: number, horizon = 3): number {
  const t = ctx.state.tiles[tile];
  if (!t || t.owner !== ctx.me.id) return 0;
  const base = tollAt(ctx.defs, ctx.state.tiles, tile, null);
  const already = ctx.state.festivalTile === tile ? base : 0;
  return (base - already) * expectedLandings(ctx, tile, horizon) * INCOME_DISCOUNT;
}

function festivalCornerValue(ctx: BotContext): number {
  let best = 0;
  ctx.state.tiles.forEach((t, i) => {
    if (t.owner === ctx.me.id) best = Math.max(best, festivalHostGain(ctx, i));
  });
  return best;
}

/** Best paid one-level upgrade available on landing exactly on start. */
function startUpgradeValue(ctx: BotContext, cash: number, laps: number): number {
  let best = 0;
  ctx.state.tiles.forEach((t, i) => {
    if (t.owner !== ctx.me.id || ctx.defs[i].kind !== 'city' || t.level >= LANDMARK_LEVEL) return;
    if (buildCap(laps, t.level) <= t.level) return;
    if (levelCost(ctx.defs[i], t.level + 1) > cash) return;
    const opt = buildOptions(ctx, i, t.level, t.level + 1, false, { cash, from: 0 })[0];
    if (opt) best = Math.max(best, opt.utility);
  });
  return best;
}

export interface LandingOpts {
  /** Tiles walked (for the progress value); 0 for jumps. */
  steps: number;
  /** Salary is collected on the way. */
  passStart: boolean;
}

/** Strong-bot value of ending a move on `tile` (relative to staying put). */
export function landingValue(ctx: BotContext, tile: number, opts: LandingOpts): number {
  const idx = ((tile % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  const def = ctx.defs[idx];
  const t = ctx.state.tiles[idx];
  const me = ctx.me;
  const cash = me.cash + (opts.passStart ? ctx.salary : 0);
  const laps = me.laps + (opts.passStart ? 1 : 0);
  let v = (opts.steps * ctx.salary) / BOARD_SIZE;

  switch (def.kind) {
    case 'city':
    case 'tourist': {
      if (!t?.owner) {
        const maxLevel = def.kind === 'tourist' ? 0 : buildCap(laps, -1);
        const best = bestOption(purchaseOptions(ctx, idx, maxLevel, ctx.hasCard('discount'), { cash, from: idx }));
        if (best) v += Math.max(0, best.utility);
      } else if (t.owner === me.id) {
        if (def.kind === 'city') {
          const cap = buildCap(laps, t.level);
          if (cap > t.level) {
            const best = bestOption(buildOptions(ctx, idx, t.level, cap, ctx.hasCard('discount'), { cash, from: idx }));
            if (best) v += Math.max(0, best.utility);
          }
        }
      } else {
        const toll = ctx.landingCost(idx);
        const shield = ctx.hasCard('shield') && toll > 0;
        const paid = shield ? 0 : toll;
        v -= shield ? Math.min(toll, SHIELD_CARD_VALUE) : toll;
        const short = paid - cash;
        if (short > ctx.liquidation()) v -= 20_000;
        else if (short > 0) v -= short;
        if (t.level < LANDMARK_LEVEL) {
          const price = acquirePrice(def, t.level);
          const left = cash - paid;
          if (left >= price) {
            const u = acquireUtility(ctx, idx, price, { cash: left, from: idx });
            if (u > 0) v += u;
          }
        }
      }
      break;
    }
    case 'chance':
      v += CHANCE_VALUE;
      break;
    case 'tax':
      v -= ctx.landingCost(idx);
      break;
    case 'start':
      v += startUpgradeValue(ctx, cash, laps);
      break;
    case 'island':
      v += islandValue(ctx);
      break;
    case 'festival':
      v += festivalCornerValue(ctx);
      break;
    case 'airport':
      v += AIRPORT_VALUE;
      break;
  }
  return v;
}

export type TileValueFn = (tile: number, opts: LandingOpts) => number;

export interface RollModel {
  /** Doubles on this roll send us straight to the island (3rd double). */
  islandOnDouble?: boolean;
  /** Island roll: only doubles move us (non-doubles mean staying, value 0). */
  stayUnlessDouble?: boolean;
  /** Value of being jailed by a 3rd double. */
  jailValue?: number;
}

/** Expected value of rolling from `from` with the given outcome distribution. */
export function rollValue(
  from: number,
  outcomes: readonly DiceOutcome[],
  valueAt: TileValueFn,
  model: RollModel = {},
): number {
  let ev = 0;
  for (const o of outcomes) {
    let v: number;
    if (model.islandOnDouble && o.double) v = model.jailValue ?? 0;
    else if (model.stayUnlessDouble && !o.double) v = 0;
    else v = valueAt(from + o.sum, { steps: o.sum, passStart: from + o.sum >= BOARD_SIZE });
    ev += o.p * v;
  }
  return ev;
}

/** Memoises a tile-value function by (tile, steps, passStart). */
export function memoTileValue(fn: TileValueFn): TileValueFn {
  const memo = new Map<string, number>();
  return (tile, opts) => {
    const key = `${tile}:${opts.steps}:${opts.passStart}`;
    let v = memo.get(key);
    if (v === undefined) {
      v = fn(tile, opts);
      memo.set(key, v);
    }
    return v;
  };
}

/** Best gauge target for a roll from `from`; returns the target sum and its EV. */
export function bestRollTarget(
  from: number,
  targets: readonly number[],
  valueAt: TileValueFn,
  model: RollModel = {},
  powerOf: (target: number) => number,
): { target: number; ev: number } {
  let best = { target: 7, ev: -Infinity };
  for (const target of targets) {
    const ev = rollValue(from, rollOutcomes(powerOf(target)), valueAt, model);
    if (ev > best.ev + 1e-9) best = { target, ev };
  }
  return best;
}

export function isThirdDoubleRisk(doublesInRow: number): boolean {
  return doublesInRow >= MAX_DOUBLES - 1;
}
