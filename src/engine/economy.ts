/**
 * Pure economy formulas shared by engine, AI and UI. No state mutation here.
 * Money unit: integer juta rupiah.
 */
import type { PlayerState, TileDef, TileState } from './types';

export const LEVEL_NAMES = ['Tanah', 'Rumah', 'Ruko', 'Hotel', 'Landmark'] as const;
export const LEVEL_ICONS = ['🚩', '🏠', '🏪', '🏨', '🏛️'] as const;
export const MAX_LEVEL = 4;
export const HOTEL_LEVEL = 3;
export const LANDMARK_LEVEL = 4;

/** Cost of building level i, as a multiple of the city's land price. Level 0 = buying the land. */
export const BUILD_COST_MULT = [1, 0.5, 1, 1.5, 2] as const;
/** Toll at level i, as a multiple of the city's land price. */
export const TOLL_MULT = [0.2, 0.5, 1.2, 2.4, 4] as const;
/** Tourist toll multiplier of the tile price, indexed by how many tourist tiles the owner holds. */
export const TOURIST_TOLL_MULT = [0, 0.5, 1, 2, 4, 6] as const;

export const FESTIVAL_MULT = 2;
export const ACQUIRE_MULT = 2;
export const SELL_RATIO = 0.5;
export const ISLAND_ESCAPE_FEE = 100;
export const ISLAND_MAX_TURNS = 3;
export const TAX_RATE = 0.1;
export const DISCOUNT_RATE = 0.5;
export const DEFAULT_START_CASH = 2000;
export const DEFAULT_SALARY = 200;
export const DEFAULT_MAX_ROUNDS = 25;
export const MONOPOLY_COLOR_SETS_TO_WIN = 3;
export const MAX_DOUBLES = 3;
/** Genap/Ganjil picks per player; one is earned back each time the player passes start (up to the max). */
export const PARITY_CHARGES = 3;

export function parityChargesOf(player: Pick<PlayerState, 'parityCharges'>): number {
  return player.parityCharges ?? PARITY_CHARGES;
}

const r = (n: number) => Math.round(n);

export function isProperty(def: TileDef): boolean {
  return def.kind === 'city' || def.kind === 'tourist';
}

/** Cost to build exactly `level` on a city (level 0 = land). Tourist: level 0 = price. */
export function levelCost(def: TileDef, level: number): number {
  const p = def.price ?? 0;
  if (def.kind === 'tourist') return level === 0 ? p : 0;
  return r(p * (BUILD_COST_MULT[level] ?? 0));
}

/** Sum of costs for levels (fromLevel, toLevel] — i.e. upgrading an already-built `fromLevel`. */
export function upgradeCost(def: TileDef, fromLevel: number, toLevel: number): number {
  let total = 0;
  for (let l = fromLevel + 1; l <= toLevel; l++) total += levelCost(def, l);
  return total;
}

/** Cost to buy an unowned tile straight up to `level` (land + buildings 1..level). */
export function purchaseCost(def: TileDef, level: number): number {
  return levelCost(def, 0) + upgradeCost(def, 0, level);
}

/** Total money invested in a tile at `level` (land + all buildings). */
export function investedValue(def: TileDef, level: number): number {
  return purchaseCost(def, def.kind === 'tourist' ? 0 : level);
}

export function acquirePrice(def: TileDef, level: number): number {
  return r(investedValue(def, level) * ACQUIRE_MULT);
}

export function sellValue(def: TileDef, level: number): number {
  return Math.floor(investedValue(def, level) * SELL_RATIO);
}

export function applyDiscount(cost: number, hasDiscount: boolean): number {
  return hasDiscount ? r(cost * (1 - DISCOUNT_RATE)) : cost;
}

/** Base toll of a city at a level, before festival multiplier. */
export function cityToll(def: TileDef, level: number): number {
  return r((def.price ?? 0) * (TOLL_MULT[level] ?? 0));
}

/** Toll of a tourist tile given how many tourist tiles the owner holds. */
export function touristToll(def: TileDef, ownedCount: number): number {
  const idx = Math.min(ownedCount, TOURIST_TOLL_MULT.length - 1);
  return r((def.price ?? 0) * TOURIST_TOLL_MULT[idx]);
}

/**
 * Toll payable when landing on `index`. 0 if unowned / not a property.
 */
export function tollAt(
  defs: TileDef[],
  tiles: TileState[],
  index: number,
  festivalTile: number | null,
): number {
  const def = defs[index];
  const t = tiles[index];
  if (!def || !t || !t.owner || !isProperty(def)) return 0;
  let toll = 0;
  if (def.kind === 'city') toll = cityToll(def, t.level);
  else {
    const owned = defs.filter((d, i) => d.kind === 'tourist' && tiles[i]?.owner === t.owner).length;
    toll = touristToll(def, owned);
  }
  if (festivalTile === index) toll *= FESTIVAL_MULT;
  return r(toll);
}

/**
 * Highest level a player may build to on a city this visit.
 *  - before the first lap (laps === 0): up to Rumah (1)
 *  - afterwards: up to Hotel (3)
 *  - Landmark (4) only when the tile ALREADY had a hotel at the start of this visit
 * `currentLevel` is -1 for an unowned tile (purchase).
 */
export function buildCap(laps: number, currentLevel: number): number {
  if (currentLevel >= HOTEL_LEVEL) return LANDMARK_LEVEL;
  return laps >= 1 ? HOTEL_LEVEL : 1;
}

/** Total property value (invested) of a player. */
export function propertyValue(defs: TileDef[], tiles: TileState[], playerId: string): number {
  let v = 0;
  tiles.forEach((t, i) => {
    if (t.owner === playerId) v += investedValue(defs[i], t.level);
  });
  return v;
}

/** Cash + property value. Used for ranking and round-limit wins. */
export function totalAssets(defs: TileDef[], tiles: TileState[], player: PlayerState): number {
  if (player.bankrupt) return 0;
  return player.cash + propertyValue(defs, tiles, player.id);
}

/** Money a player could raise by selling everything they own. */
export function liquidationValue(defs: TileDef[], tiles: TileState[], playerId: string): number {
  let v = 0;
  tiles.forEach((t, i) => {
    if (t.owner === playerId) v += sellValue(defs[i], t.level);
  });
  return v;
}

export function taxFor(defs: TileDef[], tiles: TileState[], playerId: string): number {
  return r(propertyValue(defs, tiles, playerId) * TAX_RATE);
}
