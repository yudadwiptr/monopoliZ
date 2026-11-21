/**
 * Rule-of-thumb tile scores for the 'sedang' bot (and the odd 'mudah' choice): cheap, readable, decent.
 */
import { LANDMARK_LEVEL, buildCap, levelCost, tollAt } from '@/engine/economy';
import { BOARD_SIZE } from '@/data/layout';
import type { BotContext } from './context';
import { winsByOwning } from './strategy';

/** Quick desirability of landing on `tile` given the cash we'd have. */
export function simpleTileScore(ctx: BotContext, tile: number, cash: number, reserve: number): number {
  const idx = ((tile % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  const def = ctx.defs[idx];
  const t = ctx.state.tiles[idx];
  const price = def.price ?? 0;
  switch (def.kind) {
    case 'city':
    case 'tourist': {
      if (!t?.owner) {
        if (price > cash) return 0;
        if (winsByOwning(ctx, idx)) return 5000;
        return price <= cash - reserve ? 0.6 * price : 0.15 * price;
      }
      if (t.owner === ctx.me.id) {
        if (def.kind !== 'city' || t.level >= LANDMARK_LEVEL) return 0;
        const cap = buildCap(ctx.me.laps, t.level);
        if (cap <= t.level || levelCost(def, t.level + 1) > cash) return 0;
        return t.level === LANDMARK_LEVEL - 1 ? price : 0.4 * price;
      }
      const toll = tollAt(ctx.defs, ctx.state.tiles, idx, ctx.state.festivalTile);
      return toll > cash ? -1.5 * toll : -toll;
    }
    case 'chance':
      return 10;
    case 'tax':
      return -ctx.landingCost(idx);
    case 'island':
      return -50;
    case 'festival':
      return ctx.state.tiles.some((x) => x.owner === ctx.me.id) ? 30 : 0;
    case 'airport':
      return 40;
    case 'start':
      return 20;
  }
  return 0;
}

/** Toll a property of ours would charge if it hosted the festival (tourist tolls by count). */
export function hostToll(ctx: BotContext, tile: number): number {
  return tollAt(ctx.defs, ctx.state.tiles, tile, tile);
}

/** Toll increase from raising one of our cities by one level. */
export function tollGainOneLevel(ctx: BotContext, tile: number): number {
  const t = ctx.state.tiles[tile];
  if (!t) return 0;
  const before = tollAt(ctx.defs, ctx.state.tiles, tile, ctx.state.festivalTile);
  const next = ctx.state.tiles.slice();
  next[tile] = { owner: t.owner, level: t.level + 1 };
  return tollAt(ctx.defs, next, tile, ctx.state.festivalTile) - before;
}
