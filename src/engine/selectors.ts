/**
 * Read-only helpers over GameState. Shared by engine, AI and UI.
 */
import { getMap } from '@/data/maps';
import { sideTiles } from '@/data/layout';
import {
  MONOPOLY_COLOR_SETS_TO_WIN,
  isProperty,
  propertyValue,
  tollAt,
  totalAssets,
} from './economy';
import type { GameState, MapDef, PlayerState, TileDef, TileState, WinReason } from './types';

export function mapOf(state: GameState): MapDef {
  return getMap(state.mapId);
}

export function defsOf(state: GameState): TileDef[] {
  return mapOf(state).tiles;
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.current];
}

export function playerById(state: GameState, id: string | null | undefined): PlayerState | undefined {
  if (!id) return undefined;
  return state.players.find((p) => p.id === id);
}

export function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => !p.bankrupt);
}

export function propertiesOf(state: GameState, playerId: string): number[] {
  const out: number[] = [];
  state.tiles.forEach((t, i) => {
    if (t.owner === playerId) out.push(i);
  });
  return out;
}

export function tollAtState(state: GameState, index: number): number {
  return tollAt(defsOf(state), state.tiles, index, state.festivalTile);
}

export function assetsOf(state: GameState, playerId: string): number {
  const p = playerById(state, playerId);
  return p ? totalAssets(defsOf(state), state.tiles, p) : 0;
}

export function propertyValueOf(state: GameState, playerId: string): number {
  return propertyValue(defsOf(state), state.tiles, playerId);
}

/** Players sorted by total assets (bankrupt last). */
export function ranking(state: GameState): { player: PlayerState; assets: number }[] {
  return state.players
    .map((player) => ({ player, assets: assetsOf(state, player.id) }))
    .sort((a, b) => Number(a.player.bankrupt) - Number(b.player.bankrupt) || b.assets - a.assets);
}

// ───────────────────────────── Monopoly detection ─────────────────────────────

export function groupTiles(map: MapDef, group: number): number[] {
  return map.tiles.filter((t) => t.kind === 'city' && t.group === group).map((t) => t.index);
}

export function touristTiles(map: MapDef): number[] {
  return map.tiles.filter((t) => t.kind === 'tourist').map((t) => t.index);
}

/** Purchasable tiles (city + tourist) on a board side 0..3. */
export function sidePropertyTiles(map: MapDef, side: number): number[] {
  return sideTiles(side).filter((i) => isProperty(map.tiles[i]));
}

export interface MonopolyStatus {
  wisata: { owned: number; total: number; missing: number[] };
  jalur: { side: number; owned: number; total: number; missing: number[] }[];
  warna: { completeGroups: number[]; needed: number; nearGroups: { group: number; missing: number[] }[] };
}

export function monopolyStatus(map: MapDef, tiles: TileState[], playerId: string): MonopolyStatus {
  const owns = (i: number) => tiles[i]?.owner === playerId;
  const tour = touristTiles(map);
  const wisataMissing = tour.filter((i) => !owns(i));
  const jalur = [0, 1, 2, 3].map((side) => {
    const st = sidePropertyTiles(map, side);
    const missing = st.filter((i) => !owns(i));
    return { side, owned: st.length - missing.length, total: st.length, missing };
  });
  const completeGroups: number[] = [];
  const nearGroups: { group: number; missing: number[] }[] = [];
  map.groups.forEach((g) => {
    const gt = groupTiles(map, g.id);
    const missing = gt.filter((i) => !owns(i));
    if (missing.length === 0) completeGroups.push(g.id);
    else if (missing.length === 1) nearGroups.push({ group: g.id, missing });
  });
  return {
    wisata: { owned: tour.length - wisataMissing.length, total: tour.length, missing: wisataMissing },
    jalur,
    warna: { completeGroups, needed: MONOPOLY_COLOR_SETS_TO_WIN, nearGroups },
  };
}

/** Returns the monopoly win reason for this player, or null. */
export function checkMonopolyWin(map: MapDef, tiles: TileState[], playerId: string): WinReason | null {
  const s = monopolyStatus(map, tiles, playerId);
  if (s.wisata.total > 0 && s.wisata.missing.length === 0) return 'monopoli_wisata';
  if (s.jalur.some((j) => j.total > 0 && j.missing.length === 0)) return 'monopoli_jalur';
  if (s.warna.completeGroups.length >= s.warna.needed) return 'monopoli_warna';
  return null;
}

/**
 * Monopolies this player is exactly ONE tile away from. Used for "awas monopoli!" alerts and AI.
 * `missing` lists the tile(s) that would complete it.
 */
export function monopolyThreats(
  map: MapDef,
  tiles: TileState[],
  playerId: string,
): { reason: WinReason; missing: number[] }[] {
  const s = monopolyStatus(map, tiles, playerId);
  const out: { reason: WinReason; missing: number[] }[] = [];
  if (s.wisata.missing.length === 1) out.push({ reason: 'monopoli_wisata', missing: s.wisata.missing });
  s.jalur.forEach((j) => {
    if (j.missing.length === 1) out.push({ reason: 'monopoli_jalur', missing: j.missing });
  });
  if (s.warna.completeGroups.length === s.warna.needed - 1 && s.warna.nearGroups.length > 0) {
    out.push({ reason: 'monopoli_warna', missing: Array.from(new Set(s.warna.nearGroups.flatMap((g) => g.missing))) });
  }
  return out;
}

export const WIN_REASON_LABEL: Record<WinReason, string> = {
  bangkrut: 'Semua lawan bangkrut',
  monopoli_wisata: 'Monopoli Wisata',
  monopoli_jalur: 'Monopoli Jalur',
  monopoli_warna: 'Monopoli Triple Warna',
  batas_ronde: 'Terkaya saat ronde habis',
};
