/**
 * Dice gauge + island decisions.
 */
import { parityChargesOf } from '@/engine/economy';
import type { Action, Parity, Pending } from '@/engine/types';
import type { BotContext } from '../context';
import { TARGET_SUMS, doubleProbability, powerForTarget, rollOutcomesWithParity } from '../dice';
import { sedangReserve, spendRisk } from '../risk';
import { simpleTileScore } from '../simple';
import {
  ESCAPE_CARD_VALUE,
  bestRollTarget,
  isThirdDoubleRisk,
  islandValue,
  landingValue,
  memoTileValue,
  rollValue,
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

const PARITIES: (Parity | undefined)[] = [undefined, 'genap', 'ganjil'];
/** A Genap/Ganjil charge is scarce: only spend it when it beats the plain roll by this much EV. */
const PARITY_MIN_GAIN = 12;

/** Best (gauge power, Genap/Ganjil pick) for a roll from `from`, by expected landing value. */
function bestRoll(
  from: number,
  valueAt: TileValueFn,
  model: RollModel,
  canPick: boolean,
): { power: number; parity?: Parity; ev: number } {
  let plain: { power: number; ev: number } = { power: 0.5, ev: -Infinity };
  let picked: { power: number; parity?: Parity; ev: number } = { power: 0.5, ev: -Infinity };
  for (const parity of canPick ? PARITIES : [undefined]) {
    for (const target of TARGET_SUMS) {
      const power = powerForTarget(target);
      const ev = rollValue(from, rollOutcomesWithParity(power, parity), valueAt, model);
      if (!parity && ev > plain.ev + 1e-9) plain = { power, ev };
      if (parity && ev > picked.ev + 1e-9) picked = { power, parity, ev };
    }
  }
  return picked.ev > plain.ev + PARITY_MIN_GAIN ? picked : plain;
}

/** Gauge power + Genap/Ganjil pick for a normal roll. */
export function chooseRoll(ctx: BotContext): { power: number; parity?: Parity } {
  const from = ctx.me.position;
  const canPick = parityChargesOf(ctx.me) > 0;
  switch (ctx.level) {
    case 'mudah': {
      const parity: Parity | undefined =
        canPick && ctx.rng.chance(0.2) ? (ctx.rng.chance(0.5) ? 'genap' : 'ganjil') : undefined;
      return { power: round3(ctx.rng.next()), parity };
    }
    case 'sedang': {
      if (ctx.rng.chance(0.25)) return { power: round3(ctx.rng.next()) };
      const best = bestRoll(from, simpleValueFn(ctx), normalModel(ctx), canPick);
      return { power: best.power, parity: best.parity };
    }
    default: {
      const best = bestRoll(from, strongValueFn(ctx), normalModel(ctx), canPick);
      return { power: best.power, parity: best.parity };
    }
  }
}

/** Gauge power for a normal roll (kept for callers that only need the power). */
export function chooseRollPower(ctx: BotContext): number {
  return chooseRoll(ctx).power;
}

export function decideRoll(ctx: BotContext): Action {
  const { power, parity } = chooseRoll(ctx);
  return parity ? { type: 'ROLL', power, parity } : { type: 'ROLL', power };
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
