/**
 * Monopoly strategy: a "potential" score (in juta-equivalent) of how close a player is to any of the three
 * monopoly wins. Differences in potential before/after an ownership change give the strategic value of
 * buying, acquiring, selling or kicking out a tile — both for us and (as denial) for opponents.
 */
import { LANDMARK_LEVEL, MONOPOLY_COLOR_SETS_TO_WIN } from '@/engine/economy';
import { checkMonopolyWin, groupTiles, monopolyThreats, sidePropertyTiles, touristTiles } from '@/engine/selectors';
import type { MapDef, TileState, WinReason } from '@/engine/types';
import type { BotContext } from './context';

/** Value of an immediate monopoly win — dominates every other consideration. */
export const WIN_VALUE = 100_000;
/** Value of being exactly one tile away from a monopoly. */
export const THREAT_VALUE = 1_000;
/** A missing tile owned by someone else must be acquired first: progress is discounted by this per tile. */
export const BLOCK_MULT = 0.35;

interface StructureProgress {
  /** Tiles still missing. */
  missing: number;
  /** Missing tiles owned by other players (acquirable). */
  blocked: number;
  /** A missing tile is another player's landmark → can never be completed. */
  dead: boolean;
}

function structureProgress(tiles: TileState[], indices: number[], playerId: string): StructureProgress {
  let missing = 0;
  let blocked = 0;
  let dead = false;
  for (const i of indices) {
    const t = tiles[i];
    if (t?.owner === playerId) continue;
    missing++;
    if (t?.owner) {
      blocked++;
      if (t.level >= LANDMARK_LEVEL) dead = true;
    }
  }
  return { missing, blocked, dead };
}

/** Value of being `d` tiles away from a structure that starts `maxD` tiles away. */
export function progressValue(d: number, maxD: number): number {
  if (d <= 0) return WIN_VALUE;
  if (d === 1) return THREAT_VALUE;
  if (d >= maxD || maxD <= 1) return 0;
  const f = (maxD - d) / (maxD - 1);
  return 0.6 * THREAT_VALUE * f * f * f;
}

const potentialCache = new WeakMap<TileState[], Map<string, number>>();

export function monopolyPotential(map: MapDef, tiles: TileState[], playerId: string): number {
  let perTiles = potentialCache.get(tiles);
  const key = `${map.id}:${playerId}`;
  const hit = perTiles?.get(key);
  if (hit !== undefined) return hit;
  const value = computePotential(map, tiles, playerId);
  if (!perTiles) {
    perTiles = new Map();
    potentialCache.set(tiles, perTiles);
  }
  perTiles.set(key, value);
  return value;
}

function computePotential(map: MapDef, tiles: TileState[], playerId: string): number {
  if (checkMonopolyWin(map, tiles, playerId)) return WIN_VALUE;
  let pot = 0;

  // Monopoli Wisata
  const tour = touristTiles(map);
  if (tour.length > 0) {
    const s = structureProgress(tiles, tour, playerId);
    if (!s.dead) pot += progressValue(s.missing, tour.length) * BLOCK_MULT ** s.blocked;
  }

  // Monopoli Jalur
  for (let side = 0; side < 4; side++) {
    const st = sidePropertyTiles(map, side);
    if (st.length === 0) continue;
    const s = structureProgress(tiles, st, playerId);
    if (!s.dead) pot += progressValue(s.missing, st.length) * BLOCK_MULT ** s.blocked;
  }

  // Monopoli Triple Warna
  const groups = map.groups.map((g) => {
    const gt = groupTiles(map, g.id);
    return { size: gt.length, ...structureProgress(tiles, gt, playerId) };
  });
  const complete = groups.filter((g) => g.size > 0 && g.missing === 0).length;
  const needed = MONOPOLY_COLOR_SETS_TO_WIN - complete;
  if (needed > 0) {
    const open = groups
      .filter((g) => g.missing > 0 && !g.dead)
      .sort((a, b) => a.missing + a.blocked - (b.missing + b.blocked) || a.blocked - b.blocked);
    if (open.length >= needed) {
      const chosen = open.slice(0, needed);
      const d = chosen.reduce((s, g) => s + g.missing, 0);
      const mult = chosen.reduce((m, g) => m * BLOCK_MULT ** g.blocked, 1);
      const maxD = groups
        .map((g) => g.size)
        .filter((n) => n > 0)
        .sort((a, b) => a - b)
        .slice(0, MONOPOLY_COLOR_SETS_TO_WIN)
        .reduce((s, n) => s + n, 0);
      pot += progressValue(d, maxD) * mult;
    }
  }
  return pot;
}

export function withTile(tiles: TileState[], index: number, owner: string | null, level: number): TileState[] {
  const next = tiles.slice();
  next[index] = { owner, level: owner ? level : 0 };
  return next;
}

/**
 * Strategic value (for the bot) of the board changing from `before` to `after`:
 * our potential gain plus weighted potential loss of every active opponent.
 */
export function strategicDelta(ctx: BotContext, before: TileState[], after: TileState[], denialWeight?: number): number {
  const w = denialWeight ?? ctx.profile.denialWeight;
  const mine = monopolyPotential(ctx.map, after, ctx.me.id) - monopolyPotential(ctx.map, before, ctx.me.id);
  if (mine >= WIN_VALUE / 2) return mine;
  let denial = 0;
  for (const o of ctx.opponents) {
    denial += monopolyPotential(ctx.map, before, o.id) - monopolyPotential(ctx.map, after, o.id);
  }
  return mine + w * denial;
}

/** Strategic value of the bot gaining `tile` (from bank or from its current owner) at `level`. */
export function gainValue(ctx: BotContext, tile: number, level: number): number {
  const before = ctx.state.tiles;
  return strategicDelta(ctx, before, withTile(before, tile, ctx.me.id, level));
}

/** Would owning `tile` (at its current level) make the bot win right away? */
export function winsByOwning(ctx: BotContext, tile: number): boolean {
  const t = ctx.state.tiles[tile];
  const after = withTile(ctx.state.tiles, tile, ctx.me.id, t?.owner ? t.level : 0);
  return checkMonopolyWin(ctx.map, after, ctx.me.id) !== null;
}

export interface OpponentThreat {
  playerId: string;
  reason: WinReason;
  missing: number[];
}

export function opponentThreats(ctx: BotContext, tiles: TileState[] = ctx.state.tiles): OpponentThreat[] {
  const out: OpponentThreat[] = [];
  for (const o of ctx.opponents) {
    for (const t of monopolyThreats(ctx.map, tiles, o.id)) out.push({ playerId: o.id, ...t });
  }
  return out;
}

/** Tiles that would hand an opponent a monopoly if they got them. */
export function threatTiles(ctx: BotContext): Set<number> {
  const set = new Set<number>();
  for (const t of opponentThreats(ctx)) t.missing.forEach((i) => set.add(i));
  return set;
}

/** Number of threats `playerId` has on the given board. */
export function threatCount(map: MapDef, tiles: TileState[], playerId: string): number {
  return monopolyThreats(map, tiles, playerId).length;
}
