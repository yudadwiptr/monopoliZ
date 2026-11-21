import {
  FESTIVAL_MULT,
  LEVEL_ICONS,
  LEVEL_NAMES,
  investedValue,
  isProperty,
  levelCost,
} from '@/engine/economy';
import { tollAtState } from '@/engine/selectors';
import { forwardDistance } from '@/data/layout';
import { formatRp } from '@/lib/format';
import type { ChooseTilePurpose, GameState, MapDef, PlayerState } from '@/engine/types';

export type ChipTone = 'gold' | 'daun' | 'merah' | 'brand' | 'muted';

export interface ChipInfo {
  /** The one key number / fact for this candidate */
  label: string;
  tone: ChipTone;
  /** Owner to show as a tiny avatar (opponent-owned tiles) */
  ownerId?: string | null;
}

export interface PurposeCopy {
  emoji: string;
  title: string;
  hint: string;
}

export const PURPOSE_COPY: Record<ChooseTilePurpose, PurposeCopy> = {
  airport: {
    emoji: '✈️',
    title: 'Mau terbang ke mana?',
    hint: 'Ketuk petak yang menyala di papan atau pilih dari daftar. Lewat Start tetap gajian!',
  },
  festival: {
    emoji: '🎆',
    title: 'Pilih properti tuan rumah Pesta (sewa 2x)',
    hint: 'Cuma ada satu pesta di papan — kalau sudah ada, pestanya pindah ke sini.',
  },
  start_upgrade: {
    emoji: '🏁',
    title: 'Bonus Start: pilih kota untuk di-upgrade (bayar biaya)',
    hint: 'Naik 1 level, bayar biaya level berikutnya.',
  },
  card_upgrade: {
    emoji: '🏗️',
    title: 'Upgrade gratis! Pilih kotamu',
    hint: 'Naik 1 level tanpa keluar duit sepeser pun.',
  },
  card_festival: {
    emoji: '🎆',
    title: 'Pindahkan festival ke propertimu',
    hint: 'Sewa properti tuan rumah jadi 2× lipat.',
  },
  force_sale: {
    emoji: '🚜',
    title: 'Pilih properti lawan untuk digusur',
    hint: 'Properti balik ke bank, pemiliknya cuma dapat ganti rugi setengah harga.',
  },
};

const SPECIAL_LABEL: Partial<Record<string, ChipInfo>> = {
  start: { label: 'Gajian + upgrade', tone: 'daun' },
  chance: { label: 'Kartu Rezeki', tone: 'brand' },
  tax: { label: 'Bayar pajak', tone: 'merah' },
  island: { label: 'Terdampar!', tone: 'merah' },
  festival: { label: 'Pilih pesta', tone: 'gold' },
  airport: { label: 'Bandara', tone: 'muted' },
};

export function chipInfo(game: GameState, map: MapDef, me: PlayerState, purpose: ChooseTilePurpose, tile: number): ChipInfo {
  const def = map.tiles[tile];
  const st = game.tiles[tile];
  const level = st?.level ?? 0;
  switch (purpose) {
    case 'airport': {
      if (!isProperty(def)) return SPECIAL_LABEL[def.kind] ?? { label: '', tone: 'muted' };
      if (!st?.owner) return { label: `Beli ${formatRp(def.price ?? 0)}`, tone: 'brand' };
      if (st.owner === me.id) return { label: 'Punyamu', tone: 'daun' };
      return { label: `Sewa ${formatRp(tollAtState(game, tile))}`, tone: 'merah', ownerId: st.owner };
    }
    case 'festival':
    case 'card_festival': {
      if (game.festivalTile === tile) return { label: '🎆 Lokasi pesta', tone: 'gold' };
      const base = tollAtState(game, tile);
      return { label: `Sewa ${formatRp(base, { short: true })} → ${formatRp(base * FESTIVAL_MULT, { short: true })}`, tone: 'gold' };
    }
    case 'start_upgrade': {
      const next = Math.min(level + 1, LEVEL_NAMES.length - 1);
      return { label: `${LEVEL_ICONS[next]} ${LEVEL_NAMES[next]} · ${formatRp(levelCost(def, next))}`, tone: 'gold' };
    }
    case 'card_upgrade': {
      const next = Math.min(level + 1, LEVEL_NAMES.length - 1);
      return { label: `${LEVEL_ICONS[next]} ${LEVEL_NAMES[next]} gratis`, tone: 'daun' };
    }
    case 'force_sale':
      return {
        label: `${LEVEL_ICONS[level]} ${def.kind === 'city' ? LEVEL_NAMES[level] : 'Wisata'} · ${formatRp(investedValue(def, level), { short: true })}`,
        tone: 'merah',
        ownerId: st?.owner,
      };
  }
}

/** Most useful order per purpose: nearest first for flights, strongest first for the rest. */
export function sortCandidates(game: GameState, map: MapDef, me: PlayerState, purpose: ChooseTilePurpose, tiles: number[]): number[] {
  const list = [...tiles];
  switch (purpose) {
    case 'airport':
      return list.sort((a, b) => forwardDistance(me.position, a) - forwardDistance(me.position, b));
    case 'festival':
    case 'card_festival':
      return list.sort((a, b) => tollAtState(game, b) - tollAtState(game, a));
    case 'force_sale':
      return list.sort(
        (a, b) =>
          investedValue(map.tiles[b], game.tiles[b]?.level ?? 0) - investedValue(map.tiles[a], game.tiles[a]?.level ?? 0),
      );
    default:
      return list.sort((a, b) => a - b);
  }
}
