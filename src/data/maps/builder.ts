import type { TileDef, TileKind } from '@/engine/types';

type TileSeed = Omit<TileDef, 'index'>;

export const city = (
  name: string,
  subtitle: string,
  group: number,
  price: number,
  icon: string,
  blurb: string,
): TileSeed => ({ kind: 'city', name, subtitle, group, price, icon, blurb });

export const tourist = (name: string, subtitle: string, price: number, icon: string, blurb: string): TileSeed => ({
  kind: 'tourist',
  name,
  subtitle,
  price,
  icon,
  blurb,
});

export const special = (kind: TileKind, name: string, icon: string, blurb: string, subtitle?: string): TileSeed => ({
  kind,
  name,
  icon,
  blurb,
  subtitle,
});

export function indexTiles(tiles: TileSeed[]): TileDef[] {
  if (tiles.length !== 32) throw new Error(`Map must have 32 tiles, got ${tiles.length}`);
  return tiles.map((t, index) => ({ ...t, index }));
}
