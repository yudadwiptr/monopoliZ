/**
 * Cash-risk model: what landing on the tiles ahead might cost, and how much a given cash level is worth
 * keeping as a buffer.
 */
import { BOARD_SIZE } from '@/data/layout';
import type { BotContext } from './context';
import { MAX_SUM, MIN_SUM, RANDOM_SUM_PROB } from './dice';

/** Each juta we are short is covered by selling property at half price → roughly 1:1 asset loss. */
export const SHORTFALL_RATE = 1;
/** Going bankrupt loses the game. */
export const BANKRUPT_PENALTY = 20_000;
/** Weight of the turn after next in the risk estimate. */
const SECOND_TURN_WEIGHT = 0.5;

export interface Exposure {
  /** Probability-weighted cost of the next landing. */
  expected: number;
  /** Highest cost reachable with 2..12 steps. */
  max: number;
  /** 90th percentile cost of the next landing. */
  p90: number;
}

/** Cost of the next landing from `from` (pure random roll), ignoring salary. */
export function exposure(ctx: BotContext, from: number): Exposure {
  let expected = 0;
  let max = 0;
  const costs: { c: number; p: number }[] = [];
  for (let s = MIN_SUM; s <= MAX_SUM; s++) {
    const c = ctx.landingCost(from + s);
    const p = RANDOM_SUM_PROB[s];
    expected += c * p;
    max = Math.max(max, c);
    costs.push({ c, p });
  }
  costs.sort((a, b) => b.c - a.c);
  let tail = 0;
  let p90 = 0;
  for (const { c, p } of costs) {
    tail += p;
    p90 = c;
    if (tail >= 0.1) break;
  }
  return { expected, max, p90 };
}

/** Highest toll/tax within dice reach (2..12) of `from`. */
export function maxCostAhead(ctx: BotContext, from: number): number {
  return exposure(ctx, from).max;
}

function penalty(deficit: number, liquidation: number): number {
  if (deficit <= 0) return 0;
  if (deficit > liquidation) return BANKRUPT_PENALTY;
  return deficit * SHORTFALL_RATE;
}

/**
 * Expected loss from being short on cash over the next two own turns, starting at `from`
 * with `cash` in hand and `liquidation` raisable by selling. Salary when passing start is counted.
 */
export function riskCost(ctx: BotContext, from: number, cash: number, liquidation: number): number {
  const shield = ctx.hasCard('shield');
  let risk = 0;
  for (let s1 = MIN_SUM; s1 <= MAX_SUM; s1++) {
    const p1 = RANDOM_SUM_PROB[s1];
    const pos1 = from + s1;
    const sal1 = pos1 >= BOARD_SIZE ? ctx.salary : 0;
    const raw1 = ctx.landingCost(pos1);
    const isToll1 = ctx.defs[pos1 % BOARD_SIZE]?.kind !== 'tax';
    const c1 = shield && isToll1 ? 0 : raw1;
    const pen1 = penalty(c1 - cash - sal1, liquidation);
    let second = 0;
    if (pen1 < BANKRUPT_PENALTY) {
      const shieldLeft = shield && !(isToll1 && raw1 > 0);
      for (let s2 = MIN_SUM; s2 <= MAX_SUM; s2++) {
        const pos2 = pos1 + s2;
        const sal2 = Math.floor(pos2 / BOARD_SIZE) > Math.floor(pos1 / BOARD_SIZE) ? ctx.salary : 0;
        const raw2 = ctx.landingCost(pos2);
        const isToll2 = ctx.defs[pos2 % BOARD_SIZE]?.kind !== 'tax';
        const c2 = shieldLeft && isToll2 ? 0 : raw2;
        second += RANDOM_SUM_PROB[s2] * (penalty(c1 + c2 - cash - sal1 - sal2, liquidation) - pen1);
      }
    }
    risk += p1 * (pen1 + SECOND_TURN_WEIGHT * Math.max(0, second));
  }
  return risk;
}

/** Extra risk caused by spending `spend` now and adding `liquidationGain` to what we could sell later. */
export function spendRisk(ctx: BotContext, from: number, spend: number, liquidationGain = 0): number {
  const cash = ctx.me.cash;
  const liq = ctx.liquidation();
  return riskCost(ctx, from, cash - spend, liq + liquidationGain) - riskCost(ctx, from, cash, liq);
}

/** Rule-based reserve used by the 'sedang' bot: proportional to the biggest toll within reach. */
export function sedangReserve(ctx: BotContext, from: number): number {
  return Math.round(0.6 * maxCostAhead(ctx, from) + 40);
}

/** Tiny buffer for the casual bot. */
export function mudahReserve(ctx: BotContext, from: number): number {
  return Math.round(0.15 * maxCostAhead(ctx, from) + 20);
}
