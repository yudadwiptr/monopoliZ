import { KEEP_CARD_INFO } from '@/data/cards';
import { formatRp } from '@/lib/format';
import type { CardDef, MapDef, TileDef, TileKind, TransferReason } from '@/engine/types';

export const TOURIST_COLOR = '#22D3C5';
export const BRAND_COLOR = '#3A8CD6';
export const GOLD_COLOR = '#FFC21F';
export const MERAH_COLOR = '#FF3B5C';
export const DAUN_COLOR = '#2EE59D';

const KIND_LABEL: Record<TileKind, string> = {
  start: 'Start',
  island: 'Terdampar',
  festival: 'Pesta',
  airport: 'Bandara',
  city: 'Kota',
  tourist: 'Destinasi Wisata',
  chance: 'Kartu Rezeki',
  tax: 'Pajak',
};

const KIND_COLOR: Partial<Record<TileKind, string>> = {
  start: DAUN_COLOR,
  island: MERAH_COLOR,
  festival: GOLD_COLOR,
  airport: BRAND_COLOR,
  chance: '#B36BFF',
  tax: '#FF7A59',
};

/** The colour a tile is identified by everywhere in the dialogs (group band, chip bar, row stripe). */
export function tileColor(map: MapDef, def: TileDef): string {
  if (def.kind === 'city') return map.groups.find((g) => g.id === def.group)?.color ?? BRAND_COLOR;
  if (def.kind === 'tourist') return TOURIST_COLOR;
  return KIND_COLOR[def.kind] ?? BRAND_COLOR;
}

/** Small caps label above the tile name: group name for cities, kind for the rest. */
export function tileGroupLabel(map: MapDef, def: TileDef): string {
  if (def.kind === 'city') return map.groups.find((g) => g.id === def.group)?.name ?? 'Kota';
  return KIND_LABEL[def.kind];
}

export function kindLabel(kind: TileKind): string {
  return KIND_LABEL[kind];
}

export function findTileOfKind(map: MapDef, kind: TileKind): TileDef | undefined {
  return map.tiles.find((t) => t.kind === kind);
}

/** "untuk bayar sewa" style phrase for a debt reason. */
export const DEBT_REASON: Record<TransferReason, string> = {
  toll: 'bayar sewa',
  tax: 'bayar pajak',
  card: 'Kartu Rezeki',
  buy: 'pembelian',
  build: 'pembangunan',
  acquire: 'akuisisi',
  island_fee: 'ongkos kabur',
  salary: 'tagihan',
  sell: 'tagihan',
  force_sale: 'tagihan',
  bankrupt: 'tagihan',
};

export type Tone = 'good' | 'bad' | 'neutral';

export const TONE_COLOR: Record<Tone, string> = {
  good: DAUN_COLOR,
  bad: MERAH_COLOR,
  neutral: BRAND_COLOR,
};

export const TONE_TAG: Record<Tone, string> = {
  good: 'Cuan!',
  bad: 'Apes!',
  neutral: 'Plot twist',
};

/** Short, concrete one-liner of what a card does — shown as a chip under the card text. */
export function cardEffectSummary(card: CardDef, map: MapDef): string {
  const e = card.effect;
  switch (e.type) {
    case 'gain':
      return `+${formatRp(e.amount)}`;
    case 'pay':
      return `-${formatRp(e.amount)}`;
    case 'pay_percent_cash':
      return `-${e.percent}% uang tunai`;
    case 'collect_each':
      return `+${formatRp(e.amount)} dari tiap pemain`;
    case 'pay_each':
      return `-${formatRp(e.amount)} ke tiap pemain`;
    case 'move_to': {
      if (e.target === 'nearest_tourist') return '➜ Wisata terdekat';
      const t = findTileOfKind(map, e.target);
      return `➜ ${t?.icon ?? ''} ${t?.name ?? KIND_LABEL[e.target]}`.trim();
    }
    case 'move_by':
      return e.steps >= 0 ? `Maju ${e.steps} petak` : `Mundur ${Math.abs(e.steps)} petak`;
    case 'keep':
      return `Disimpan: ${KEEP_CARD_INFO[e.card].emoji} ${KEEP_CARD_INFO[e.card].name}`;
    case 'upgrade_free':
      return 'Upgrade gratis +1 level';
    case 'downgrade_own':
      return 'Bangunan turun 1 level';
    case 'pay_per_building':
      return `-${formatRp(e.amount)} × level bangunan`;
    case 'festival_move':
      return 'Pindahkan festival';
    case 'force_sale':
      return 'Gusur 1 properti lawan';
  }
}
