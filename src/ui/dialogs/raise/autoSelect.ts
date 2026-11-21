import { LANDMARK_LEVEL, cityToll, investedValue, sellValue } from '@/engine/economy';
import { groupTiles, touristTiles } from '@/engine/selectors';
import type { GameState, MapDef } from '@/engine/types';

/**
 * How much a property matters to its owner beyond its sale price. Lower = sell first.
 * Rewards toll power, complete / almost-complete colour groups, tourist sets, landmarks and the festival.
 */
export function strategicScore(game: GameState, map: MapDef, playerId: string, tile: number): number {
  const def = map.tiles[tile];
  const level = game.tiles[tile]?.level ?? 0;
  const owns = (i: number) => game.tiles[i]?.owner === playerId;
  let score = investedValue(def, level);
  if (def.kind === 'city') {
    score += cityToll(def, level) * 2;
    const group = def.group === undefined ? [] : groupTiles(map, def.group);
    const owned = group.filter(owns).length;
    if (group.length > 0 && owned === group.length) score += 400;
    else if (group.length > 1 && owned === group.length - 1) score += 150;
    if (level >= LANDMARK_LEVEL) score += 300;
  } else if (def.kind === 'tourist') {
    score += touristTiles(map).filter(owns).length * 120;
  }
  if (game.festivalTile === tile) score += 150;
  return score;
}

/**
 * Greedy "cheap covering set": take the least strategic tiles until the shortfall is covered,
 * then drop any pick (most strategic first) that is not actually needed.
 */
export function autoSelect(game: GameState, map: MapDef, playerId: string, tiles: number[], needed: number): number[] {
  if (needed <= 0) return [];
  const items = tiles
    .map((t) => ({
      t,
      v: sellValue(map.tiles[t], game.tiles[t]?.level ?? 0),
      s: strategicScore(game, map, playerId, t),
    }))
    .sort((a, b) => a.s - b.s || b.v - a.v);

  const picked: typeof items = [];
  let sum = 0;
  for (const it of items) {
    if (sum >= needed) break;
    picked.push(it);
    sum += it.v;
  }
  for (const it of [...picked].sort((a, b) => b.s - a.s)) {
    if (sum - it.v >= needed) {
      picked.splice(picked.indexOf(it), 1);
      sum -= it.v;
    }
  }
  return picked.map((p) => p.t);
}
