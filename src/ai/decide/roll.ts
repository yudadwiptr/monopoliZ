/**
 * Dice gauge + island decisions.
 */
import type { Action, Pending } from '@/engine/types';
import type { BotContext } from '../context';
import { TARGET_SUMS, doubleProbability, powerForTarget } from '../dice';
import { sedangReserve, spendRisk } from '../risk';
import { simpleTileScore } from '../simple';
import {
  ESCAPE_CARD_VALUE,
  bestRollTarget,
  isThirdDoubleRisk,
  islandValue,
  landingValue,
  memoTileValue,
  type RollModel,
  type TileValueFn,
} from '../valuation';

type IslandPending = Extract<Pending, { kind: 'island' }>;

function strongValueFn(ctx: BotContext): TileValueFn {
  return memoTileValue((tile, opts) => landingValue(ctx, tile, opts));
}

function simpleValueFn(ctx: BotContext): TileValueFn {
  const reserve = sedangReserve(ctx, ctx.me.position);
  return (tile, opts) =>
    simpleTileScore(ctx, tile, ctx.me.cash + (opts.passStart ? ctx.salary : 0), reserve) +
    (opts.steps * ctx.salary) / 64;
}

function normalModel(ctx: BotContext): RollModel {
  return isThirdDoubleRisk(ctx.state.doublesInRow)
    ? { islandOnDouble: true, jailValue: ctx.level === 'sulit' ? islandValue(ctx) : -60 }
    : {};
}

/** Gauge power for a normal roll. */
export function chooseRollPower(ctx: BotContext): number {
  const from = ctx.me.position;
  switch (ctx.level) {
    case 'mudah':
      return round3(ctx.rng.next());
    case 'sedang': {
      if (ctx.rng.chance(0.25)) return round3(ctx.rng.next());
      const best = bestRollTarget(from, TARGET_SUMS, simpleValueFn(ctx), normalModel(ctx), powerForTarget);
      return powerForTarget(best.target);
    }
    default: {
      const best = bestRollTarget(from, TARGET_SUMS, strongValueFn(ctx), normalModel(ctx), powerForTarget);
      return powerForTarget(best.target);
    }
  }
}

export function decideRoll(ctx: BotContext): Action {
  return { type: 'ROLL', power: chooseRollPower(ctx) };
}

/** Power that maximises the chance of rolling doubles (escape attempt). */
function bestDoublesPower(): number {
  let best = { power: 0.5, p: -1 };
  for (const target of TARGET_SUMS) {
    const power = powerForTarget(target);
    const p = doubleProbability(power);
    if (p > best.p) best = { power, p };
  }
  return best.power;
}

export function decideIsland(ctx: BotContext, pending: IslandPending): Action {
  const from = ctx.me.position;
  const lastChance = pending.turnsLeft <= 1;
  const stayModel: RollModel = lastChance ? {} : { stayUnlessDouble: true };

  if (ctx.level === 'mudah') {
    if (pending.hasCard && ctx.rng.chance(0.5)) return { type: 'USE_ESCAPE_CARD' };
    if (pending.canPay && ctx.me.cash - pending.fee > 500 && ctx.rng.chance(0.35)) return { type: 'PAY_ESCAPE' };
    return { type: 'ROLL', power: round3(ctx.rng.next()) };
  }

  if (ctx.level === 'sedang') {
    const valueAt = simpleValueFn(ctx);
    const out = bestRollTarget(from, TARGET_SUMS, valueAt, {}, powerForTarget);
    const attractive = out.ev > 25;
    const reserve = sedangReserve(ctx, from);
    if (attractive && !lastChance) {
      if (pending.hasCard) return { type: 'USE_ESCAPE_CARD' };
      if (pending.canPay && ctx.me.cash - pending.fee >= reserve + 150) return { type: 'PAY_ESCAPE' };
    }
    if (lastChance) {
      return { type: 'ROLL', power: powerForTarget(out.target) };
    }
    return { type: 'ROLL', power: attractive ? bestDoublesPower() : 0.5 };
  }

  // sulit: compare the value of leaving now (normal turn) against rolling for doubles.
  const valueAt = strongValueFn(ctx);
  const leave = bestRollTarget(from, TARGET_SUMS, valueAt, {}, powerForTarget);
  const stay = bestRollTarget(from, TARGET_SUMS, valueAt, stayModel, powerForTarget);
  let bestAction: Action = { type: 'ROLL', power: powerForTarget(stay.target) };
  let bestEv = stay.ev;
  if (!lastChance) {
    if (pending.hasCard && leave.ev - ESCAPE_CARD_VALUE > bestEv) {
      bestAction = { type: 'USE_ESCAPE_CARD' };
      bestEv = leave.ev - ESCAPE_CARD_VALUE;
    }
    if (pending.canPay) {
      const payEv = leave.ev - pending.fee - feeRisk(ctx, pending.fee);
      if (payEv > bestEv) {
        bestAction = { type: 'PAY_ESCAPE' };
        bestEv = payEv;
      }
    }
  }
  return bestAction;
}

/** Extra cash-risk on the road ahead caused by paying the island fee. */
function feeRisk(ctx: BotContext, fee: number): number {
  return spendRisk(ctx, ctx.me.position, fee);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
